import { randomInt } from "node:crypto";
import { clientDeliveryAddresses, clients, equipment, inspectionResults, inspections, lots } from "../../src/lib/db/schema";
import { generateEquipmentKey } from "../../src/lib/domain/equipment";
import { PARAMETERS } from "../../src/lib/domain/parameters";
import { testDb, TEST_USERS } from "../../src/test/int/db";

/**
 * Preconditions ("Precondición" column of the PI-/PS- guide) written straight to the e2e
 * database, so each spec only drives the screens it is about. The client goes through the
 * same guard as the integration suite. Every value is synthetic.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";

/** Random suffix so specs never collide, also on a CI retry against the same database. */
export function uniqueSuffix(length = 4) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** Shape of an RFC only (BR-CLI-01). `PRU` plus a fixed date plus three random letters. */
export function fakeRfc() {
  return `PRU260101${uniqueSuffix(3)}`;
}

export async function insertClient() {
  const suffix = uniqueSuffix();
  const [client] = await testDb
    .insert(clients)
    .values({
      sapKey: `PE${suffix}`,
      businessName: `Panificadora de Prueba ${suffix}`,
      rfc: fakeRfc(),
      fiscalAddress: "Calle Ficticia 10, Ciudad de Prueba",
      contactName: "Contacto de Prueba",
      contactEmail: `compras-${suffix.toLowerCase()}@prueba.test`,
      requiresCertificate: true,
      createdBy: TEST_USERS.transaction.id,
    })
    .returning();
  await testDb
    .insert(clientDeliveryAddresses)
    .values({ clientId: client.id, address: `Bodega Ficticia ${suffix}, Ciudad de Prueba`, position: 0 });
  return client;
}

/** One usable alveograph and one usable farinograph (BR-EQP-03). */
export async function insertEquipmentPair() {
  const alveograph = generateEquipmentKey();
  const farinograph = generateEquipmentKey();
  await testDb.insert(equipment).values([
    { id: alveograph, type: "alveograph", shortDescription: `Alveografo de prueba ${alveograph}`, createdBy: TEST_USERS.transaction.id },
    { id: farinograph, type: "farinograph", shortDescription: `Farinografo de prueba ${farinograph}`, createdBy: TEST_USERS.transaction.id },
  ]);
  return { alveograph, farinograph };
}

/** Values inside the synthetic international limits, one per parameter. */
export const COMPLETE_VALUES: Record<string, number> = {
  ALV_P: 75,
  ALV_L: 100,
  ALV_W: 300,
  ALV_PL: 0.75,
  ALV_IE: 50,
  FAR_ABS: 60,
  FAR_DEV: 4,
  FAR_STA: 10,
  FAR_SOF: 50,
  FAR_ARR: 2,
};

/** A lot whose inspection A is complete, ready for UC-05. */
export async function insertInspectedLot() {
  const machines = await insertEquipmentPair();
  const id = `L-E2E-${uniqueSuffix(6)}`;
  await testDb.insert(lots).values({
    id,
    product: "Harina de prueba",
    producedOn: "2026-01-10",
    expiresOn: "2026-12-31",
    createdBy: TEST_USERS.transaction.id,
  });
  const [inspection] = await testDb
    .insert(inspections)
    .values({ lotId: id, sequence: "A", createdBy: TEST_USERS.transaction.id })
    .returning();
  await testDb.insert(inspectionResults).values(
    PARAMETERS.map((p) => ({
      inspectionId: inspection.id,
      parameterCode: p.code,
      equipmentId: p.equipmentType === "alveograph" ? machines.alveograph : machines.farinograph,
      value: COMPLETE_VALUES[p.code],
    })),
  );
  return { lotId: id, inspectionId: inspection.id };
}
