import { describe, expect, it } from "vitest";
import {
  buildCertificateLines,
  cancelCheck,
  certificateHash,
  certificateInputSchema,
  inspectionProblem,
  countDeviations,
  deliveryRecipients,
  formatCertificateId,
  isCertificateId,
  issueBlockers,
  linesFromSnapshot,
  nextCertificateId,
  pdfSafeText,
  pickCertifiableInspection,
  type IssueCheckInput,
} from "./certificate";
import { PARAMETERS } from "./parameters";

const allLimits = Object.fromEntries(PARAMETERS.map((p) => [p.code, { lower: 10, upper: 20 }]));
const allWithin = Object.fromEntries(PARAMETERS.map((p) => [p.code, 15]));

describe("certificate id (D-17)", () => {
  it("D-17 formats CER-YYYY-NNNNNN", () => {
    expect(formatCertificateId(2026, 123)).toBe("CER-2026-000123");
    expect(isCertificateId("CER-2026-000123")).toBe(true);
    expect(isCertificateId("CER-26-1")).toBe(false);
  });

  it("D-17 starts at 1 and continues the counter within the year", () => {
    expect(nextCertificateId(null, 2026)).toBe("CER-2026-000001");
    expect(nextCertificateId("CER-2026-000041", 2026)).toBe("CER-2026-000042");
  });

  it("D-17 restarts the counter in a new year", () => {
    expect(nextCertificateId("CER-2025-000900", 2026)).toBe("CER-2026-000001");
  });

  it("refuses a counter past six digits", () => {
    expect(() => nextCertificateId("CER-2026-999999", 2026)).toThrow(RangeError);
  });
});

describe("pickCertifiableInspection (BR-CER-01)", () => {
  it("BR-CER-01 takes the latest inspection when it is complete", () => {
    const picked = pickCertifiableInspection([
      { id: 2, sequence: "B", complete: true },
      { id: 1, sequence: "A", complete: true },
    ]);
    expect(picked).toMatchObject({ ok: true, inspection: { id: 2 } });
  });

  it("BR-CER-01 blocks when the latest is incomplete instead of falling back to an older one", () => {
    const picked = pickCertifiableInspection([
      { id: 1, sequence: "A", complete: true },
      { id: 2, sequence: "B", complete: false },
    ]);
    expect(picked).toMatchObject({ ok: false, reason: "incomplete", inspection: { sequence: "B" } });
    expect(inspectionProblem(picked)).toContain("(B) está incompleta");
  });

  it("BR-CER-01 orders AA after Z", () => {
    const picked = pickCertifiableInspection([
      { id: 26, sequence: "Z", complete: true },
      { id: 27, sequence: "AA", complete: true },
    ]);
    expect(picked).toMatchObject({ ok: true, inspection: { sequence: "AA" } });
  });

  it("reports a lot without inspections", () => {
    const picked = pickCertifiableInspection([]);
    expect(picked).toEqual({ ok: false, reason: "none" });
    expect(inspectionProblem(picked)).toBe("El lote no tiene inspecciones registradas.");
  });
});

describe("certificateHash (D-26)", () => {
  const base = {
    id: "CER-2026-000001",
    clientSapKey: "C0001",
    lotId: "L-1",
    inspectionSequence: "B",
    purchaseOrder: "OC-1",
    invoiceNumber: "F-1",
    quantityRequested: 1000,
    quantityDelivered: 1000,
    shippedOn: "2026-11-05",
    deliveryAddress: "Av. Uno 1",
    carrier: "Transportes Demo",
    issuedAt: new Date("2026-11-04T18:00:00Z"),
    issuerEmployeeId: "E0001",
    lines: [
      { parameterCode: "ALV_W", value: 300, lowerLimit: 250, upperLimit: 350, deviation: 0 },
      { parameterCode: "ALV_P", value: 70, lowerLimit: 60, upperLimit: 90, deviation: 0 },
    ],
  };

  it("D-26 is a 64-char hex SHA-256 and does not depend on line order", () => {
    const hash = certificateHash(base);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(certificateHash({ ...base, lines: [...base.lines].reverse() })).toBe(hash);
  });

  it("D-26 changes when any stated value changes", () => {
    const hash = certificateHash(base);
    expect(certificateHash({ ...base, invoiceNumber: "F-2" })).not.toBe(hash);
    expect(
      certificateHash({ ...base, lines: [{ ...base.lines[0], value: 301 }, base.lines[1]] }),
    ).not.toBe(hash);
  });
});

describe("cancelCheck (D-25)", () => {
  it("D-25 cancels issued or sent certificates with a reason", () => {
    expect(cancelCheck("issued", "  Factura equivocada ")).toEqual({ ok: true, reason: "Factura equivocada" });
    expect(cancelCheck("sent", "Pedido cancelado").ok).toBe(true);
  });

  it("refuses drafts, already cancelled certificates and a missing reason", () => {
    expect(cancelCheck("draft", "x").ok).toBe(false);
    expect(cancelCheck("cancelled", "x").ok).toBe(false);
    expect(cancelCheck("issued", "   ").ok).toBe(false);
  });
});

describe("buildCertificateLines", () => {
  it("builds ten lines in catalog order when everything is present", () => {
    const r = buildCertificateLines(allWithin, allLimits, null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lines.map((l) => l.parameterCode)).toEqual(PARAMETERS.map((p) => p.code));
      expect(countDeviations(r.lines)).toBe(0);
    }
  });

  it("BR-CER-04 shows out-of-range values as signed deviation without blocking", () => {
    const r = buildCertificateLines({ ...allWithin, ALV_W: 25, FAR_ABS: 8 }, allLimits, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.lines.find((l) => l.parameterCode === "ALV_W")!;
    const abs = r.lines.find((l) => l.parameterCode === "FAR_ABS")!;
    expect(w).toMatchObject({ status: "above", deviation: 5 });
    expect(abs).toMatchObject({ status: "below", deviation: -2 });
    expect(countDeviations(r.lines)).toBe(2);
  });

  it("BR-REF-01 uses the client's limits where it has them and international for the rest", () => {
    const r = buildCertificateLines({ ...allWithin, ALV_W: 25 }, allLimits, { ALV_W: { lower: 20, upper: 30 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.lines.find((l) => l.parameterCode === "ALV_W")!;
    expect(w).toMatchObject({ lowerLimit: 20, upperLimit: 30, deviation: 0, source: "client" });
    expect(r.lines.find((l) => l.parameterCode === "ALV_P")?.source).toBe("international");
  });

  it("BR-CER-02 blocks when a machine's results are missing", () => {
    const farinographOnly = Object.fromEntries(
      PARAMETERS.filter((p) => p.equipmentType === "farinograph").map((p) => [p.code, 15]),
    );
    const r = buildCertificateLines(farinographOnly, allLimits, null);
    expect(r).toMatchObject({ ok: false, missingResults: ["ALV_P", "ALV_L", "ALV_W", "ALV_PL", "ALV_IE"] });
  });

  it("blocks when a parameter has no reference values at all", () => {
    const partial = Object.fromEntries(Object.entries(allLimits).filter(([code]) => code !== "FAR_ARR"));
    const r = buildCertificateLines(allWithin, partial, null);
    expect(r).toMatchObject({ ok: false, missingResults: [], missingLimits: ["FAR_ARR"] });
  });
});

describe("linesFromSnapshot (D-10)", () => {
  it("D-10 rebuilds lines from stored numbers and derives the status from the deviation", () => {
    const lines = linesFromSnapshot([
      { parameterCode: "FAR_ABS", value: 8, lowerLimit: 10, upperLimit: 20, deviation: -2 },
      { parameterCode: "ALV_P", value: 15, lowerLimit: 10, upperLimit: 20, deviation: 0 },
    ]);
    expect(lines.map((l) => [l.parameterCode, l.status])).toEqual([
      ["ALV_P", "within"],
      ["FAR_ABS", "below"],
    ]);
  });
});

describe("certificateInputSchema", () => {
  const base = {
    clientId: "8b9c1f0e-2a4b-4c6d-8e0f-1a2b3c4d5e6f",
    lotId: "L-2026-0001",
    purchaseOrder: " OC-778 ",
    quantityRequested: "1500,5",
    quantityDelivered: "",
    invoiceNumber: "",
    shippedOn: "",
    deliveryAddressId: "",
    carrier: "",
    requiresSignature: false,
  };

  it("UC-05 accepts a draft with only the order data", () => {
    const r = certificateInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toMatchObject({
        purchaseOrder: "OC-778",
        quantityRequested: 1500.5,
        quantityDelivered: null,
        invoiceNumber: null,
        shippedOn: null,
      });
    }
  });

  it("requires the purchase order and a client", () => {
    expect(certificateInputSchema.safeParse({ ...base, purchaseOrder: "  " }).success).toBe(false);
    expect(certificateInputSchema.safeParse({ ...base, clientId: "" }).success).toBe(false);
  });

  it("rejects text, zero and negative quantities", () => {
    for (const quantityDelivered of ["abc", "0", "-5"]) {
      expect(certificateInputSchema.safeParse({ ...base, quantityDelivered }).success).toBe(false);
    }
  });
});

describe("issueBlockers", () => {
  const ready: IssueCheckInput = {
    status: "draft",
    purchaseOrder: "OC-1",
    invoiceNumber: "F-100",
    quantityDelivered: 1000,
    shippedOn: "2026-11-05",
    deliveryAddress: "Av. Uno 1, Monterrey",
    carrier: "Transportes Demo",
    client: { status: "active" },
    lot: { producedOn: "2026-11-01", expiresOn: "2027-05-01" },
    inspectionProblem: null,
  };

  it("lets a complete draft be issued", () => {
    expect(issueBlockers(ready)).toEqual([]);
  });

  it("BR-CER-05 · D-24 requires invoice and shipping data before closing", () => {
    const blockers = issueBlockers({
      ...ready,
      invoiceNumber: null,
      quantityDelivered: null,
      shippedOn: null,
      deliveryAddress: null,
      carrier: null,
    });
    expect(blockers).toEqual([
      "Falta el número de factura.",
      "Falta la cantidad entregada.",
      "Falta la fecha de envío.",
      "Falta la dirección de entrega.",
      "Falta el transportista.",
    ]);
  });

  it("BR-CER-01 · BR-CER-02 blocks while the latest inspection is incomplete", () => {
    expect(issueBlockers({ ...ready, inspectionProblem: "incompleta" })).toEqual(["incompleta"]);
  });

  it("blocks inactive clients and shipping outside the lot's life", () => {
    expect(issueBlockers({ ...ready, client: { status: "inactive" } })).toContain("El cliente está inactivo.");
    expect(issueBlockers({ ...ready, shippedOn: "2027-06-01" })).toContain(
      "La fecha de envío es posterior a la caducidad del lote.",
    );
    expect(issueBlockers({ ...ready, shippedOn: "2026-10-01" })).toContain(
      "La fecha de envío es anterior a la producción del lote.",
    );
  });

  it("cannot issue twice", () => {
    expect(issueBlockers({ ...ready, status: "issued" })).toContain("El certificado ya fue emitido.");
  });
});

describe("deliveryRecipients (RF-06)", () => {
  it("RF-06 sends to the client contact and the warehouse", () => {
    expect(deliveryRecipients("compras@cliente.test", "almacen@demo.test")).toEqual([
      "compras@cliente.test",
      "almacen@demo.test",
    ]);
  });

  it("falls back to the warehouse only and removes duplicates", () => {
    expect(deliveryRecipients(null, "almacen@demo.test")).toEqual(["almacen@demo.test"]);
    expect(deliveryRecipients("Almacen@demo.test", "almacen@demo.test")).toEqual(["almacen@demo.test"]);
  });
});

describe("pdfSafeText", () => {
  it("spells out unit glyphs the PDF base font cannot draw", () => {
    expect(pdfSafeText("mm H₂O")).toBe("mm H2O");
    expect(pdfSafeText("10⁻⁴ J")).toBe("10^-4 J");
    expect(pdfSafeText("Absorción de agua")).toBe("Absorción de agua");
  });
});
