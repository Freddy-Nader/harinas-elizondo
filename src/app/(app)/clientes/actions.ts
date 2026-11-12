"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { pgError } from "@/lib/action-state";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { auditLog, clients, clientDeliveryAddresses, clientLimits, internationalLimits, parameters } from "@/lib/db/schema";
import { clientInputSchema, limitInputSchema, isWithinInternational, optionalText } from "@/lib/domain/client-validation";

/** RF-01 · RF-08 · BR-AUD-01: authorization cannot rely on hidden buttons. */
async function requireTransactionUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user || session.user.active === false) redirect("/login");
  if (session.user.role !== "transaction") throw new Error("Acceso restringido.");
  return session.user;
}

function readClient(form: FormData) {
  return clientInputSchema.safeParse({
    sapKey: String(form.get("sapKey") ?? "").trim(),
    businessName: String(form.get("businessName") ?? "").trim(),
    rfc: String(form.get("rfc") ?? "").trim(),
    fiscalAddress: String(form.get("fiscalAddress") ?? "").trim(),
    deliveryAddresses: form.getAll("deliveryAddresses").map((value) => String(value).trim()),
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
    rfc: optionalText(input.rfc), fiscalAddress: input.fiscalAddress,
    deliveryAddress: input.deliveryAddresses[0],
    contactName: optionalText(input.contactName), contactEmail: optionalText(input.contactEmail),
    requiresCertificate: input.requiresCertificate,
  };
  const clientId = id || randomUUID();
  if (id) {
    const [existing] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id));
    if (!existing) validationError("No se encontró el cliente.");
  }
  // RF-03: friendly preflight messages; database constraints also protect concurrent saves.
  const [sameRfc] = await db.select({ id: clients.id }).from(clients)
    .where(id ? and(eq(clients.rfc, input.rfc), ne(clients.id, id)) : eq(clients.rfc, input.rfc)).limit(1);
  if (sameRfc) validationError("El RFC ya pertenece a otro cliente. Revisa los datos existentes.");
  const [sameSapKey] = await db.select({ id: clients.id }).from(clients)
    .where(id ? and(eq(clients.sapKey, input.sapKey), ne(clients.id, id)) : eq(clients.sapKey, input.sapKey)).limit(1);
  if (sameSapKey) validationError("La clave SAP ya pertenece a otro cliente. Usa una clave diferente.");
  // RF-03 / BR-AUD-01: client, destinations and audit commit together.
  const destinations = input.deliveryAddresses.map((address, position) => ({ clientId, address, position }));
  try {
    await db.batch([
      id ? db.update(clients).set(values).where(eq(clients.id, id))
        : db.insert(clients).values({ id: clientId, ...values, createdBy: user.id }),
      db.delete(clientDeliveryAddresses).where(eq(clientDeliveryAddresses.clientId, clientId)),
      db.insert(clientDeliveryAddresses).values(destinations),
      db.insert(auditLog).values({
        userId: user.id, userName: user.name, employeeId: user.employeeId ?? null,
        action: id ? "update" : "create", entity: "clients", entityId: clientId,
        detail: { sapKey: input.sapKey, deliveryAddressCount: destinations.length },
      }),
    ]);
  } catch (error) {
    const conflict = pgError(error);
    if (conflict.code === "23505") {
      if (conflict.constraint === "clients_rfc_unique") {
        validationError("El RFC ya pertenece a otro cliente. Revisa los datos existentes.");
      }
      if (conflict.constraint === "clients_sap_key_unique") {
        validationError("La clave SAP ya pertenece a otro cliente. Usa una clave diferente.");
      }
      validationError("Ya existe un cliente con esa clave SAP o RFC.");
    }
    throw error;
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
  const [reference] = await db.select().from(internationalLimits)
    .where(eq(internationalLimits.parameterCode, parsed.data.parameterCode));
  if (!reference) validationError("Primero configura la referencia internacional de este parámetro.");
  if (!isWithinInternational(parsed.data, reference)) {
    validationError("Los límites particulares deben estar dentro del rango internacional; no pueden ser menos exigentes.");
  }
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
    and(eq(clientLimits.clientId, clientId), eq(clientLimits.parameterCode, parameterCode)),
  );
  await logChange(user, "remove_limit", clientId, { parameterCode });
  revalidatePath("/clientes");
  redirect("/clientes?editar=" + encodeURIComponent(clientId));
}
