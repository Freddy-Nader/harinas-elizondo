import { equipment, lots } from "@/lib/db/schema";
import { PARAMETERS } from "@/lib/domain/parameters";
import { testDb, TEST_USERS } from "./db";

/** Synthetic data builders for the integration suite. Nothing here describes a real person or company. */

export const initialState = { ok: false };

/** Runs an action that ends in `redirect()` and returns the path it redirected to. */
export async function redirectOf(action: Promise<unknown>): Promise<string> {
  try {
    await action;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("REDIRECT:")) return message.slice("REDIRECT:".length);
    throw error;
  }
  throw new Error("The action did not redirect.");
}

export function formData(fields: Record<string, string | string[]>) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) form.append(name, item);
  }
  return form;
}

/** UC-02 form of a made-up client. `TEST010101AAA` only has the shape of an RFC. */
export function clientForm(overrides: Record<string, string | string[]> = {}) {
  return formData({
    sapKey: "PC0001",
    businessName: "Panificadora de Prueba Uno",
    rfc: "TEST010101AAA",
    fiscalAddress: "Calle Ficticia 1, Ciudad de Prueba",
    deliveryAddresses: ["Bodega Ficticia 1, Ciudad de Prueba"],
    contactName: "Contacto de Prueba",
    contactEmail: "contacto@prueba.test",
    requiresCertificate: "on",
    ...overrides,
  });
}

export async function insertLot(id: string) {
  await testDb.insert(lots).values({
    id,
    product: "Harina de prueba",
    producedOn: "2026-01-10",
    expiresOn: "2026-12-31",
    createdBy: TEST_USERS.transaction.id,
  });
  return id;
}

/** One active alveograph and one active farinograph (BR-EQP-03 needs both to capture results). */
export async function insertEquipment() {
  await testDb.insert(equipment).values([
    { id: "ALVTEST1", type: "alveograph", shortDescription: "Alveografo de prueba" },
    { id: "FARTEST1", type: "farinograph", shortDescription: "Farinografo de prueba" },
  ]);
  return { alveograph: "ALVTEST1", farinograph: "FARTEST1" };
}

/** Values inside the synthetic international limits of db.ts, one per parameter. */
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

/** UC-04 results form. Pass a subset of codes to leave the inspection incomplete. */
export function resultsForm(
  machines: { alveograph: string; farinograph: string },
  values: Record<string, number> = COMPLETE_VALUES,
) {
  return formData({
    equipment_alveograph: machines.alveograph,
    equipment_farinograph: machines.farinograph,
    ...Object.fromEntries(PARAMETERS.map((p) => [`value_${p.code}`, values[p.code]?.toString() ?? ""])),
  });
}
