"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditInsert } from "@/lib/audit";
import { fail, succeed, type ActionState } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { equipment, inspectionResults, inspections } from "@/lib/db/schema";
import { equipmentReadiness } from "@/lib/domain/equipment";
import { parseResults } from "@/lib/domain/lot";
import { EQUIPMENT_TYPE_LABEL, PARAMETERS, type EquipmentType } from "@/lib/domain/parameters";
import { missingParameters } from "@/lib/domain/quality";
import { getInternationalLimits } from "@/lib/reference-data";
import { ForbiddenError, requireRole } from "@/lib/session";

/**
 * RF-04 · UC-04. Saves the captured results of one inspection. Partial saves are allowed;
 * the inspection becomes complete when all ten parameters have a value (BR-INS-03).
 * Locked inspections (used by a certificate) are read-only (BR-AUD-03).
 */
export async function saveInspectionResults(
  inspectionId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireRole();
  } catch (error) {
    if (error instanceof ForbiddenError) return fail(error.message);
    throw error;
  }

  const db = getDb();
  const [inspection] = await db.select().from(inspections).where(eq(inspections.id, inspectionId));
  if (!inspection) return fail("Inspección no encontrada.");
  if (inspection.lockedAt) return fail("La inspección ya se usó en un certificado y no se puede modificar.");

  const parsed = parseResults({
    equipment: {
      alveograph: String(form.get("equipment_alveograph") ?? ""),
      farinograph: String(form.get("equipment_farinograph") ?? ""),
    },
    values: Object.fromEntries(PARAMETERS.map((p) => [p.code, String(form.get(`value_${p.code}`) ?? "")])),
  });
  if (!parsed.ok) return fail("Revisa los campos marcados.", parsed.errors);
  const { values, equipment: chosen, cleared } = parsed.data;

  // BR-EQP-03. Only active equipment of the right type with complete limits can measure
  const ids = Object.values(chosen);
  if (ids.length) {
    const [rows, limits] = await Promise.all([
      db.select().from(equipment).where(inArray(equipment.id, ids)),
      getInternationalLimits(),
    ]);
    const errors: Record<string, string> = {};
    for (const [type, id] of Object.entries(chosen) as [EquipmentType, string][]) {
      const row = rows.find((r) => r.id === id);
      if (!row || row.type !== type) {
        errors[`equipment_${type}`] = `Elige un ${EQUIPMENT_TYPE_LABEL[type].toLowerCase()}.`;
      } else if (!equipmentReadiness(row.type, row.status, limits).usable) {
        errors[`equipment_${type}`] = "Este equipo no está disponible para certificar (inactivo o sin valores de referencia).";
      }
    }
    if (Object.keys(errors).length) return fail("Revisa los campos marcados.", errors);
  }

  const before = await db
    .select({
      parameterCode: inspectionResults.parameterCode,
      value: inspectionResults.value,
      equipmentId: inspectionResults.equipmentId,
    })
    .from(inspectionResults)
    .where(eq(inspectionResults.inspectionId, inspectionId));
  const beforeMap = Object.fromEntries(before.map((r) => [r.parameterCode, r.value]));
  const changes: Record<string, [number | null, number | null]> = {};
  for (const p of PARAMETERS) {
    const a = beforeMap[p.code] ?? null;
    const b = values[p.code] ?? null;
    if (a !== b) changes[p.code] = [a, b];
  }

  const rows = Object.entries(values).map(([parameterCode, value]) => {
    const type = PARAMETERS.find((p) => p.code === parameterCode)!.equipmentType;
    return { inspectionId, parameterCode, value, equipmentId: chosen[type]! };
  });

  const queries = [
    ...(rows.length
      ? [
          db
            .insert(inspectionResults)
            .values(rows)
            .onConflictDoUpdate({
              target: [inspectionResults.inspectionId, inspectionResults.parameterCode],
              set: { value: sql`excluded.value`, equipmentId: sql`excluded.equipment_id` },
            }),
        ]
      : []),
    ...(cleared.length
      ? [
          db
            .delete(inspectionResults)
            .where(and(eq(inspectionResults.inspectionId, inspectionId), inArray(inspectionResults.parameterCode, cleared))),
        ]
      : []),
    auditInsert({
      user,
      action: "update",
      entity: "inspection",
      entityId: inspectionId,
      detail: { lotId: inspection.lotId, sequence: inspection.sequence, changes, equipment: chosen },
    }),
  ] as const;
  const equipmentChanged = rows.some(
    (r) => before.find((b) => b.parameterCode === r.parameterCode)?.equipmentId !== r.equipmentId,
  );
  if (Object.keys(changes).length === 0 && !equipmentChanged) {
    return succeed("No hubo cambios que guardar.");
  }
  await db.batch(queries as unknown as Parameters<typeof db.batch>[0]);

  revalidatePath("/inspecciones", "layout");
  revalidatePath("/lotes", "layout");
  const missing = missingParameters(values).length;
  return succeed(missing === 0 ? "Resultados guardados. La inspección está completa." : `Resultados guardados. Faltan ${missing} de 10 parámetros.`);
}
