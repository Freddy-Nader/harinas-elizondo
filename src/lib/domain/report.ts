/**
 * RF-07 · UC-08. Pure rules for the Reportes module, with no database access, so they can be
 * tested. The aggregation in `buildReport` is the one @laxmxn wrote in `reportes/data.ts`
 * (PR #33), moved here unchanged except for certificate states (D-25) and failed deliveries.
 *
 * Certificate states (D-25): drafts never appear because they were never issued. Cancelled
 * certificates stay in the history but never count as valid in the KPIs, charts or deviations.
 */

export const REPORT_STATUSES = ["issued", "sent", "cancelled"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const PERIOD_PRESETS = ["month", "quarter", "year"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  month: "Este mes",
  quarter: "Este trimestre",
  year: "Este año",
};

export interface ReportFilters {
  startDate?: string; // YYYY-MM-DD, plant time
  endDate?: string; // YYYY-MM-DD, plant time
  clientId?: string;
  status?: ReportStatus;
  period?: PeriodPreset;
  page?: number;
}

/** Lab time zone (Mexico City, no daylight saving since 2022). */
export const REPORT_TZ = "America/Mexico_City";
const REPORT_TZ_OFFSET = "-06:00";
const PLANT_OFFSET_MS = 6 * 60 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Today's date at the plant, 'YYYY-MM-DD'. */
export function plantToday(now: Date): string {
  return new Date(now.getTime() - PLANT_OFFSET_MS).toISOString().slice(0, 10);
}

/** A real calendar date in 'YYYY-MM-DD' form ('2026-02-31' is rejected). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** RF-07 configurable periods. Inclusive range of a preset, relative to `today`. */
export function presetRange(preset: PeriodPreset, today: string): { startDate: string; endDate: string } {
  const [y, m] = today.split("-").map(Number);
  const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
  switch (preset) {
    case "month":
      return { startDate: isoDate(y, m, 1), endDate: isoDate(y, m, lastDay(y, m)) };
    case "quarter": {
      const first = Math.floor((m - 1) / 3) * 3 + 1;
      return { startDate: isoDate(y, first, 1), endDate: isoDate(y, first + 2, lastDay(y, first + 2)) };
    }
    case "year":
      return { startDate: isoDate(y, 1, 1), endDate: isoDate(y, 12, 31) };
  }
}

function single(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v === "number") return String(v);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * RF-07. Filters from the URL (`startDate`, `endDate`, `clientId`, `status`, `period`, `page`)
 * or from the export action. Anything invalid is dropped, never passed to the database.
 * A period preset wins over typed dates. A reversed range is swapped. No period and no
 * dates means the whole history.
 */
export function parseReportFilters(raw: Record<string, unknown>, today: string): ReportFilters {
  const filters: ReportFilters = {};

  const period = single(raw.period);
  if ((PERIOD_PRESETS as readonly string[]).includes(period ?? "")) {
    filters.period = period as PeriodPreset;
    Object.assign(filters, presetRange(filters.period, today));
  } else {
    let start = single(raw.startDate);
    let end = single(raw.endDate);
    start = isIsoDate(start) ? start : undefined;
    end = isIsoDate(end) ? end : undefined;
    if (start && end && start > end) [start, end] = [end, start];
    if (start) filters.startDate = start;
    if (end) filters.endDate = end;
  }

  const clientId = single(raw.clientId);
  if (clientId && UUID_RE.test(clientId)) filters.clientId = clientId;

  const status = single(raw.status);
  if ((REPORT_STATUSES as readonly string[]).includes(status ?? "")) filters.status = status as ReportStatus;

  const page = Number(single(raw.page));
  if (Number.isInteger(page) && page > 1) filters.page = page;

  return filters;
}

/** URL params for the filters, so links keep the same view. A preset is kept as a preset. */
export function filtersToParams(filters: ReportFilters): Record<string, string | undefined> {
  return {
    period: filters.period,
    startDate: filters.period ? undefined : filters.startDate,
    endDate: filters.period ? undefined : filters.endDate,
    clientId: filters.clientId,
    status: filters.status,
    page: filters.page && filters.page > 1 ? String(filters.page) : undefined,
  };
}

/**
 * Instants that bound `certificates.issuedAt` for the inclusive range in plant time.
 * The end day is included whole.
 */
export function issuedAtBounds(filters: ReportFilters): { start: Date | null; end: Date | null } {
  return {
    start: filters.startDate ? new Date(`${filters.startDate}T00:00:00.000${REPORT_TZ_OFFSET}`) : null,
    end: filters.endDate ? new Date(`${filters.endDate}T23:59:59.999${REPORT_TZ_OFFSET}`) : null,
  };
}

/** Statuses the query reads: the one chosen, or every issued one (never drafts). */
export function statusesFor(filters: ReportFilters): ReportStatus[] {
  return filters.status ? [filters.status] : [...REPORT_STATUSES];
}

// ---------------------------------------------------------------------------
// Aggregation (laxmxn, PR #33)
// ---------------------------------------------------------------------------

export interface CertificateRow {
  id: string;
  status: ReportStatus;
  issuedAt: Date | null;
  clientName: string;
  sapKey: string;
  rfc: string | null;
  lotId: string;
  inspectionSequence: string;
  purchaseOrder: string;
  invoiceNumber: string | null;
  issuedByName: string | null;
  cancellationReason: string | null;
}

export interface LineRow {
  certificateId: string;
  parameterCode: string;
  parameterLabel: string;
  unit: string;
  value: number;
  lowerLimit: number;
  upperLimit: number;
}

export interface FailedDeliveryRow {
  certificateId: string;
  failed: number;
}

export interface DeviationDetail {
  certificateId: string;
  issuedAt: Date | null;
  clientName: string;
  sapKey: string;
  lotId: string;
  parameterCode: string;
  parameterLabel: string;
  unit: string;
  value: number;
  lowerLimit: number;
  upperLimit: number;
  direction: "bajo" | "alto";
  /** Distance between the value and the limit it crossed. */
  outBy: number;
}

export interface ParameterIncidence {
  code: string;
  label: string;
  unit: string;
  count: number;
  percent: number;
  cumulativePercent: number;
}

export interface MonthlyPoint {
  key: string; // YYYY-MM
  label: string;
  total: number;
  withDeviation: number;
  compliant: number;
}

export type HistoryRow = CertificateRow & { deviationParams: string[]; failedDeliveries: number };

/** D-25. A cancelled certificate is kept in the history but is not a valid issued one. */
export const isValidCertificate = (row: Pick<CertificateRow, "status">) => row.status !== "cancelled";

/**
 * BR-CER-04 deviation rule: a line is out of range when value < lowerLimit or
 * value > upperLimit, using the limits stored in certificate_lines (snapshot, D-10).
 * A value equal to a limit is within range. Same rule as `deviation != 0`.
 */
export const isOutOfRange = (line: Pick<LineRow, "value" | "lowerLimit" | "upperLimit">) =>
  line.value < line.lowerLimit || line.value > line.upperLimit;

function round(n: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function monthParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return { year: Number(year), month: Number(month), key: `${year}-${month}` };
}

/**
 * RF-07. Everything the report page shows, from the certificates of the period, their
 * out-of-range lines and their failed delivery attempts. `certRows` should come sorted by
 * `issuedAt` descending.
 */
export function buildReport(
  certRows: readonly CertificateRow[],
  lineRows: readonly LineRow[],
  failedRows: readonly FailedDeliveryRow[] = [],
) {
  const certById = new Map(certRows.map((c) => [c.id, c]));

  // Out-of-range parameters per certificate, shown in the history for every row
  const paramsByCert = new Map<string, string[]>();
  for (const line of lineRows) {
    if (!isOutOfRange(line) || !certById.has(line.certificateId)) continue;
    const list = paramsByCert.get(line.certificateId) ?? [];
    if (!list.includes(line.parameterLabel)) list.push(line.parameterLabel);
    paramsByCert.set(line.certificateId, list);
  }

  const failedByCert = new Map(failedRows.map((r) => [r.certificateId, Number(r.failed)]));

  const history: HistoryRow[] = certRows.map((c) => ({
    ...c,
    deviationParams: paramsByCert.get(c.id) ?? [],
    failedDeliveries: failedByCert.get(c.id) ?? 0,
  }));

  // Detail of each out-of-range parameter, valid certificates only (D-25)
  const deviations: DeviationDetail[] = [];
  for (const line of lineRows) {
    const cert = certById.get(line.certificateId);
    if (!cert || !isValidCertificate(cert) || !isOutOfRange(line)) continue;
    const below = line.value < line.lowerLimit;
    deviations.push({
      certificateId: cert.id,
      issuedAt: cert.issuedAt,
      clientName: cert.clientName,
      sapKey: cert.sapKey,
      lotId: cert.lotId,
      parameterCode: line.parameterCode,
      parameterLabel: line.parameterLabel,
      unit: line.unit,
      value: line.value,
      lowerLimit: line.lowerLimit,
      upperLimit: line.upperLimit,
      direction: below ? "bajo" : "alto",
      outBy: round(below ? line.lowerLimit - line.value : line.value - line.upperLimit, 3),
    });
  }
  deviations.sort((a, b) => {
    const byDate = (b.issuedAt?.getTime() ?? 0) - (a.issuedAt?.getTime() ?? 0);
    if (byDate !== 0) return byDate;
    return a.certificateId.localeCompare(b.certificateId) || a.parameterCode.localeCompare(b.parameterCode);
  });

  // Pareto: incidences per parameter
  const byCode = new Map<string, { code: string; label: string; unit: string; count: number }>();
  for (const d of deviations) {
    const entry = byCode.get(d.parameterCode) ?? {
      code: d.parameterCode,
      label: d.parameterLabel,
      unit: d.unit,
      count: 0,
    };
    entry.count += 1;
    byCode.set(d.parameterCode, entry);
  }
  const totalIncidences = deviations.length;
  let running = 0;
  const byParameter: ParameterIncidence[] = [...byCode.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((p) => {
      running += p.count;
      return {
        ...p,
        percent: round((p.count / totalIncidences) * 100, 1),
        cumulativePercent: round((running / totalIncidences) * 100, 1),
      };
    });

  // Monthly trend (by issue date, Mexico City time), valid certificates only
  const valid = history.filter(isValidCertificate);
  const months = new Map<string, MonthlyPoint>();
  for (const c of valid) {
    if (!c.issuedAt) continue;
    const { year, month, key } = monthParts(c.issuedAt);
    const point = months.get(key) ?? {
      key,
      label: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("es-MX", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      total: 0,
      withDeviation: 0,
      compliant: 0,
    };
    point.total += 1;
    if (c.deviationParams.length > 0) point.withDeviation += 1;
    else point.compliant += 1;
    months.set(key, point);
  }
  const monthly = [...months.values()].sort((a, b) => a.key.localeCompare(b.key));

  // KPIs
  const totalCertificates = valid.length;
  const certificatesWithDeviation = valid.filter((c) => c.deviationParams.length > 0).length;
  const complianceRate =
    totalCertificates === 0
      ? null
      : round(((totalCertificates - certificatesWithDeviation) / totalCertificates) * 100, 1);

  return {
    history,
    deviations,
    byParameter,
    monthly,
    stats: {
      totalCertificates,
      certificatesWithDeviation,
      totalIncidences,
      complianceRate,
      cancelledCertificates: history.length - valid.length,
      failedDeliveries: history.reduce((sum, c) => sum + c.failedDeliveries, 0),
    },
  };
}

export type Report = ReturnType<typeof buildReport>;

export const REPORT_PAGE_SIZE = 20;

/** Page of the history. A page past the end falls back to the last one. */
export function paginate<T>(rows: readonly T[], page = 1, size = REPORT_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    items: rows.slice((current - 1) * size, current * size),
    page: current,
    pageCount,
    total: rows.length,
  };
}
