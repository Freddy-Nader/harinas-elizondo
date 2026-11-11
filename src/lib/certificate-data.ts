import "server-only";
import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import {
  certificateLines,
  certificates,
  clientDeliveryAddresses,
  clientLimits,
  clients,
  inspectionResults,
  inspections,
  lots,
  user,
} from "@/lib/db/schema";
import {
  buildCertificateLines,
  certificateHash,
  inspectionProblem,
  issueBlockers,
  linesFromSnapshot,
  pickCertifiableInspection,
  type LinesResult,
} from "@/lib/domain/certificate";
import type { LimitsByParameter } from "@/lib/domain/quality";
import { summarizeInspections } from "@/lib/inspection-data";
import { getInternationalLimits } from "@/lib/reference-data";
import type { CertificatePdfData } from "@/lib/services/certificate-pdf";

/**
 * RF-05 · UC-05. Certificate reads shared by the screens, the PDF route and the actions.
 * Callers check the role themselves (RF-01).
 */

/**
 * BR-CER-01 · BR-REF-01. What a certificate would print right now for a client and lot:
 * the lot's LATEST inspection (blocked if incomplete) against the client's limits, with
 * the international ones as fallback.
 */
export async function computeCertificateLines(clientId: string, lotId: string) {
  const db = getDb();
  const summaries = await summarizeInspections(eq(inspections.lotId, lotId));
  const pick = pickCertifiableInspection(summaries);
  const problem = inspectionProblem(pick);
  if (!pick.ok) return { inspection: null, problem, result: null as LinesResult | null };

  const { inspection } = pick;
  const [results, international, own] = await Promise.all([
    db
      .select({ parameterCode: inspectionResults.parameterCode, value: inspectionResults.value })
      .from(inspectionResults)
      .where(eq(inspectionResults.inspectionId, inspection.id)),
    getInternationalLimits(),
    db.select().from(clientLimits).where(eq(clientLimits.clientId, clientId)),
  ]);

  const clientMap: LimitsByParameter = Object.fromEntries(
    own.map((r) => [r.parameterCode, { lower: r.lowerLimit, upper: r.upperLimit }]),
  );
  const values = Object.fromEntries(results.map((r) => [r.parameterCode, r.value]));
  return {
    inspection,
    problem: null,
    result: buildCertificateLines(values, international, own.length ? clientMap : null),
  };
}

/** D-22. A client's delivery destinations, in the order they were captured. */
export function listClientDestinations(clientId: string) {
  return getDb()
    .select({ id: clientDeliveryAddresses.id, address: clientDeliveryAddresses.address })
    .from(clientDeliveryAddresses)
    .where(eq(clientDeliveryAddresses.clientId, clientId))
    .orderBy(asc(clientDeliveryAddresses.position));
}

const issuer = alias(user, "issuer");
const canceller = alias(user, "canceller");

/** Everything one certificate screen or PDF needs, or null when it does not exist. */
export async function loadCertificate(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      cert: certificates,
      client: clients,
      lot: lots,
      issuerName: issuer.name,
      issuerEmployeeId: issuer.employeeId,
      cancellerName: canceller.name,
    })
    .from(certificates)
    .innerJoin(clients, eq(clients.id, certificates.clientId))
    .innerJoin(lots, eq(lots.id, certificates.lotId))
    .leftJoin(issuer, eq(issuer.id, certificates.issuedBy))
    .leftJoin(canceller, eq(canceller.id, certificates.cancelledBy))
    .where(eq(certificates.id, id));
  if (!row) return null;

  const { cert, client, lot } = row;
  const isDraft = cert.status === "draft";

  // Drafts preview live data; issued certificates print their snapshot (D-10)
  let inspection: { id: number; sequence: string; inspectedAt: Date } | null = null;
  let preview: LinesResult | null = null;
  let problem: string | null = null;
  let lines;
  if (isDraft) {
    const computed = await computeCertificateLines(client.id, lot.id);
    inspection = computed.inspection;
    preview = computed.result;
    problem = computed.problem;
    lines = preview?.ok ? preview.lines : [];
  } else {
    const [snapshot, [used]] = await Promise.all([
      db
        .select()
        .from(certificateLines)
        .where(eq(certificateLines.certificateId, cert.id))
        .orderBy(asc(certificateLines.parameterCode)),
      db
        .select({ id: inspections.id, sequence: inspections.sequence, inspectedAt: inspections.inspectedAt })
        .from(inspections)
        .where(eq(inspections.id, cert.inspectionId)),
    ]);
    inspection = used ?? null;
    lines = linesFromSnapshot(snapshot);
  }

  const blockers = isDraft
    ? issueBlockers({
        status: cert.status,
        purchaseOrder: cert.purchaseOrder,
        invoiceNumber: cert.invoiceNumber,
        quantityDelivered: cert.quantityDelivered,
        shippedOn: cert.shippedOn,
        deliveryAddress: cert.deliveryAddress,
        carrier: cert.carrier,
        client: { status: client.status },
        lot: { producedOn: lot.producedOn, expiresOn: lot.expiresOn },
        inspectionProblem: problem,
      })
    : [];
  if (isDraft && preview && !preview.ok) {
    if (preview.missingResults.length) blockers.push("Faltan resultados en la última inspección.");
    if (preview.missingLimits.length) {
      blockers.push("Faltan valores de referencia para algunos parámetros. Revisa los límites en Equipos.");
    }
  }

  // D-26. Recompute the hash from what is stored now; a mismatch means the row was altered
  const integrity =
    !isDraft && cert.signatureHash && cert.issuedAt && inspection
      ? cert.signatureHash ===
        certificateHash({
          id: cert.id,
          clientSapKey: client.sapKey,
          lotId: lot.id,
          inspectionSequence: inspection.sequence,
          purchaseOrder: cert.purchaseOrder,
          invoiceNumber: cert.invoiceNumber,
          quantityRequested: cert.quantityRequested,
          quantityDelivered: cert.quantityDelivered,
          shippedOn: cert.shippedOn,
          deliveryAddress: cert.deliveryAddress,
          carrier: cert.carrier,
          issuedAt: cert.issuedAt,
          issuerEmployeeId: row.issuerEmployeeId,
          lines,
        })
        ? ("ok" as const)
        : ("mismatch" as const)
      : null;

  const pdf: CertificatePdfData = {
    id: cert.id,
    status: cert.status,
    client: {
      sapKey: client.sapKey,
      businessName: client.businessName,
      rfc: client.rfc,
      fiscalAddress: client.fiscalAddress,
      contactName: client.contactName,
    },
    deliveryAddress: cert.deliveryAddress,
    carrier: cert.carrier,
    lot: { id: lot.id, product: lot.product, producedOn: lot.producedOn, expiresOn: lot.expiresOn },
    inspection: inspection ? { sequence: inspection.sequence, inspectedAt: inspection.inspectedAt } : null,
    purchaseOrder: cert.purchaseOrder,
    invoiceNumber: cert.invoiceNumber,
    quantityRequested: cert.quantityRequested,
    quantityDelivered: cert.quantityDelivered,
    shippedOn: cert.shippedOn,
    issuedAt: cert.issuedAt,
    issuer: row.issuerName ? { name: row.issuerName, employeeId: row.issuerEmployeeId } : null,
    requiresSignature: cert.requiresSignature,
    signatureHash: cert.signatureHash,
    cancellation:
      cert.status === "cancelled" && cert.cancelledAt
        ? { at: cert.cancelledAt, reason: cert.cancellationReason ?? "", by: row.cancellerName }
        : null,
    lines,
  };

  return {
    cert,
    client,
    lot,
    inspection,
    /** Only for drafts: why lines could not be built, if they could not */
    preview,
    blockers,
    integrity,
    issuerEmployeeId: row.issuerEmployeeId,
    pdf,
  };
}

export type LoadedCertificate = NonNullable<Awaited<ReturnType<typeof loadCertificate>>>;
