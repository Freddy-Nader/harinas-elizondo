/**
 * RF-08. Filters of the Bitácora screen, read from `searchParams`.
 * Query keys are user-facing, so they are Spanish. Pure, so it is unit tested.
 */
export const PAGE_SIZE = 50;

export type AuditFilters = {
  /** Stored entity code, for example `certificate`. */
  entity?: string;
  /** Stored action code, for example `issue`. */
  action?: string;
  /** Text matched against the employee id or the name. */
  employee?: string;
  /** First day included, `YYYY-MM-DD` in Mexico City time. */
  from?: string;
  /** Last day included, `YYYY-MM-DD` in Mexico City time. */
  to?: string;
  entityId?: string;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const CODE = /^[a-z][a-z_]{0,39}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Mexico City has had no daylight saving since 2022, so the offset is fixed. */
const MEXICO_CITY_OFFSET = "-06:00";
const DAY_MS = 24 * 60 * 60 * 1000;

function text(value: string | string[] | undefined, max: number) {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim().slice(0, max);
  return trimmed ? trimmed : undefined;
}

function code(value: string | string[] | undefined) {
  const v = text(value, 40);
  return v && CODE.test(v) ? v : undefined;
}

function day(value: string | string[] | undefined) {
  const v = text(value, 10);
  return v && DAY.test(v) && dayStart(v) !== null ? v : undefined;
}

/** Start of a `YYYY-MM-DD` day in Mexico City, or null when the day does not exist. */
function dayStart(value: string): Date | null {
  const date = new Date(`${value}T00:00:00${MEXICO_CITY_OFFSET}`);
  if (Number.isNaN(date.getTime())) return null;
  // `new Date` rolls 2026-02-31 over to March. Reject it instead of filtering by another day
  const [, month, dayOfMonth] = value.split("-").map(Number);
  const local = new Date(date.getTime() - 6 * 60 * 60 * 1000);
  return local.getUTCMonth() + 1 === month && local.getUTCDate() === dayOfMonth ? date : null;
}

/** Invalid or empty values are dropped, so a hand-edited URL never throws. */
export function parseAuditFilters(params: RawSearchParams): AuditFilters {
  const page = Number(text(params.pagina, 6));
  return {
    entity: code(params.entidad),
    action: code(params.accion),
    employee: text(params.empleado, 100),
    from: day(params.desde),
    to: day(params.hasta),
    entityId: text(params.id, 40),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Instants for the date range. `to` is exclusive, the start of the day after `hasta`. */
export function dateBounds({ from, to }: Pick<AuditFilters, "from" | "to">) {
  const end = to ? dayStart(to) : null;
  return {
    from: from ? dayStart(from) : null,
    to: end ? new Date(end.getTime() + DAY_MS) : null,
  };
}

/** Escapes LIKE wildcards so the employee search matches the text as typed. */
export function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export function hasFilters(filters: AuditFilters) {
  return Boolean(
    filters.entity || filters.action || filters.employee || filters.from || filters.to || filters.entityId,
  );
}

/** The `/bitacora` URL for these filters. Page 1 is left out. */
export function auditHref(filters: AuditFilters, page = filters.page) {
  const query = new URLSearchParams();
  if (filters.entity) query.set("entidad", filters.entity);
  if (filters.action) query.set("accion", filters.action);
  if (filters.employee) query.set("empleado", filters.employee);
  if (filters.from) query.set("desde", filters.from);
  if (filters.to) query.set("hasta", filters.to);
  if (filters.entityId) query.set("id", filters.entityId);
  if (page > 1) query.set("pagina", String(page));
  const qs = query.toString();
  return qs ? `/bitacora?${qs}` : "/bitacora";
}

export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
