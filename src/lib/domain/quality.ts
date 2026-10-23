import { PARAMETERS } from "./parameters";

/**
 * Pure quality rules shared by inspections and certificates.
 * See docs/llm/requirements.md for the BR-* ids referenced below.
 */

export type Limits = { lower: number; upper: number };
export type LimitsByParameter = Record<string, Limits>;

/**
 * BR-REF-01: a client's own reference values win; any parameter the client
 * did not define falls back to the international values.
 */
export function resolveReferenceValues(
  international: LimitsByParameter,
  client: LimitsByParameter | null,
): LimitsByParameter {
  return { ...international, ...(client ?? {}) };
}

export type Evaluation = {
  status: "below" | "within" | "above";
  /** Signed distance to the nearest limit, 0 when within range. */
  deviation: number;
};

/** BR-CER-04: out-of-range values do not block the certificate, they show as deviation. */
export function evaluate(value: number, { lower, upper }: Limits): Evaluation {
  if (value < lower) return { status: "below", deviation: round(value - lower) };
  if (value > upper) return { status: "above", deviation: round(value - upper) };
  return { status: "within", deviation: 0 };
}

/**
 * BR-INS-03 / BR-CER-02: an inspection is usable for a certificate only when it
 * has a value for every mandatory parameter of BOTH equipment types.
 * Returns the codes that are missing (empty array means complete).
 */
export function missingParameters(results: Record<string, number | null | undefined>): string[] {
  return PARAMETERS.filter((p) => {
    const v = results[p.code];
    return v === null || v === undefined || Number.isNaN(v);
  }).map((p) => p.code);
}

/** BR-EQP-03: equipment without reference values for all its parameters is blocked. */
export function missingReferenceValues(
  parameterCodes: readonly string[],
  limits: LimitsByParameter,
): string[] {
  return parameterCodes.filter((code) => !limits[code]);
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
