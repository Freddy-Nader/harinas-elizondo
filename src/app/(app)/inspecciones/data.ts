import "server-only";
import { eq, ilike } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { inspectionResults, inspections, lots } from "@/lib/db/schema";
import { summarizeInspections } from "@/lib/inspection-data";
import { getInternationalLimits, listEquipmentOfType } from "@/lib/reference-data";
import { requireRole } from "@/lib/session";

/** RF-04 · UC-03 · UC-04. Reads for the Inspecciones screens. Each one checks the role (RF-01). */

export async function listInspections(lotQuery?: string) {
  await requireRole();
  const q = lotQuery?.trim();
  const rows = await summarizeInspections(q ? ilike(inspections.lotId, `%${q}%`) : undefined);
  // Newest first for the list
  return rows.sort((a, b) => b.inspectedAt.getTime() - a.inspectedAt.getTime()).slice(0, 200);
}

export async function getInspection(id: number) {
  await requireRole();
  const db = getDb();
  const [row] = await db
    .select({ inspection: inspections, lot: lots })
    .from(inspections)
    .innerJoin(lots, eq(lots.id, inspections.lotId))
    .where(eq(inspections.id, id));
  if (!row) return null;

  const [results, limits, alveographs, farinographs, siblings] = await Promise.all([
    db.select().from(inspectionResults).where(eq(inspectionResults.inspectionId, id)),
    getInternationalLimits(),
    listEquipmentOfType("alveograph"),
    listEquipmentOfType("farinograph"),
    summarizeInspections(eq(inspections.lotId, row.lot.id)),
  ]);

  return {
    ...row.inspection,
    lot: row.lot,
    results: Object.fromEntries(results.map((r) => [r.parameterCode, { value: r.value, equipmentId: r.equipmentId }])),
    limits,
    equipment: { alveograph: alveographs, farinograph: farinographs },
    isLatest: siblings.at(-1)?.id === id,
  };
}
