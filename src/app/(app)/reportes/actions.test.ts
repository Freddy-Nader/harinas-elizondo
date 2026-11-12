import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getExportableCertificateData: vi.fn(),
  recordAudit: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  requireRole: mocks.requireRole,
  ForbiddenError: class ForbiddenError extends Error {},
}));
vi.mock("@/lib/audit", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("./data", () => ({ getExportableCertificateData: mocks.getExportableCertificateData }));

import { ForbiddenError } from "@/lib/session";
import { exportCertificatesAction } from "./actions";

const user = { id: "u1", name: "Usuario Demo", email: "demo@example.test", role: "query", employeeId: "E-1" };
const CLIENT = "11111111-1111-4111-8111-111111111111";
const row = {
  id: "CER-2026-000001",
  status: "issued",
  issuedAt: new Date("2026-11-05T18:30:00Z"),
  clientName: "Panadería Demo",
  sapKey: "PRUEBA01",
  rfc: null,
  lotId: "L-PRUEBA-001",
  inspectionSequence: "A",
  purchaseOrder: "OC-1",
  invoiceNumber: null,
  issuedByName: null,
  cancellationReason: null,
  deviationParams: [],
  failedDeliveries: 0,
};

describe("RF-01 / RF-07 report export authorization and audit", () => {
  beforeEach(() => vi.resetAllMocks());

  it("RF-01 asks for both report roles and keeps the /login redirect without a session", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(exportCertificatesAction({}, "csv")).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mocks.requireRole).toHaveBeenCalledWith("transaction", "query");
    expect(mocks.getExportableCertificateData).not.toHaveBeenCalled();
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it("RF-01 a role without access gets a readable error and no file", async () => {
    mocks.requireRole.mockRejectedValue(new ForbiddenError());
    const result = await exportCertificatesAction({}, "xlsx");
    expect(result).toMatchObject({ success: false });
    expect(mocks.getExportableCertificateData).not.toHaveBeenCalled();
  });

  it("RF-07 validates the filters sent by the browser again", async () => {
    mocks.requireRole.mockResolvedValue(user);
    mocks.getExportableCertificateData.mockResolvedValue([row]);
    await exportCertificatesAction({ startDate: "2026-02-31", clientId: "' or 1=1", status: "sent" }, "csv");
    expect(mocks.getExportableCertificateData).toHaveBeenCalledWith({ status: "sent" });
  });

  it("BR-AUD-01 every export writes an audit row with the format and the filters", async () => {
    mocks.requireRole.mockResolvedValue(user);
    mocks.getExportableCertificateData.mockResolvedValue([row]);
    const result = await exportCertificatesAction({ startDate: "2026-11-01", clientId: CLIENT }, "xlsx");
    expect(result).toMatchObject({ success: true, base64: true });
    expect(mocks.recordAudit).toHaveBeenCalledWith({
      user,
      action: "export",
      entity: "certificate",
      entityId: "history",
      detail: {
        format: "xlsx",
        rows: 1,
        filters: { startDate: "2026-11-01", endDate: null, period: null, clientId: CLIENT, status: null },
      },
    });
  });

  it("D-19 CSV comes back as text with a BOM, xlsx as a zip in base64", async () => {
    mocks.requireRole.mockResolvedValue(user);
    mocks.getExportableCertificateData.mockResolvedValue([row]);
    const csv = await exportCertificatesAction({}, "csv");
    expect(csv).toMatchObject({ success: true, base64: false, mimeType: "text/csv;charset=utf-8" });
    if (csv.success) expect(csv.data.startsWith("﻿")).toBe(true);
    const xlsx = await exportCertificatesAction({}, "xlsx");
    if (xlsx.success) expect(Buffer.from(xlsx.data, "base64").subarray(0, 2).toString()).toBe("PK");
  });

  it("RF-07 an empty result is reported and not audited", async () => {
    mocks.requireRole.mockResolvedValue(user);
    mocks.getExportableCertificateData.mockResolvedValue([]);
    expect(await exportCertificatesAction({}, "csv")).toMatchObject({ success: false });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });
});
