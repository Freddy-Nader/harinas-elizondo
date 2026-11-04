"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { auditLog, clients, clientLimits, parameters } from "@/lib/db/schema";
import { clientInputSchema, limitInputSchema, optionalText } from "@/lib/domain/client-validation";

/** RF-01 · RF-08 · BR-AUD-01: authorization cannot rely on hidden buttons. */
async function requireTransactionUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  if (session.user.role !== "transaction") throw new Error("Acceso restringido.");
  return session.user;
}

function readClient(form: FormData) {
  return clientInputSchema.safeParse({
    sapKey: String(form.get("sapKey") ?? "").trim(),
    businessName: String(form.get("businessName") ?? "").trim(),
    rfc: String(form.get("rfc") ?? "").trim(),
    deliveryAddress: String(form.get("deliveryAddress") ?? "").trim(),
    contactName: String(form.get("contactName") ?? "").trim(),
    contactEmail: String(form.get("contactEmail") ?? "").trim(),
    requiresCertificate: form.get("requiresCertificate") === "on",
  });
}

function validationError(message: string): never {
  redirect("/clientes?error=" + encodeURIComponent(message));
}

async function logChange(
  user: { id: string; name: string; employeeId?: string | null },
  action: string, clientId: string, detail?: Record<string, unknown>,
) {
  await getDb().insert(auditLog).values({
    userId: user.id, userName: user.name, employeeId: user.employeeId ?? null,
    action, entity: "clients", entityId: clientId, detail: detail ?? null,
  });
}

/** RF-03 · UC-02 · BR-CLI-01/02: create or update with DB-enforced unique SAP key. */
export async function saveClient(form: FormData) {
  const user = await requireTransactionUser();
  const parsed = readClient(form);
  if (!parsed.success) validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const input = parsed.data;
  const id = String(form.get("id") ?? "");
  const db = getDb();
  const values = {
    sapKey: input.sapKey, businessName: input.businessName,
    rfc: optionalText(input.rfc), deliveryAddress: optionalText(input.deliveryAddress),
    contactName: optionalText(input.contactName), contactEmail: optionalText(input.contactEmail),
    requiresCertificate: input.requiresCertificate,
  };
  if (id) {
    const [updated] = await db.update(clients).set(values).where(eq(clients.id, id)).returning({ id: clients.id });
    if (!updated) validationError("No se encontró el cliente.");
    await logChange(user, "update", id, { sapKey: input.sapKey });
  } else {
    const [created] = await db.insert(clients).values({ ...values, createdBy: user.id })
      .onConflictDoNothing({ target: clients.sapKey }).returning({ id: clients.id });
    if (!created) validationError("Ya existe un cliente con esa clave SAP.");
    await logChange(user, "create", created.id, { sapKey: input.sapKey });
  }
  revalidatePath("/clientes");
  redirect("/clientes");
}

/** RF-03 · UC-02 · BR-CLI-03: change status, never physically delete a client. */
export async function changeClientStatus(form: FormData) {
  const user = await requireTransactionUser();
  const id = String(form.get("id") ?? "");
  const status = form.get("status") === "inactive" ? "inactive" : "active";
  const reason = String(form.get("reason") ?? "").trim();
  if (status === "inactive" && !reason) validationError("Escribe el motivo de inactivación.");
  if (reason.length > 200) validationError("El motivo es demasiado largo.");
  const [updated] = await getDb().update(clients)
    .set({ status, statusReason: status === "inactive" ? reason : null })
    .where(eq(clients.id, id)).returning({ id: clients.id });
  if (!updated) validationError("No se encontró el cliente.");
  await logChange(user, status === "inactive" ? "deactivate" : "reactivate", id, { reason });
  revalidatePath("/clientes");
  redirect("/clientes");
}

/** RF-03 · BR-REF-01: one optional pair of limits per client and parameter. */
export async function saveClientLimit(form: FormData) {
  const user = await requireTransactionUser();
  const clientId = String(form.get("clientId") ?? "");
  const lower = String(form.get("lowerLimit") ?? "").trim();
  const upper = String(form.get("upperLimit") ?? "").trim();
  if (!lower || !upper) validationError("Captura ambos límites.");
  const parsed = limitInputSchema.safeParse({
    parameterCode: String(form.get("parameterCode") ?? ""),
    lowerLimit: Number(lower), upperLimit: Number(upper),
  });
  if (!parsed.success) validationError(parsed.error.issues[0]?.message ?? "Límites inválidos.");
  const db = getDb();
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId));
  const [parameter] = await db.select({ code: parameters.code }).from(parameters)
    .where(eq(parameters.code, parsed.data.parameterCode));
  if (!client || !parameter) validationError("Cliente o parámetro inexistente.");
  const { parameterCode, lowerLimit, upperLimit } = parsed.data;
  await db.insert(clientLimits).values({
    clientId, parameterCode, lowerLimit, upperLimit, updatedBy: user.id,
  }).onConflictDoUpdate({
    target: [clientLimits.clientId, clientLimits.parameterCode],
    set: { lowerLimit, upperLimit, updatedBy: user.id, updatedAt: new Date() },
  });
  await logChange(user, "update_limit", clientId, { parameterCode, lowerLimit, upperLimit });
  revalidatePath("/clientes");
  redirect("/clientes?editar=" + encodeURIComponent(clientId));
}

export async function removeClientLimit(form: FormData) {
  const user = await requireTransactionUser();
  const clientId = String(form.get("clientId") ?? "");
  const parameterCode = String(form.get("parameterCode") ?? "");
  const db = getDb();
  await db.delete(clientLimits).where(
    // Composite key ensures no other client's range is removed.
    (await import("drizzle-orm")).and(
      eq(clientLimits.clientId, clientId), eq(clientLimits.parameterCode, parameterCode),
    ),
  );
  await logChange(user, "remove_limit", clientId, { parameterCode });
  revalidatePath("/clientes");
  redirect("/clientes?editar=" + encodeURIComponent(clientId));
}
