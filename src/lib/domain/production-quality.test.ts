import { describe, expect, it } from "vitest";
import { PARAMETERS } from "./parameters";
import {
  buildProductionQuality,
  parseFactor,
  processCapability,
  sampleStdDev,
  type ProductionInspectionRow,
  type ProductionResultRow,
} from "./production-quality";
import type { LimitsByParameter } from "./quality";

// Every factor shares the range 0 to 100 so the numbers stay easy to read
const LIMITS: LimitsByParameter = Object.fromEntries(PARAMETERS.map((p) => [p.code, { lower: 0, upper: 100 }]));

/** All ten results for an inspection, with optional overrides per factor. */
const fullResults = (inspectionId: number, base: number, overrides: Record<string, number> = {}): ProductionResultRow[] =>
  PARAMETERS.map((p) => ({ inspectionId, parameterCode: p.code, value: overrides[p.code] ?? base }));

const insp = (id: number, lotId: string, sequence: string): ProductionInspectionRow => ({ id, lotId, sequence });

describe("sampleStdDev and processCapability", () => {
  it("uses n − 1 and needs two values", () => {
    expect(sampleStdDev([5])).toBeNull();
    expect(sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });

  it("Cpk is the distance to the nearest limit over three sigma", () => {
    expect(processCapability(50, 10, 0, 100)).toBe(1.67);
    expect(processCapability(90, 10, 0, 100)).toBe(0.33);
    expect(processCapability(50, 0, 0, 100)).toBeNull();
    expect(processCapability(50, null, 0, 100)).toBeNull();
  });
});

describe("RF-07 buildProductionQuality", () => {
  it("D-27 counts each lot once through its latest inspection and the rest as re-inspections", () => {
    const report = buildProductionQuality(
      [{ id: "L1", producedOn: "2026-11-01" }],
      [insp(1, "L1", "A"), insp(2, "L1", "B")],
      [...fullResults(1, 500), ...fullResults(2, 50)],
      LIMITS,
    );
    expect(report.totals).toMatchObject({ lots: 1, analysed: 1, reinspections: 1, inSpec: 1, inSpecRate: 100 });
    expect(report.trends.ALV_W).toEqual([{ lotId: "L1", producedOn: "2026-11-01", value: 50, inSpec: true }]);
  });

  it("orders sequences past Z correctly (AA is after Z)", () => {
    const report = buildProductionQuality(
      [{ id: "L1", producedOn: "2026-11-01" }],
      [insp(1, "L1", "AA"), insp(2, "L1", "Z")],
      [...fullResults(1, 10), ...fullResults(2, 90)],
      LIMITS,
    );
    expect(report.trends.ALV_W[0].value).toBe(10);
  });

  it("BR-INS-03 leaves out lots whose latest inspection is incomplete, even with an older complete one", () => {
    const partial = fullResults(2, 50).slice(0, 4);
    const report = buildProductionQuality(
      [
        { id: "L1", producedOn: "2026-11-01" },
        { id: "L2", producedOn: "2026-11-02" },
      ],
      [insp(1, "L1", "A"), insp(2, "L1", "B")],
      [...fullResults(1, 50), ...partial],
      LIMITS,
    );
    expect(report.totals).toMatchObject({ lots: 2, analysed: 0, pending: 2, inSpecRate: null });
    expect(report.factors.every((f) => f.samples === 0 && f.mean === null)).toBe(true);
  });

  it("a lot with one factor out of range is not in spec, and the factor counts it", () => {
    const report = buildProductionQuality(
      [
        { id: "L1", producedOn: "2026-11-01" },
        { id: "L2", producedOn: "2026-11-02" },
      ],
      [insp(1, "L1", "A"), insp(2, "L2", "A")],
      [...fullResults(1, 40), ...fullResults(2, 60, { FAR_ABS: 120 })],
      LIMITS,
    );
    expect(report.totals).toMatchObject({ analysed: 2, inSpec: 1, inSpecRate: 50 });

    const abs = report.factors.find((f) => f.code === "FAR_ABS")!;
    expect(abs).toMatchObject({ samples: 2, mean: 80, min: 40, max: 120, outOfSpec: 1, inSpecRate: 50 });
    expect(report.trends.FAR_ABS.map((p) => p.inSpec)).toEqual([true, false]);
  });

  it("BR-CER-04 a value equal to a limit is within spec", () => {
    const report = buildProductionQuality(
      [{ id: "L1", producedOn: "2026-11-01" }],
      [insp(1, "L1", "A")],
      fullResults(1, 100, { ALV_P: 0 }),
      LIMITS,
    );
    expect(report.totals.inSpec).toBe(1);
  });

  it("computes mean, spread and Cpk per factor, sorted by production date", () => {
    const report = buildProductionQuality(
      [
        { id: "L2", producedOn: "2026-11-02" },
        { id: "L1", producedOn: "2026-11-01" },
        { id: "L3", producedOn: "2026-11-03" },
      ],
      [insp(1, "L1", "A"), insp(2, "L2", "A"), insp(3, "L3", "A")],
      [...fullResults(1, 40), ...fullResults(2, 50), ...fullResults(3, 60)],
      LIMITS,
    );
    const w = report.factors.find((f) => f.code === "ALV_W")!;
    expect(w).toMatchObject({ mean: 50, stdDev: 10, cpk: 1.67, inSpecRate: 100 });
    expect(report.trends.ALV_W.map((p) => p.lotId)).toEqual(["L1", "L2", "L3"]);
  });

  it("a factor without international limits has no rate or Cpk and never fails a lot", () => {
    const partialLimits = { ...LIMITS };
    delete partialLimits.ALV_L;
    const report = buildProductionQuality(
      [{ id: "L1", producedOn: "2026-11-01" }],
      [insp(1, "L1", "A")],
      fullResults(1, 50, { ALV_L: 999 }),
      partialLimits,
    );
    const l = report.factors.find((f) => f.code === "ALV_L")!;
    expect(l).toMatchObject({ lower: null, upper: null, inSpecRate: null, cpk: null, outOfSpec: 0 });
    expect(report.totals.inSpec).toBe(1);
  });

  it("ignores inspections of lots outside the period", () => {
    const report = buildProductionQuality(
      [{ id: "L1", producedOn: "2026-11-01" }],
      [insp(1, "L1", "A"), insp(9, "OTHER", "A"), insp(10, "OTHER", "B")],
      fullResults(1, 50),
      LIMITS,
    );
    expect(report.totals.reinspections).toBe(0);
  });
});

describe("parseFactor", () => {
  it("accepts a known code and falls back to the first factor", () => {
    expect(parseFactor("FAR_STA")).toBe("FAR_STA");
    expect(parseFactor(["ALV_W", "x"])).toBe("ALV_W");
    expect(parseFactor("DROP TABLE")).toBe(PARAMETERS[0].code);
    expect(parseFactor(undefined)).toBe(PARAMETERS[0].code);
  });
});
