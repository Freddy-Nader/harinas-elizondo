import { describe, expect, it } from "vitest";
import { canAccess, canMutate, isRole, safeNextPath } from "./permissions";

describe("canAccess", () => {
  it("RF-01 lets both roles open the panel", () => {
    expect(canAccess("transaction", "/panel")).toBe(true);
    expect(canAccess("query", "/panel")).toBe(true);
  });

  it("RF-01 lets transaction users open every module", () => {
    for (const href of ["/clientes", "/equipos", "/lotes", "/inspecciones", "/certificados"]) {
      expect(canAccess("transaction", href)).toBe(true);
    }
  });

  it("RF-01 keeps query users out of capture modules, nested routes included", () => {
    expect(canAccess("query", "/clientes")).toBe(false);
    expect(canAccess("query", "/clientes/nuevo")).toBe(false);
    expect(canAccess("query", "/certificados/123")).toBe(false);
  });

  it("RF-01 and D-20 let query users read reports and the audit log", () => {
    expect(canAccess("query", "/reportes")).toBe(true);
    expect(canAccess("query", "/bitacora")).toBe(true);
  });

  it("RF-01 closes unknown routes to query users by default", () => {
    expect(canAccess("query", "/usuarios")).toBe(false);
    expect(canAccess("transaction", "/usuarios")).toBe(true);
  });

  it("does not treat a shared prefix as the same module", () => {
    expect(canAccess("query", "/reportes-extra")).toBe(false);
  });
});

describe("canMutate", () => {
  it("RF-01 allows mutations only for transaction users", () => {
    expect(canMutate("transaction")).toBe(true);
    expect(canMutate("query")).toBe(false);
  });
});

describe("isRole", () => {
  it("accepts only the two known roles", () => {
    expect(isRole("transaction")).toBe(true);
    expect(isRole("query")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/clientes")).toBe("/clientes");
    expect(safeNextPath("/certificados/5?tab=envios")).toBe("/certificados/5?tab=envios");
  });

  it("falls back to the panel for empty, external or protocol-relative values", () => {
    expect(safeNextPath(null)).toBe("/panel");
    expect(safeNextPath("")).toBe("/panel");
    expect(safeNextPath("https://evil.test")).toBe("/panel");
    expect(safeNextPath("//evil.test")).toBe("/panel");
    expect(safeNextPath("/\\evil.test")).toBe("/panel");
  });

  it("never sends the user back to login or the auth API", () => {
    expect(safeNextPath("/login")).toBe("/panel");
    expect(safeNextPath("/api/auth/session")).toBe("/panel");
  });
});
