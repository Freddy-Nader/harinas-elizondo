import "server-only";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLog, equipment } from "@/lib/db/schema";
import { equipmentReadiness, type EquipmentStatus } from "@/lib/domain/equipment";
import { parametersFor, type EquipmentType } from "@/lib/domain/parameters";
import { getInternationalLimits } from "@/lib/reference-data";
import { requireRole } from "@/lib/session";

/**
 * RF-02 · UC-01. Reads for the Equipos screens. Each function checks the role itself,
 * so a page that forgets the gate still cannot leak data (RF-01).
 */

export { getInternationalLimits };

/** RF-02. Active, inactive and retired equipment, each with its BR-EQP-03 readiness. */
export async function listEquipment(status?: EquipmentStatus) {
  await requireRole();
  const db = getDb();
  const [rows, limits] = await Promise.all([
    db
      .select()
      .from(equipment)
      .where(status ? eq(equipment.status, status) : undefined)
      .orderBy(asc(equipment.status), asc(equipment.shortDescription)),
    getInternationalLimits(),
  ]);
  return rows.map((row) => ({
    ...row,
    readiness: equipmentReadiness(row.type, row.status, limits),
  }));
}

export async function countEquipmentByStatus() {
  await requireRole();
  const rows = await getDb().select({ status: equipment.status }).from(equipment);
  const counts: Record<EquipmentStatus, number> = { active: 0, inactive: 0, retired: 0 };
  for (const row of rows) counts[row.status]++;
  return counts;
}

export async function getEquipment(id: string) {
  await requireRole();
  const [row] = await getDb().select().from(equipment).where(eq(equipment.id, id));
  return row ?? null;
}

/**
 * RF-02 change history. The equipment's own audit rows plus changes to the international
 * limits of the parameters it measures, newest first.
 */
export async function getEquipmentHistory(id: string, type: EquipmentType) {
  await requireRole();
  const codes = parametersFor(type).map((p) => p.code);
  return getDb()
    .select()
    .from(auditLog)
    .where(
      or(
        and(eq(auditLog.entity, "equipment"), eq(auditLog.entityId, id)),
        and(eq(auditLog.entity, "international_limit"), inArray(auditLog.entityId, codes)),
      ),
    )
    .orderBy(desc(auditLog.at))
    .limit(50);
}
