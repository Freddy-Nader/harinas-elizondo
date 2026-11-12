import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { equipment, internationalLimits } from "@/lib/db/schema";
import { equipmentReadiness } from "@/lib/domain/equipment";
import type { EquipmentType } from "@/lib/domain/parameters";
import type { LimitsByParameter } from "@/lib/domain/quality";

/**
 * Reference data shared by several modules. Callers check the role themselves.
 */

/** RF-02 · D-07. International limits by parameter code. */
export async function getInternationalLimits(): Promise<LimitsByParameter> {
  const rows = await getDb().select().from(internationalLimits);
  return Object.fromEntries(
    rows.map((r) => [r.parameterCode, { lower: r.lowerLimit, upper: r.upperLimit }]),
  );
}

/** BR-EQP-03. Equipment of a type with whether it can be used to measure right now. */
export async function listEquipmentOfType(type: EquipmentType) {
  const [rows, limits] = await Promise.all([
    getDb()
      .select({
        id: equipment.id,
        shortDescription: equipment.shortDescription,
        status: equipment.status,
        type: equipment.type,
      })
      .from(equipment)
      .where(eq(equipment.type, type))
      .orderBy(asc(equipment.shortDescription)),
    getInternationalLimits(),
  ]);
  return rows.map((row) => ({
    ...row,
    usable: equipmentReadiness(row.type, row.status, limits).usable,
  }));
}
