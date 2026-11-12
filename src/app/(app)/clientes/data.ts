import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, clientDeliveryAddresses, clientLimits, internationalLimits, parameters } from "@/lib/db/schema";

/** RF-03 · UC-02: no hard deletes, including inactive clients in the directory. */
export function listClients() {
  return getDb().select().from(clients).orderBy(asc(clients.businessName));
}

export function listClientLimits(clientId: string) {
  return getDb().select().from(clientLimits).where(eq(clientLimits.clientId, clientId));
}

export function listInternationalLimits() {
  return getDb().select().from(internationalLimits);
}

export function listParameters() {
  return getDb().select().from(parameters).orderBy(asc(parameters.code));
}

/** UC-02: destinations are independent records, ordered for editing. */
export function listDeliveryAddresses(clientId: string) {
  return getDb().select().from(clientDeliveryAddresses)
    .where(eq(clientDeliveryAddresses.clientId, clientId)).orderBy(asc(clientDeliveryAddresses.position));
}
