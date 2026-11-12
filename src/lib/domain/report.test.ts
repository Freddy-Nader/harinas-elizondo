import { describe, expect, it } from "vitest";
import {
  buildReport,
  filtersToParams,
  isIsoDate,
  issuedAtBounds,
  paginate,
  parseReportFilters,
  plantToday,
  presetRange,
  statusesFor,
  type CertificateRow,
  type LineRow,
} from "./report";

const TODAY = "2026-11-11";
const CLIENT = "11111111-1111-4111-8111-111111111111";

const cert = (id: string, overrides: Partial<CertificateRow> = {}): CertificateRow => ({
  id,
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
  ...overrides,
});

const line = (certificateId: string, value: number, overrides: Partial<LineRow> = {}): LineRow => ({
  certificateId,
  parameterCode: "HUM",
  parameterLabel: "Humedad",
  unit: "%",
  value,
  lowerLimit: 10,
  upperLimit: 14,
  ...overrides,
});

describe("RF-07 report filters from the URL", () => {
  it("RF-07 period presets cover the current month, quarter and year", () => {
    expect(presetRange("month", TODAY)).toEqual({ startDate: "2026-11-01", endDate: "2026-11-30" });
    expect(presetRange("quarter", TODAY)).toEqual({ startDate: "2026-10-01", endDate: "2026-12-31" });
    expect(presetRange("year", TODAY)).toEqual({ startDate: "2026-01-01", endDate: "2026-12-31" });
    expect(presetRange("month", "2028-02-10").endDate).toBe("2028-02-29");
  });

  it("RF-07 a preset wins over typed dates", () => {
    const f = parseReportFilters({ period: "month", startDate: "2020-01-01" }, TODAY);
    expect(f).toMatchObject({ period: "month", startDate: "2026-11-01", endDate: "2026-11-30" });
  });

  it("RF-07 drops invalid values before they reach the database", () => {
    const f = parseReportFilters(
      { startDate: "2026-02-31", endDate: "x", clientId: "1; drop table", status: "draft", page: "-2", period: "week" },
      TODAY,
    );
    expect(f).toEqual({});
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
  });

  it("RF-07 swaps a reversed range and keeps client, status and page", () => {
    const f = parseReportFilters(
      { startDate: "2026-11-30", endDate: "2026-11-01", clientId: CLIENT, status: "cancelled", page: "3" },
      TODAY,
    );
    expect(f).toEqual({ startDate: "2026-11-01", endDate: "2026-11-30", clientId: CLIENT, status: "cancelled", page: 3 });
  });

  it("RF-07 filters survive a round trip through the URL", () => {
    for (const raw of [{ period: "quarter", status: "sent" }, { startDate: "2026-01-05", clientId: CLIENT, page: "2" }]) {
      const f = parseReportFilters(raw, TODAY);
      expect(parseReportFilters(filtersToParams(f), TODAY)).toEqual(f);
    }
  });

  it("RF-07 the range applies to issuedAt in plant time (UTC-6), end day included", () => {
    const { start, end } = issuedAtBounds({ startDate: "2026-11-01", endDate: "2026-11-30" });
    expect(start?.toISOString()).toBe("2026-11-01T06:00:00.000Z");
    expect(end?.toISOString()).toBe("2026-12-01T05:59:59.999Z");
    expect(plantToday(new Date("2026-11-12T03:00:00Z"))).toBe("2026-11-11");
  });

  it("D-25 drafts are never read, the status filter narrows to one state", () => {
    expect(statusesFor({})).toEqual(["issued", "sent", "cancelled"]);
    expect(statusesFor({ status: "sent" })).toEqual(["sent"]);
  });
});

describe("RF-07 report statistics", () => {
  it("BR-CER-04 a value equal to a limit is within range", () => {
    const report = buildReport([cert("C1")], [line("C1", 14), line("C1", 10, { parameterCode: "PRO" })]);
    expect(report.stats.certificatesWithDeviation).toBe(0);
    expect(report.stats.complianceRate).toBe(100);
  });

  it("RF-07 counts deviations, incidences and the Pareto per parameter", () => {
    const report = buildReport(
      [cert("C1"), cert("C2"), cert("C3")],
      [
        line("C1", 15),
        line("C1", 50, { parameterCode: "W", parameterLabel: "Fuerza W", upperLimit: 40 }),
        line("C2", 9),
      ],
    );
    expect(report.stats).toMatchObject({ totalCertificates: 3, certificatesWithDeviation: 2, totalIncidences: 3 });
    expect(report.stats.complianceRate).toBe(33.3);
    expect(report.byParameter[0]).toMatchObject({ code: "HUM", count: 2, percent: 66.7, cumulativePercent: 66.7 });
    expect(report.deviations.find((d) => d.certificateId === "C2")).toMatchObject({ direction: "bajo", outBy: 1 });
  });

  it("D-25 cancelled certificates stay in the history but never count as valid", () => {
    const report = buildReport(
      [cert("C1"), cert("C2", { status: "cancelled", cancellationReason: "Error de captura" })],
      [line("C2", 20)],
    );
    expect(report.history.map((h) => h.id)).toEqual(["C1", "C2"]);
    expect(report.history[1].deviationParams).toEqual(["Humedad"]);
    expect(report.stats).toMatchObject({ totalCertificates: 1, cancelledCertificates: 1, certificatesWithDeviation: 0 });
    expect(report.deviations).toEqual([]);
    expect(report.monthly).toEqual([expect.objectContaining({ key: "2026-11", total: 1 })]);
  });

  it("RF-07 groups certificates by month of issue in plant time", () => {
    // 2026-11-01T03:00Z is still October 31 at the plant
    const report = buildReport([cert("C1", { issuedAt: new Date("2026-11-01T03:00:00Z") }), cert("C2")], []);
    expect(report.monthly.map((m) => [m.key, m.total])).toEqual([
      ["2026-10", 1],
      ["2026-11", 1],
    ]);
  });

  it("RF-06 sums failed delivery attempts per certificate", () => {
    const report = buildReport([cert("C1"), cert("C2")], [], [{ certificateId: "C1", failed: 2 }]);
    expect(report.history[0].failedDeliveries).toBe(2);
    expect(report.stats.failedDeliveries).toBe(2);
  });

  it("RF-07 paginates the history and clamps a page past the end", () => {
    const rows = Array.from({ length: 45 }, (_, i) => i);
    expect(paginate(rows, 3)).toMatchObject({ page: 3, pageCount: 3, total: 45, items: [40, 41, 42, 43, 44] });
    expect(paginate(rows, 9).page).toBe(3);
    expect(paginate([], 1)).toMatchObject({ page: 1, pageCount: 1, items: [] });
  });
});
