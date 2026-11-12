import { describe, expect, it } from "vitest";
import { fieldErrorsFrom, pgError } from "./action-state";

describe("fieldErrorsFrom", () => {
  it("keeps the first message per field", () => {
    expect(
      fieldErrorsFrom([
        { path: ["brand"], message: "a" },
        { path: ["brand"], message: "b" },
        { path: [], message: "c" },
      ]),
    ).toEqual({ brand: "a", form: "c" });
  });
});

describe("pgError", () => {
  it("reads the code from the error or its cause", () => {
    expect(pgError({ code: "23505", constraint: "equipment_pkey" })).toEqual({
      code: "23505",
      constraint: "equipment_pkey",
    });
    expect(pgError({ message: "x", cause: { code: "23505" } }).code).toBe("23505");
  });

  it("returns nothing for unrelated errors", () => {
    expect(pgError(new Error("boom"))).toEqual({});
    expect(pgError(null)).toEqual({});
  });
});
