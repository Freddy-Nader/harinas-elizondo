import "server-only";
import { asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { inspections, lots } from "@/lib/db/schema";
import { summarizeInspections } from "@/lib/inspection-data";
import { requireRole } from "@/lib/session";

/** RF-04 · UC-03. Reads for the Lotes screens. Each one checks the role (RF-01). */

export async function listLots(query?: string) {
  await requireRole();
  const q = query?.trim();
  const rows = await getDb()
    .select()
    .from(lots)
    .where(q ? or(ilike(lots.id, `%${q}%`), ilike(lots.product, `%${q}%`)) : undefined)
    .orderBy(desc(lots.producedOn), asc(lots.id))
    .limit(200);

  const summaries = rows.length ? await summarizeInspections(inArray(inspections.lotId, rows.map((r) => r.id))) : [];
  const byLot = new Map<string, typeof summaries>();
  for (const s of summaries) byLot.set(s.lotId, [...(byLot.get(s.lotId) ?? []), s]);

  return rows.map((row) => {
    const own = byLot.get(row.id) ?? [];
    return { ...row, inspectionCount: own.length, latest: own.at(-1) ?? null };
  });
}

export async function getLot(id: string) {
  await requireRole();
  const [row] = await getDb().select().from(lots).where(eq(lots.id, id));
  if (!row) return null;
  const list = await summarizeInspections(eq(inspections.lotId, id));
  return { ...row, inspections: list, latest: list.at(-1) ?? null };
}

/** D-21. Products typed in earlier lots, offered as suggestions. */
export async function productSuggestions() {
  await requireRole();
  const rows = await getDb().selectDistinct({ product: lots.product }).from(lots).orderBy(asc(lots.product)).limit(50);
  return rows.map((r) => r.product);
}
