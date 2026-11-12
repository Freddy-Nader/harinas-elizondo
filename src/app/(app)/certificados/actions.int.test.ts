import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { saveClient } from "@/app/(app)/clientes/actions";
import { saveInspectionResults } from "@/app/(app)/inspecciones/actions";
import { startLotInspection, updateLot } from "@/app/(app)/lotes/actions";
import {
  auditLog,
  certificateLines,
  certificates,
  clientDeliveryAddresses,
  clients,
  inspectionResults,
  inspections,
} from "@/lib/db/schema";
import { holdUntilConcurrent, testDb } from "@/test/int/db";
import {
  clientForm,
  COMPLETE_VALUES,
  formData,
  initialState,
  insertEquipment,
  insertLot,
  redirectOf,
  resultsForm,
} from "@/test/int/fixtures";
import { signInAs } from "@/test/int/session";
import { createCertificate, issueCertificate } from "./actions";

describe("Certificados server actions against Postgres (UC-05)", () => {
  let machines: { alveograph: string; farinograph: string };
  let clientId: string;
  let destinationId: string;

  beforeAll(async () => {
    signInAs("transaction");
    machines = await insertEquipment();
    await redirectOf(saveClient(clientForm()));
    [{ id: clientId }] = await testDb.select({ id: clients.id }).from(clients);
    [{ id: destinationId }] = await testDb.select({ id: clientDeliveryAddresses.id }).from(clientDeliveryAddresses);
  });
  beforeEach(() => signInAs("transaction"));

  /** Lot with one inspection (complete unless `values` says otherwise). Returns the inspection id. */
  async function lotWithInspection(lotId: string, values = COMPLETE_VALUES) {
    await insertLot(lotId);
    const target = await redirectOf(startLotInspection(lotId, initialState, formData({})));
    const inspectionId = Number(target.replace("/inspecciones/", ""));
    expect(await saveInspectionResults(inspectionId, initialState, resultsForm(machines, values))).toMatchObject({ ok: true });
    return inspectionId;
  }

  const certificateForm = (lotId: string) =>
    formData({
      clientId,
      lotId,
      purchaseOrder: "OC-PRUEBA-1",
      quantityRequested: "1000",
      quantityDelivered: "1000",
      invoiceNumber: "F-PRUEBA-1",
      shippedOn: "2026-02-01",
      deliveryAddressId: destinationId,
      carrier: "Transportes de Prueba",
    });

  async function draftFor(lotId: string) {
    const target = await redirectOf(createCertificate(initialState, certificateForm(lotId)));
    return target.replace("/certificados/", "");
  }

  it("PC-08 BR-AUD-03 / BR-AUD-01 issuing snapshots the lines, locks the inspection and audits it together", async () => {
    const inspectionId = await lotWithInspection("PC-LOT-CERT");
    const id = await draftFor("PC-LOT-CERT");
    expect(id).toMatch(/^CER-\d{4}-\d{6}$/);

    expect(await issueCertificate(id, initialState, formData({}))).toMatchObject({ ok: true, message: "Certificado emitido." });

    const [certificate] = await testDb.select().from(certificates).where(eq(certificates.id, id));
    expect(certificate).toMatchObject({ status: "issued", inspectionId });
    expect(certificate.signatureHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await testDb.select().from(certificateLines).where(eq(certificateLines.certificateId, id))).toHaveLength(10);
    const [inspection] = await testDb.select().from(inspections).where(eq(inspections.id, inspectionId));
    expect(inspection.lockedAt).toBeInstanceOf(Date);
    const audit = await testDb.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(audit.map((row) => row.action).sort()).toEqual(["create", "issue"]);

    // BR-AUD-03. From now on the results and the lot are read-only
    const edited = await saveInspectionResults(
      inspectionId,
      initialState,
      resultsForm(machines, { ...COMPLETE_VALUES, ALV_W: 999 }),
    );
    expect(edited).toMatchObject({
      ok: false,
      message: "La inspección ya se usó en un certificado y no se puede modificar.",
    });
    const [strength] = (
      await testDb.select().from(inspectionResults).where(eq(inspectionResults.inspectionId, inspectionId))
    ).filter((r) => r.parameterCode === "ALV_W");
    expect(strength.value).toBe(300);
    const lotEdit = await updateLot(
      "PC-LOT-CERT",
      initialState,
      formData({ product: "Otro producto", producedOn: "2026-01-10", expiresOn: "2026-12-31" }),
    );
    expect(lotEdit).toMatchObject({ ok: false, message: "El lote ya tiene un certificado emitido y no se puede modificar." });
  });

  it("PC-09 BR-AUD-03 issues a certificate once when two users issue it at the same time", async () => {
    const inspectionId = await lotWithInspection("PC-LOT-CERT2");
    const id = await draftFor("PC-LOT-CERT2");

    // Both users see a draft before either batch starts
    holdUntilConcurrent(/^insert into "certificate_lines"/);
    const results = await Promise.all([
      issueCertificate(id, initialState, formData({})),
      issueCertificate(id, initialState, formData({})),
    ]);
    expect(results.map((r) => r.message).sort()).toEqual(["Certificado emitido.", "El certificado ya fue emitido."]);

    expect(await testDb.select().from(certificateLines).where(eq(certificateLines.certificateId, id))).toHaveLength(10);
    // BR-AUD-01. The refused attempt rolled back whole, so there is a single "issue" row
    const audit = await testDb.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(audit.filter((row) => row.action === "issue")).toHaveLength(1);
    const [inspection] = await testDb.select().from(inspections).where(eq(inspections.id, inspectionId));
    expect(inspection.lockedAt).toBeInstanceOf(Date);
  });

  it("PC-10 BR-CER-01 / BR-CER-02 refuses a certificate when the latest inspection is incomplete", async () => {
    await lotWithInspection("PC-LOT-CERT3", { ALV_P: 75, ALV_L: 100 });

    const result = await createCertificate(initialState, certificateForm("PC-LOT-CERT3"));
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { lotId: "La última inspección del lote (A) está incompleta. Complétala antes de certificar." },
    });
    expect(await testDb.select().from(certificates).where(eq(certificates.lotId, "PC-LOT-CERT3"))).toHaveLength(0);
  });
});
