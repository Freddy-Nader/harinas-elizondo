import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { saveClient } from "@/app/(app)/clientes/actions";
import { createCertificate, issueCertificate } from "@/app/(app)/certificados/actions";
import { saveInspectionResults } from "@/app/(app)/inspecciones/actions";
import { startLotInspection } from "@/app/(app)/lotes/actions";
import { auditLog, clientDeliveryAddresses, clients } from "@/lib/db/schema";
import { testDb, TEST_USERS } from "@/test/int/db";
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
import { signInAs, signOut } from "@/test/int/session";
import { exportCertificatesAction } from "./actions";
import { getReportData } from "./data";

describe("Reportes against Postgres (UC-08)", () => {
  const issued: { id: string; clientId: string }[] = [];

  beforeAll(async () => {
    signInAs("transaction");
    const machines = await insertEquipment();
    const specs = [
      { sapKey: "PC0001", rfc: "TEST010101AAA", lotId: "PC-LOT-REP1" },
      { sapKey: "PC0002", rfc: "TEST020202BBB", lotId: "PC-LOT-REP2" },
    ];
    for (const spec of specs) {
      await redirectOf(saveClient(clientForm({ sapKey: spec.sapKey, rfc: spec.rfc, businessName: `Cliente ${spec.sapKey}` })));
      const [client] = await testDb.select({ id: clients.id }).from(clients).where(eq(clients.sapKey, spec.sapKey));
      const [destination] = await testDb
        .select({ id: clientDeliveryAddresses.id })
        .from(clientDeliveryAddresses)
        .where(eq(clientDeliveryAddresses.clientId, client.id));

      await insertLot(spec.lotId);
      const inspection = await redirectOf(startLotInspection(spec.lotId, initialState, formData({})));
      const inspectionId = Number(inspection.replace("/inspecciones/", ""));
      await saveInspectionResults(inspectionId, initialState, resultsForm(machines, COMPLETE_VALUES));

      const draft = await redirectOf(
        createCertificate(
          initialState,
          formData({
            clientId: client.id,
            lotId: spec.lotId,
            purchaseOrder: `OC-${spec.sapKey}`,
            quantityRequested: "1000",
            quantityDelivered: "1000",
            invoiceNumber: `F-${spec.sapKey}`,
            shippedOn: "2026-02-01",
            deliveryAddressId: destination.id,
            carrier: "Transportes de Prueba",
          }),
        ),
      );
      const id = draft.replace("/certificados/", "");
      expect(await issueCertificate(id, initialState, formData({}))).toMatchObject({ ok: true });
      issued.push({ id, clientId: client.id });
    }
  });
  beforeEach(() => signInAs("transaction"));

  it.each(["transaction", "query"] as const)(
    "PC-13 RF-07 / RF-01 a %s user reads the history with both issued certificates",
    async (role) => {
      signInAs(role);
      const { history } = await getReportData({});
      expect(history.map((row) => row.id).sort()).toEqual(issued.map((c) => c.id).sort());
      expect(history.every((row) => row.status === "issued")).toBe(true);
    },
  );

  it("PC-13 RF-07 the client filter returns only the certificate of that client", async () => {
    const { history } = await getReportData({ clientId: issued[1].clientId });
    expect(history.map((row) => row.id)).toEqual([issued[1].id]);
    expect(history[0].sapKey).toBe("PC0002");
  });

  it.each(["csv", "xlsx"] as const)(
    "PC-13 RF-07 / BR-AUD-01 a query user exports %s and the export is audited with that user",
    async (format) => {
      signInAs("query");
      const result = await exportCertificatesAction({}, format);
      expect(result).toMatchObject({ success: true, base64: format === "xlsx" });
      if (result.success) {
        expect(result.filename).toMatch(new RegExp(`^reporte-certificados-\\d{4}-\\d{2}-\\d{2}\\.${format}$`));
        if (format === "csv") for (const c of issued) expect(result.data).toContain(c.id);
      }

      const rows = (await testDb.select().from(auditLog).where(eq(auditLog.action, "export"))).filter(
        (row) => (row.detail as { format: string }).format === format,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: TEST_USERS.query.id, entity: "certificate", entityId: "history" });
      expect(rows[0].detail).toMatchObject({ format, rows: 2 });
    },
  );

  it("PC-13 RF-07 / RF-01 without a session the report redirects to /login", async () => {
    signOut();
    expect(await redirectOf(getReportData({}))).toBe("/login");
    expect(await redirectOf(exportCertificatesAction({}, "csv"))).toBe("/login");
  });
});
