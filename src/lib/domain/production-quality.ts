import { sequenceToNumber } from "./inspection-sequence";
import { PARAMETERS } from "./parameters";
import { evaluate, type LimitsByParameter } from "./quality";

/**
 * RF-07 · UC-08. Production quality: how good is the flour the mill makes, before any
 * client buys it. The certificate report only sees certified lots, so this one reads every
 * lot produced in the period instead.
 *
 * - Each lot counts once, through its LATEST inspection (D-27). Older ones are re-inspections.
 * - Only complete inspections (BR-INS-03) count as analysed, so a half-captured
 *   inspection never skews an average.
 * - Values are compared with the international limits (D-07), the plant-wide standard,
 *   because a lot is not tied to a client until a certificate is issued.
 * - A value equal to a limit is within spec, the same rule as `evaluate` (BR-CER-04).
 */

export interface ProductionLotRow {
  id: string;
  producedOn: string; // YYYY-MM-DD
}

export interface ProductionInspectionRow {
  id: number;
  lotId: string;
  sequence: string;
}

export interface ProductionResultRow {
  inspectionId: number;
  parameterCode: string;
  value: number;
}

export interface FactorStats {
  code: string;
  label: string;
  unit: string;
  lower: number | null;
  upper: number | null;
  samples: number;
  mean: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  outOfSpec: number;
  /** Percent of analysed lots within the limits, null without samples or limits. */
  inSpecRate: number | null;
  /**
   * Process capability index, min(upper − mean, mean − lower) / (3σ). Below 1 the process
   * cannot stay inside the limits, 1.33 or more is the usual industry target. Null with
   * fewer than two samples, no limits or no spread.
   */
  cpk: number | null;
}

export interface TrendPoint {
  lotId: string;
  producedOn: string;
  value: number;
  inSpec: boolean | null;
}

export interface ProductionQuality {
  totals: {
    lots: number;
    analysed: number;
    pending: number;
    inSpec: number;
    inSpecRate: number | null;
    reinspections: number;
  };
  factors: FactorStats[];
  trends: Record<string, TrendPoint[]>;
}

const round = (n: number, decimals = 3) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

const percent = (part: number, whole: number) => (whole === 0 ? null : round((part / whole) * 100, 1));

/** Sample standard deviation (n − 1), null with fewer than two values. */
export function sampleStdDev(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Cpk against a two-sided limit. See `FactorStats.cpk`. */
export function processCapability(mean: number, stdDev: number | null, lower: number, upper: number): number | null {
  if (stdDev === null || stdDev === 0) return null;
  return round(Math.min(upper - mean, mean - lower) / (3 * stdDev), 2);
}

export function buildProductionQuality(
  lots: readonly ProductionLotRow[],
  inspections: readonly ProductionInspectionRow[],
  results: readonly ProductionResultRow[],
  limits: LimitsByParameter,
): ProductionQuality {
  const lotById = new Map(lots.map((l) => [l.id, l]));

  // D-27: the latest inspection of each lot, by sequence (A < B < … < Z < AA)
  const latestByLot = new Map<string, ProductionInspectionRow>();
  let inspectionsOfLots = 0;
  for (const insp of inspections) {
    if (!lotById.has(insp.lotId)) continue;
    inspectionsOfLots++;
    const current = latestByLot.get(insp.lotId);
    if (!current || sequenceToNumber(insp.sequence) > sequenceToNumber(current.sequence)) {
      latestByLot.set(insp.lotId, insp);
    }
  }

  const valuesByInspection = new Map<number, Map<string, number>>();
  for (const r of results) {
    const own = valuesByInspection.get(r.inspectionId) ?? new Map<string, number>();
    own.set(r.parameterCode, r.value);
    valuesByInspection.set(r.inspectionId, own);
  }

  // BR-INS-03: analysed lots are the ones whose latest inspection has all ten factors
  const analysed: { lot: ProductionLotRow; values: Map<string, number> }[] = [];
  for (const [lotId, insp] of latestByLot) {
    const values = valuesByInspection.get(insp.id);
    if (values && PARAMETERS.every((p) => values.has(p.code))) {
      analysed.push({ lot: lotById.get(lotId)!, values });
    }
  }
  analysed.sort((a, b) => a.lot.producedOn.localeCompare(b.lot.producedOn) || a.lot.id.localeCompare(b.lot.id));

  const withinLimits = (code: string, value: number) => {
    const l = limits[code];
    return l ? evaluate(value, l).status === "within" : null;
  };

  const inSpec = analysed.filter(({ values }) =>
    PARAMETERS.every((p) => withinLimits(p.code, values.get(p.code)!) !== false),
  ).length;

  const trends: Record<string, TrendPoint[]> = {};
  const factors: FactorStats[] = PARAMETERS.map((p) => {
    const points = analysed.map(({ lot, values }) => {
      const value = values.get(p.code)!;
      return { lotId: lot.id, producedOn: lot.producedOn, value, inSpec: withinLimits(p.code, value) };
    });
    trends[p.code] = points;

    const values = points.map((pt) => pt.value);
    const l = limits[p.code] ?? null;
    const mean = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
    const stdDev = sampleStdDev(values);
    const outOfSpec = points.filter((pt) => pt.inSpec === false).length;

    return {
      code: p.code,
      label: p.label,
      unit: p.unit,
      lower: l?.lower ?? null,
      upper: l?.upper ?? null,
      samples: values.length,
      mean: mean === null ? null : round(mean),
      stdDev: stdDev === null ? null : round(stdDev),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      outOfSpec,
      inSpecRate: l ? percent(values.length - outOfSpec, values.length) : null,
      cpk: l && mean !== null ? processCapability(mean, stdDev, l.lower, l.upper) : null,
    };
  });

  return {
    totals: {
      lots: lots.length,
      analysed: analysed.length,
      pending: lots.length - analysed.length,
      inSpec,
      inSpecRate: percent(inSpec, analysed.length),
      reinspections: inspectionsOfLots - latestByLot.size,
    },
    factors,
    trends,
  };
}

/** The factor shown in the trend chart: a valid code from the URL, else the first factor. */
export function parseFactor(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return PARAMETERS.some((p) => p.code === value) ? (value as string) : PARAMETERS[0].code;
}
