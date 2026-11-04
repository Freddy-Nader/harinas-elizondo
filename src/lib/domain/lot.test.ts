import { describe, expect, it } from "vitest";
import { lotCodeSchema, lotDataSchema, parseResults, startInspection } from "./lot";

describe("lotCodeSchema", () => {
  it("UC-03 stores the code trimmed and uppercase", () => {
    expect(lotCodeSchema.parse("  l-2026-0001 ")).toBe("L-2026-0001");
  });

  it("rejects blank, long or odd characters", () => {
    expect(lotCodeSchema.safeParse("").success).toBe(false);
    expect(lotCodeSchema.safeParse("A".repeat(21)).success).toBe(false);
    expect(lotCodeSchema.safeParse("LOTE 1").success).toBe(false);
    expect(lotCodeSchema.safeParse("-L1").success).toBe(false);
  });
});

describe("lotDataSchema", () => {
  const base = { product: "Harina panificable", producedOn: "2026-11-01", expiresOn: "2027-05-01" };

  it("accepts a valid lot", () => {
    expect(lotDataSchema.safeParse(base).success).toBe(true);
  });

  it("requires expiry after production", () => {
    expect(lotDataSchema.safeParse({ ...base, expiresOn: "2026-11-01" }).success).toBe(false);
  });

  it("requires both dates and the product", () => {
    expect(lotDataSchema.safeParse({ ...base, product: " " }).success).toBe(false);
    expect(lotDataSchema.safeParse({ ...base, producedOn: "" }).success).toBe(false);
  });
});

describe("startInspection", () => {
  it("BR-INS-02 lets the first inspection start without a reason", () => {
    expect(startInspection(null, "")).toEqual({ ok: true, reinspection: false, reason: null });
  });

  it("asks to finish an incomplete inspection first", () => {
    const r = startInspection({ sequence: "A", complete: false, locked: false }, "falla");
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toContain("inspección A");
  });

  it("BR-INS-04 · D-15 needs the equipment-failure reason after a complete one", () => {
    const latest = { sequence: "B", complete: true, locked: false };
    expect(startInspection(latest, "  ").ok).toBe(false);
    expect(startInspection(latest, " Falla en el alveógrafo ")).toEqual({
      ok: true,
      reinspection: true,
      reason: "Falla en el alveógrafo",
    });
  });
});

describe("parseResults", () => {
  const empty = { equipment: {}, values: {} };

  it("RF-04 allows saving with nothing captured yet", () => {
    const r = parseResults(empty);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.cleared).toHaveLength(10);
  });

  it("parses decimals with comma and keeps only the machines in use", () => {
    const r = parseResults({
      equipment: { alveograph: "ABCDEFGH", farinograph: "JKMNPQRS" },
      values: { ALV_W: "300", ALV_PL: "0,75" },
    });
    expect(r).toMatchObject({
      ok: true,
      data: { values: { ALV_W: 300, ALV_PL: 0.75 }, equipment: { alveograph: "ABCDEFGH" } },
    });
  });

  it("needs the equipment of a machine that has values", () => {
    const r = parseResults({ equipment: {}, values: { FAR_ABS: "60" } });
    expect(r).toEqual({ ok: false, errors: { equipment_farinograph: "Elige el equipo con que se midió." } });
  });

  it("rejects text and negative values per parameter", () => {
    const r = parseResults({ equipment: { alveograph: "X" }, values: { ALV_P: "abc", ALV_L: "-3" } });
    expect(r).toMatchObject({ ok: false, errors: { ALV_P: "Escribe un número.", ALV_L: "No puede ser negativo." } });
  });
});
