import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import type { z } from "zod";
import { pgError } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { auditLog, clients, clientDeliveryAddresses } from "@/lib/db/schema";
import { optionalText, type clientInputSchema } from "@/lib/domain/client-validation";
import { failure, ok, type Result } from "@/lib/api/result";
import type { SessionUser } from "@/lib/session";

const RFC_TAKEN = "El RFC ya pertenece a otro cliente. Revisa los datos existentes.";
const SAP_TAKEN = "La clave SAP ya pertenece a otro cliente. Usa una clave diferente.";

export type ClientInput = z.infer<typeof clientInputSchema> & { id?: string };

/** RF-03 · UC-02 · BR-CLI-01/02: create or update with DB-enforced unique SAP key. */
export async function saveClient(actor: SessionUser, input: ClientInput): Promise<Result<{ id: string }>> {
  const { id } = input;
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
    if (!existing) return failure("not_found", "No se encontró el cliente.");
  }
  // RF-03: friendly preflight messages; database constraints also protect concurrent saves.
  const [sameRfc] = await db.select({ id: clients.id }).from(clients)
    .where(id ? and(eq(clients.rfc, input.rfc), ne(clients.id, id)) : eq(clients.rfc, input.rfc)).limit(1);
  if (sameRfc) return failure("conflict", RFC_TAKEN);
  const [sameSapKey] = await db.select({ id: clients.id }).from(clients)
    .where(id ? and(eq(clients.sapKey, input.sapKey), ne(clients.id, id)) : eq(clients.sapKey, input.sapKey)).limit(1);
  if (sameSapKey) return failure("conflict", SAP_TAKEN);
  // RF-03 / BR-AUD-01: client, destinations and audit commit together.
  const destinations = input.deliveryAddresses.map((address, position) => ({ clientId, address, position }));
  try {
    await db.batch([
      id ? db.update(clients).set(values).where(eq(clients.id, id))
        : db.insert(clients).values({ id: clientId, ...values, createdBy: actor.id }),
      db.delete(clientDeliveryAddresses).where(eq(clientDeliveryAddresses.clientId, clientId)),
      db.insert(clientDeliveryAddresses).values(destinations),
      db.insert(auditLog).values({
        userId: actor.id, userName: actor.name, employeeId: actor.employeeId ?? null,
        action: id ? "update" : "create", entity: "clients", entityId: clientId,
        detail: { sapKey: input.sapKey, deliveryAddressCount: destinations.length },
      }),
    ]);
  } catch (error) {
    const conflict = pgError(error);
    if (conflict.code === "23505") {
      if (conflict.constraint === "clients_rfc_unique") return failure("conflict", RFC_TAKEN);
      if (conflict.constraint === "clients_sap_key_unique") return failure("conflict", SAP_TAKEN);
      return failure("conflict", "Ya existe un cliente con esa clave SAP o RFC.");
    }
    throw error;
  }
  return ok({ id: clientId }, id ? "Cliente actualizado." : "Cliente registrado.");
}

/** RF-03 · UC-02: no hard deletes, so inactive clients are in the directory too. */
export async function listClients() {
  const rows = await getDb().select().from(clients).orderBy(asc(clients.businessName));
  return ok(rows, `Directorio de clientes (${rows.length})`);
}
