import { describe, expect, it } from "vitest";
import { parseSetPasswordInput } from "./set-password-input";

describe("parseSetPasswordInput (RF-01)", () => {
  it("RF-01 rejects a 15 character password", () => {
    expect(parseSetPasswordInput("a@demo.test", "x".repeat(15))).toBeNull();
  });
  it("RF-01 accepts a 16 character password and lowercases the email", () => {
    expect(parseSetPasswordInput(" A@Demo.test ", "x".repeat(16))).toEqual({
      email: "a@demo.test",
      password: "x".repeat(16),
    });
  });
  it("RF-01 rejects a password over 128 characters", () => {
    expect(parseSetPasswordInput("a@demo.test", "x".repeat(129))).toBeNull();
  });
  it("RF-01 rejects a bad email", () => {
    expect(parseSetPasswordInput("not-an-email", "x".repeat(16))).toBeNull();
  });
  it("RF-01 rejects missing values", () => {
    expect(parseSetPasswordInput(undefined, undefined)).toBeNull();
    expect(parseSetPasswordInput("", "")).toBeNull();
  });
});
