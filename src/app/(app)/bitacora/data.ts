import "server-only";
import { and, count, desc, eq, gte, ilike, inArray, lt, or, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { requireRole } from "@/lib/session";
import { dateBounds, likePattern, PAGE_SIZE, type AuditFilters } from "./filters";
import { entityCodes } from "./labels";

/**
 * RF-08 · D-20. Read side of the audit log. Both roles may read it, and the function
 * checks the role itself so a page that forgets the gate still cannot leak data (RF-01).
 * There is no write function here on purpose: the log is append-only (BR-AUD-01).
 */

function conditions(filters: AuditFilters): SQL[] {
  const { from, to } = dateBounds(filters);
  const list: (SQL | undefined)[] = [
    filters.entity ? inArray(auditLog.entity, entityCodes(filters.entity)) : undefined,
    filters.action ? eq(auditLog.action, filters.action) : undefined,
    filters.entityId ? eq(auditLog.entityId, filters.entityId) : undefined,
    from ? gte(auditLog.at, from) : undefined,
    to ? lt(auditLog.at, to) : undefined,
  ];
  if (filters.employee) {
    const pattern = likePattern(filters.employee);
    list.push(or(ilike(auditLog.employeeId, pattern), ilike(auditLog.userName, pattern)));
  }
  return list.filter((c): c is SQL => c !== undefined);
}

/** One page of audit rows, newest first, plus the total that matches the filters. */
export async function listAuditLog(filters: AuditFilters) {
  await requireRole("transaction", "query");
  const where = and(...conditions(filters));
  const db = getDb();
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.at), desc(auditLog.id))
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(auditLog).where(where),
  ]);
  return { rows, total: totals[0]?.total ?? 0 };
}

export type AuditLogRow = Awaited<ReturnType<typeof listAuditLog>>["rows"][number];
