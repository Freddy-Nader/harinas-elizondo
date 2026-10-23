import { describe, expect, it } from "vitest";
import { nextSequence, numberToSequence, sequenceToNumber } from "./inspection-sequence";

describe("inspection sequence", () => {
  it("starts at A", () => {
    expect(nextSequence(null)).toBe("A");
  });

  it("walks the alphabet", () => {
    expect(nextSequence("A")).toBe("B");
    expect(nextSequence("Y")).toBe("Z");
  });

  it("continues after Z with two letters (inspection 27)", () => {
    expect(nextSequence("Z")).toBe("AA");
    expect(sequenceToNumber("AA")).toBe(27);
    expect(nextSequence("AZ")).toBe("BA");
    expect(nextSequence("ZZ")).toBe("AAA");
  });

  it("round-trips", () => {
    for (let n = 1; n <= 1000; n++) expect(sequenceToNumber(numberToSequence(n))).toBe(n);
  });

  it("rejects bad input and overflow", () => {
    expect(() => sequenceToNumber("a")).toThrow();
    expect(() => sequenceToNumber("")).toThrow();
    expect(() => nextSequence("ZZZ")).toThrow(/overflow/);
  });
});
