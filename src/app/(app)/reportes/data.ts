import "server-only";
import { getDb } from "@/lib/db";
import {
  certificateLines,
  certificates,
  clients,
  inspections,
  parameters,
  user,
} from "@/lib/db/schema";
import { and, desc, eq, gt, gte, inArray, lt, lte, or } from "drizzle-orm";

export interface ReportFilters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  clientId?: string;
}

/** Solo certificados vigentes: se excluyen "draft" y "cancelled". */
const REPORTABLE_STATUSES = ["issued", "sent"] as const;

/** Zona horaria del laboratorio (Ciudad de México, sin horario de verano). */
const REPORT_TZ = "America/Mexico_City";
const REPORT_TZ_OFFSET = "-06:00";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  /** Distancia entre el valor y el límite que rebasó. */
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

function buildWhere(filters: ReportFilters) {
  const conditions = [inArray(certificates.status, [...REPORTABLE_STATUSES])];

  if (filters.clientId && UUID_RE.test(filters.clientId)) {
    conditions.push(eq(certificates.clientId, filters.clientId));
  }

  // Se filtra por fecha de emisión. El día final se incluye completo.
  if (filters.startDate && DATE_RE.test(filters.startDate)) {
    conditions.push(
      gte(certificates.issuedAt, new Date(`${filters.startDate}T00:00:00.000${REPORT_TZ_OFFSET}`)),
    );
  }

  if (filters.endDate && DATE_RE.test(filters.endDate)) {
    conditions.push(
      lte(certificates.issuedAt, new Date(`${filters.endDate}T23:59:59.999${REPORT_TZ_OFFSET}`)),
    );
  }

  return and(...conditions);
}

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
 * Carga todo lo que necesita la página de reportes en dos consultas:
 * certificados del periodo y sus líneas fuera de rango.
 *
 * Regla de desviación: un parámetro está fuera de rango cuando
 * value < lowerLimit o value > upperLimit, usando los límites que quedaron
 * guardados en certificate_lines (snapshot, D-10). Un valor igual al límite
 * está dentro de norma. Un certificado tiene desviación si al menos una de
 * sus líneas está fuera de rango.
 */
export async function getReportData(filters: ReportFilters = {}) {
  const db = await getDb();
  const where = buildWhere(filters);

  const outOfRange = or(
    lt(certificateLines.value, certificateLines.lowerLimit),
    gt(certificateLines.value, certificateLines.upperLimit),
  );

  const [certRows, lineRows] = await Promise.all([
    db
      .select({
        id: certificates.id,
        issuedAt: certificates.issuedAt,
        clientName: clients.businessName,
        sapKey: clients.sapKey,
        rfc: clients.rfc,
        lotId: certificates.lotId,
        inspectionSequence: inspections.sequence,
        purchaseOrder: certificates.purchaseOrder,
        invoiceNumber: certificates.invoiceNumber,
        issuedByName: user.name,
      })
      .from(certificates)
      .innerJoin(clients, eq(certificates.clientId, clients.id))
      .innerJoin(inspections, eq(certificates.inspectionId, inspections.id))
      .leftJoin(user, eq(certificates.issuedBy, user.id))
      .where(where)
      .orderBy(desc(certificates.issuedAt)),

    db
      .select({
        certificateId: certificateLines.certificateId,
        parameterCode: certificateLines.parameterCode,
        parameterLabel: parameters.label,
        unit: parameters.unit,
        value: certificateLines.value,
        lowerLimit: certificateLines.lowerLimit,
        upperLimit: certificateLines.upperLimit,
      })
      .from(certificateLines)
      .innerJoin(certificates, eq(certificateLines.certificateId, certificates.id))
      .innerJoin(parameters, eq(certificateLines.parameterCode, parameters.code))
      .where(and(where, outOfRange)),
  ]);

  // Detalle de cada parámetro fuera de rango
  const certById = new Map(certRows.map((c) => [c.id, c]));
  const deviations: DeviationDetail[] = [];
  for (const line of lineRows) {
    const cert = certById.get(line.certificateId);
    if (!cert) continue;
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

  // Parámetros fuera de rango por certificado
  const paramsByCert = new Map<string, string[]>();
  for (const d of deviations) {
    const list = paramsByCert.get(d.certificateId) ?? [];
    if (!list.includes(d.parameterLabel)) list.push(d.parameterLabel);
    paramsByCert.set(d.certificateId, list);
  }

  const history = certRows.map((c) => ({
    ...c,
    deviationParams: paramsByCert.get(c.id) ?? [],
  }));

  // Pareto: incidencias por parámetro
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

  // Tendencia mensual (por fecha de emisión, hora de Ciudad de México)
  const months = new Map<string, MonthlyPoint>();
  for (const c of history) {
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
  const totalCertificates = history.length;
  const certificatesWithDeviation = history.filter((c) => c.deviationParams.length > 0).length;
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
    },
  };
}

/** Registros planos para exportar a CSV / Excel / Power BI (Q-09). */
export async function getExportableCertificateData(filters: ReportFilters = {}) {
  const { history } = await getReportData(filters);
  return history;
}

/** Opciones para el filtro de cliente. */
export async function getClientOptions() {
  const db = await getDb();
  return await db
    .select({ id: clients.id, name: clients.businessName, sapKey: clients.sapKey })
    .from(clients)
    .orderBy(clients.businessName);
}