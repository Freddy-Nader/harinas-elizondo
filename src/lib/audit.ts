import "server-only";
import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/session";

/**
 * BR-AUD-01. Every create, update and issue writes one audit row with the
 * employee id and name of who did it (RF-01, RF-08). Rows are append-only.
 *
 * Entities and actions are English codes. The Bitácora screen translates them.
 */
export type AuditEntity =
  | "client"
  | "client_limit"
  | "equipment"
  | "parameter"
  | "international_limit"
  | "lot"
  | "inspection"
  | "certificate"
  | "delivery"
  | "user";

export type AuditAction =
  | "create"
  | "update"
  | "deactivate"
  | "reactivate"
  | "retire"
  | "close"
  | "reinspect"
  | "issue"
  | "send"
  | "resend"
  | "cancel"
  | "export";

export type AuditEntry = {
  user: SessionUser;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | number;
  /** Small JSON with what changed, for example `{ before, after }` or a reason. No secrets. */
  detail?: Record<string, unknown>;
};

/** Builds the row. Exported for tests and for `db.batch` callers that write it with the change. */
export function auditRow({ user, action, entity, entityId, detail }: AuditEntry) {
  return {
    userId: user.id,
    employeeId: user.employeeId,
    userName: user.name,
    action,
    entity,
    entityId: String(entityId),
    detail: detail ?? null,
  } satisfies typeof auditLog.$inferInsert;
}

/**
 * Writes the audit row. The Neon HTTP driver has no interactive transactions, so when the
 * change and its audit row must land together, put `auditInsert(entry)` in the same
 * `getDb().batch([...])` as the change instead of calling this after it.
 */
export async function recordAudit(entry: AuditEntry) {
  await getDb().insert(auditLog).values(auditRow(entry));
}

/** The insert query, unexecuted, for use inside `getDb().batch([...])`. */
export function auditInsert(entry: AuditEntry) {
  return getDb().insert(auditLog).values(auditRow(entry));
}
