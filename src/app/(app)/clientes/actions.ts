"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { getDb } from "@/lib/db";
import { auditLog, clients, clientLimits, internationalLimits, parameters } from "@/lib/db/schema";
import { clientInputSchema, limitInputSchema, isWithinInternational } from "@/lib/domain/client-validation";
import { saveClient as saveClientUseCase } from "@/lib/api/clients/use-cases";

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

/** RF-03 · UC-02 · BR-CLI-01/02: adapter over the shared use case (src/lib/api/clients). */
export async function saveClient(form: FormData) {
  const user = await requireRole();
  const parsed = readClient(form);
  if (!parsed.success) validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const result = await saveClientUseCase(user, { ...parsed.data, id: String(form.get("id") ?? "") || undefined });
  if (!result.ok) validationError(result.message);
  revalidatePath("/clientes");
  redirect("/clientes");
}

/** RF-03 · UC-02 · BR-CLI-03: change status, never physically delete a client. */
export async function changeClientStatus(form: FormData) {
  const user = await requireRole();
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
  const user = await requireRole();
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
  const user = await requireRole();
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
