import { describe, expect, it, vi } from "vitest";
import { buildCertificateLines } from "@/lib/domain/certificate";
import { PARAMETERS } from "@/lib/domain/parameters";

vi.mock("server-only", () => ({}));

const { renderCertificatePdf } = await import("./certificate-pdf");

const limits = Object.fromEntries(PARAMETERS.map((p) => [p.code, { lower: 10, upper: 20 }]));
const built = buildCertificateLines(
  { ...Object.fromEntries(PARAMETERS.map((p) => [p.code, 15])), ALV_W: 25 },
  limits,
  null,
);
if (!built.ok) throw new Error("fixture lines must build");

const data = {
  id: "CER-2026-000001",
  status: "issued" as const,
  client: {
    sapKey: "C000123",
    businessName: "Panificadora Ejemplo",
    rfc: "PEJ010101AB1",
    fiscalAddress: "Calle Fiscal 1, Monterrey",
    contactName: "Compras",
  },
  deliveryAddress: "Av. Ejemplo 100, Monterrey",
  carrier: "Transportes Demo",
  signatureHash: "a".repeat(64),
  cancellation: null,
  lot: { id: "L-2026-0001", product: "Harina panificable", producedOn: "2026-11-01", expiresOn: "2027-05-01" },
  inspection: { sequence: "B", inspectedAt: new Date("2026-11-02T15:00:00Z") },
  purchaseOrder: "OC-778",
  invoiceNumber: "F-100",
  quantityRequested: 1500,
  quantityDelivered: 1500,
  shippedOn: "2026-11-05",
  issuedAt: new Date("2026-11-04T18:00:00Z"),
  issuer: { name: "Laboratorio Demo", employeeId: "E0001" },
  requiresSignature: true,
  lines: built.lines,
};

describe("renderCertificatePdf (component)", () => {
  it("UC-05 renders an issued certificate with signature to a PDF file", async () => {
    const pdf = await renderCertificatePdf(data);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(2_000);
  });

  it("renders a draft without issuer data", async () => {
    const pdf = await renderCertificatePdf({ ...data, status: "draft", issuedAt: null, issuer: null, signatureHash: null });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("D-25 renders a cancelled certificate with its reason", async () => {
    const pdf = await renderCertificatePdf({
      ...data,
      status: "cancelled",
      cancellation: { at: new Date("2026-11-06T10:00:00Z"), reason: "Factura equivocada", by: "Laboratorio Demo" },
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
