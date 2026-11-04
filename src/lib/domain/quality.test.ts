import { describe, expect, it } from "vitest";
import { PARAMETERS, parametersFor } from "./parameters";
import {
  evaluate,
  missingParameters,
  missingReferenceValues,
  resolveReferenceValues,
} from "./quality";

describe("resolveReferenceValues", () => {
  const international = { ALV_W: { lower: 250, upper: 350 }, ALV_P: { lower: 60, upper: 90 } };

  it("uses international values when the client has none", () => {
    expect(resolveReferenceValues(international, null)).toEqual(international);
  });

  it("lets client values override only the parameters they define", () => {
    const resolved = resolveReferenceValues(international, { ALV_W: { lower: 300, upper: 320 } });
    expect(resolved.ALV_W).toEqual({ lower: 300, upper: 320 });
    expect(resolved.ALV_P).toEqual({ lower: 60, upper: 90 });
  });
});

describe("evaluate", () => {
  const limits = { lower: 10, upper: 20 };

  it("is within range at both limits", () => {
    expect(evaluate(10, limits)).toEqual({ status: "within", deviation: 0 });
    expect(evaluate(20, limits)).toEqual({ status: "within", deviation: 0 });
  });

  it("reports signed deviation outside the range", () => {
    expect(evaluate(8.5, limits)).toEqual({ status: "below", deviation: -1.5 });
    expect(evaluate(20.25, limits)).toEqual({ status: "above", deviation: 0.25 });
  });
});

describe("missingParameters", () => {
  it("requires all ten parameters from both equipment types", () => {
    const complete = Object.fromEntries(PARAMETERS.map((p) => [p.code, 1]));
    expect(missingParameters(complete)).toEqual([]);

    const onlyAlveograph = Object.fromEntries(parametersFor("alveograph").map((p) => [p.code, 1]));
    expect(missingParameters(onlyAlveograph)).toEqual(
      parametersFor("farinograph").map((p) => p.code),
    );
  });

  it("treats null and NaN as missing", () => {
    const results = Object.fromEntries(PARAMETERS.map((p) => [p.code, 1]));
    expect(missingParameters({ ...results, ALV_P: null, FAR_ABS: Number.NaN })).toEqual([
      "ALV_P",
      "FAR_ABS",
    ]);
  });
});

describe("missingReferenceValues", () => {
  it("lists parameters with no limits", () => {
    expect(missingReferenceValues(["ALV_P", "ALV_L"], { ALV_P: { lower: 1, upper: 2 } })).toEqual([
      "ALV_L",
    ]);
  });
});
