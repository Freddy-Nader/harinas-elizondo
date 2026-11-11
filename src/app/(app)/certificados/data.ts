import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { loadCertificate } from "@/lib/certificate-data";
import { getDb } from "@/lib/db";
import {
  certificateLines,
  certificates,
  clientDeliveryAddresses,
  clients,
  deliveries,
  inspections,
  lots,
  user,
} from "@/lib/db/schema";
import { pickCertifiableInspection, type CertificateStatus } from "@/lib/domain/certificate";
import { summarizeInspections } from "@/lib/inspection-data";
import { requireRole } from "@/lib/session";

/**
 * RF-05 · RF-06 · UC-05 / UC-06. Reads for the Certificados screens. Each one checks the
 * role itself, so a page that forgets the gate still cannot leak data (RF-01).
 */

export async function listCertificates(status?: CertificateStatus) {
  await requireRole();
  const db = getDb();
  const rows = await db
    .select({
      id: certificates.id,
      status: certificates.status,
      purchaseOrder: certificates.purchaseOrder,
      lotId: certificates.lotId,
      issuedAt: certificates.issuedAt,
      createdAt: certificates.createdAt,
      clientName: clients.businessName,
      sapKey: clients.sapKey,
    })
    .from(certificates)
    .innerJoin(clients, eq(clients.id, certificates.clientId))
    .where(status ? eq(certificates.status, status) : undefined)
    .orderBy(desc(certificates.createdAt))
    .limit(200);

  // Deviation count per issued certificate, from the snapshot
  const ids = rows.filter((r) => r.status !== "draft").map((r) => r.id);
  const lines = ids.length
    ? await db
        .select({ certificateId: certificateLines.certificateId, deviation: certificateLines.deviation })
        .from(certificateLines)
        .where(inArray(certificateLines.certificateId, ids))
    : [];
  const deviations = new Map<string, number>();
  for (const l of lines) {
    if (l.deviation !== 0) deviations.set(l.certificateId, (deviations.get(l.certificateId) ?? 0) + 1);
  }
  return rows.map((r) => ({ ...r, deviations: r.status === "draft" ? null : (deviations.get(r.id) ?? 0) }));
}

export async function countCertificatesByStatus() {
  await requireRole();
  const rows = await getDb().select({ status: certificates.status }).from(certificates);
  const counts: Record<CertificateStatus, number> = { draft: 0, issued: 0, sent: 0, cancelled: 0 };
  for (const r of rows) counts[r.status]++;
  return counts;
}

/**
 * UC-05. Choices for the form: active clients with their delivery destinations (D-22),
 * and lots whose latest inspection is complete (BR-CER-01), newest first.
 */
export async function certificateFormOptions() {
  await requireRole();
  const db = getDb();
  const [clientRows, lotRows, destinationRows] = await Promise.all([
    db
      .select({
        id: clients.id,
        sapKey: clients.sapKey,
        businessName: clients.businessName,
        requiresCertificate: clients.requiresCertificate,
      })
      .from(clients)
      .where(eq(clients.status, "active"))
      .orderBy(asc(clients.businessName)),
    db
      .select({ id: lots.id, product: lots.product, producedOn: lots.producedOn, expiresOn: lots.expiresOn })
      .from(lots)
      .orderBy(desc(lots.producedOn), asc(lots.id))
      .limit(200),
    db
      .select({
        id: clientDeliveryAddresses.id,
        clientId: clientDeliveryAddresses.clientId,
        address: clientDeliveryAddresses.address,
      })
      .from(clientDeliveryAddresses)
      .innerJoin(clients, eq(clients.id, clientDeliveryAddresses.clientId))
      .where(eq(clients.status, "active"))
      .orderBy(asc(clientDeliveryAddresses.position)),
  ]);

  const summaries = lotRows.length
    ? await summarizeInspections(inArray(inspections.lotId, lotRows.map((l) => l.id)))
    : [];
  const lotOptions = lotRows.flatMap((lot) => {
    const picked = pickCertifiableInspection(summaries.filter((s) => s.lotId === lot.id));
    return picked.ok
      ? [{ ...lot, inspection: picked.inspection.sequence, deviations: picked.inspection.deviations }]
      : [];
  });

  const clientOptions = clientRows.map((c) => ({
    ...c,
    destinations: destinationRows.filter((d) => d.clientId === c.id).map(({ id, address }) => ({ id, address })),
  }));
  return { clients: clientOptions, lots: lotOptions };
}

export async function getCertificate(id: string) {
  await requireRole();
  return loadCertificate(id);
}

/** RF-06. Evidence of every delivery attempt, newest first. */
export async function listDeliveries(certificateId: string) {
  await requireRole();
  return getDb()
    .select({
      id: deliveries.id,
      recipients: deliveries.recipients,
      succeeded: deliveries.succeeded,
      error: deliveries.error,
      sentAt: deliveries.sentAt,
      sentByName: user.name,
      sentByEmployeeId: user.employeeId,
    })
    .from(deliveries)
    .leftJoin(user, eq(user.id, deliveries.sentBy))
    .where(eq(deliveries.certificateId, certificateId))
    .orderBy(desc(deliveries.sentAt));
}
