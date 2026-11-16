import "server-only";
import { getDb } from "@/lib/db";
import {
  certificateLines,
  certificates,
  clients,
  deliveries,
  inspectionResults,
  inspections,
  lots,
  parameters,
  user,
} from "@/lib/db/schema";
import { and, count, desc, eq, gt, gte, inArray, lt, lte, or } from "drizzle-orm";
import {
  buildReport,
  issuedAtBounds,
  statusesFor,
  type ReportFilters,
  type ReportStatus,
} from "@/lib/domain/report";
import { buildProductionQuality } from "@/lib/domain/production-quality";
import { getInternationalLimits } from "@/lib/reference-data";
import { requireRole } from "@/lib/session";

export type {
  DeviationDetail,
  MonthlyPoint,
  ParameterIncidence,
  ReportFilters,
} from "@/lib/domain/report";

/**
 * RF-07. Filters are already validated by `parseReportFilters`. Drafts are never read
 * (D-25), and the range applies to `issuedAt` in plant time.
 */
function buildWhere(filters: ReportFilters) {
  const conditions = [inArray(certificates.status, statusesFor(filters))];

  if (filters.clientId) {
    conditions.push(eq(certificates.clientId, filters.clientId));
  }

  const { start, end } = issuedAtBounds(filters);
  if (start) conditions.push(gte(certificates.issuedAt, start));
  if (end) conditions.push(lte(certificates.issuedAt, end));

  return and(...conditions);
}

/**
 * Loads everything the report page needs in three queries: the certificates of the
 * period, their out-of-range lines and their failed delivery attempts. The rules live
 * in `buildReport` (src/lib/domain/report.ts).
 *
 * RF-01: both roles can read reports, so this checks the role itself.
 */
export async function getReportData(filters: ReportFilters = {}) {
  await requireRole("transaction", "query");
  const db = getDb();
  const where = buildWhere(filters);

  const outOfRange = or(
    lt(certificateLines.value, certificateLines.lowerLimit),
    gt(certificateLines.value, certificateLines.upperLimit),
  );

  const [certRows, lineRows, failedRows] = await Promise.all([
    db
      .select({
        id: certificates.id,
        status: certificates.status,
        issuedAt: certificates.issuedAt,
        clientName: clients.businessName,
        sapKey: clients.sapKey,
        rfc: clients.rfc,
        lotId: certificates.lotId,
        inspectionSequence: inspections.sequence,
        purchaseOrder: certificates.purchaseOrder,
        invoiceNumber: certificates.invoiceNumber,
        issuedByName: user.name,
        cancellationReason: certificates.cancellationReason,
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

    db
      .select({ certificateId: deliveries.certificateId, failed: count() })
      .from(deliveries)
      .innerJoin(certificates, eq(deliveries.certificateId, certificates.id))
      .where(and(where, eq(deliveries.succeeded, false)))
      .groupBy(deliveries.certificateId),
  ]);

  // The query only reads issued, sent or cancelled certificates
  return buildReport(
    certRows.map((c) => ({ ...c, status: c.status as ReportStatus })),
    lineRows,
    failedRows,
  );
}

/** Flat rows to export to CSV / Excel / Power BI (D-19). */
export async function getExportableCertificateData(filters: ReportFilters = {}) {
  const { history } = await getReportData(filters);
  return history;
}

/**
 * RF-07 · UC-08. Quality of the flour produced in the period, from the lots and their
 * inspections, certified or not. The period applies to the production date, and the client
 * filter does not apply because a lot has no client until it is certified. The rules live in
 * `buildProductionQuality` (src/lib/domain/production-quality.ts).
 */
export async function getProductionQualityData(filters: ReportFilters = {}) {
  await requireRole("transaction", "query");
  const db = getDb();

  const conditions = [];
  if (filters.startDate) conditions.push(gte(lots.producedOn, filters.startDate));
  if (filters.endDate) conditions.push(lte(lots.producedOn, filters.endDate));
  const lotWhere = conditions.length ? and(...conditions) : undefined;

  const [lotRows, inspectionRows, resultRows, limits] = await Promise.all([
    db.select({ id: lots.id, producedOn: lots.producedOn }).from(lots).where(lotWhere),
    db
      .select({ id: inspections.id, lotId: inspections.lotId, sequence: inspections.sequence })
      .from(inspections)
      .innerJoin(lots, eq(inspections.lotId, lots.id))
      .where(lotWhere),
    db
      .select({
        inspectionId: inspectionResults.inspectionId,
        parameterCode: inspectionResults.parameterCode,
        value: inspectionResults.value,
      })
      .from(inspectionResults)
      .innerJoin(inspections, eq(inspectionResults.inspectionId, inspections.id))
      .innerJoin(lots, eq(inspections.lotId, lots.id))
      .where(lotWhere),
    getInternationalLimits(),
  ]);

  return buildProductionQuality(lotRows, inspectionRows, resultRows, limits);
}

/** Options for the client filter. */
export async function getClientOptions() {
  await requireRole("transaction", "query");
  const db = getDb();
  return await db
    .select({ id: clients.id, name: clients.businessName, sapKey: clients.sapKey })
    .from(clients)
    .orderBy(clients.businessName);
}
