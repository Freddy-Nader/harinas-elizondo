import "server-only";
import { eq, inArray, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { inspectionResults, inspections, user } from "@/lib/db/schema";
import { sequenceToNumber } from "@/lib/domain/inspection-sequence";
import { PARAMETERS } from "@/lib/domain/parameters";
import { evaluate, type LimitsByParameter } from "@/lib/domain/quality";
import { getInternationalLimits } from "@/lib/reference-data";

/**
 * RF-04. Inspection summaries shared by Lotes and Inspecciones: how many results each one
 * has, whether it is complete (BR-INS-03) and how many values fall outside the
 * international limits (preview only; the certificate uses the client's limits).
 */
export type InspectionRow = Awaited<ReturnType<typeof summarizeInspections>>[number];

export async function summarizeInspections(where?: SQL) {
  const db = getDb();
  const rows = await db
    .select({
      id: inspections.id,
      lotId: inspections.lotId,
      sequence: inspections.sequence,
      inspectedAt: inspections.inspectedAt,
      lockedAt: inspections.lockedAt,
      reinspectionReason: inspections.reinspectionReason,
      createdByName: user.name,
    })
    .from(inspections)
    .leftJoin(user, eq(user.id, inspections.createdBy))
    .where(where);

  const ids = rows.map((r) => r.id);
  const [results, limits] = await Promise.all([
    ids.length
      ? db
          .select({
            inspectionId: inspectionResults.inspectionId,
            parameterCode: inspectionResults.parameterCode,
            value: inspectionResults.value,
          })
          .from(inspectionResults)
          .where(inArray(inspectionResults.inspectionId, ids))
      : Promise.resolve([]),
    getInternationalLimits(),
  ]);

  const byInspection = new Map<number, { parameterCode: string; value: number }[]>();
  for (const r of results) {
    const list = byInspection.get(r.inspectionId) ?? [];
    list.push(r);
    byInspection.set(r.inspectionId, list);
  }

  return rows
    .map((row) => {
      const own = byInspection.get(row.id) ?? [];
      return {
        ...row,
        resultCount: own.length,
        complete: own.length === PARAMETERS.length,
        deviations: countDeviations(own, limits),
      };
    })
    .sort(
      (a, b) =>
        a.lotId.localeCompare(b.lotId) || sequenceToNumber(a.sequence) - sequenceToNumber(b.sequence),
    );
}

function countDeviations(results: { parameterCode: string; value: number }[], limits: LimitsByParameter) {
  let n = 0;
  for (const r of results) {
    const l = limits[r.parameterCode];
    if (l && evaluate(r.value, l).status !== "within") n++;
  }
  return n;
}

/** Latest inspection of a lot, by sequence, or null. */
export async function latestInspection(lotId: string) {
  const rows = await summarizeInspections(eq(inspections.lotId, lotId));
  return rows.at(-1) ?? null;
}
