import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));

const { auditRow } = await import("./audit");

const user = {
  id: "u1",
  name: "Laboratorio Demo",
  email: "laboratorio@demo.test",
  role: "transaction" as const,
  employeeId: "E0001",
};

describe("auditRow", () => {
  it("BR-AUD-01 stores the employee id and name of who acted", () => {
    const row = auditRow({ user, action: "create", entity: "client", entityId: 42 });
    expect(row).toMatchObject({
      userId: "u1",
      employeeId: "E0001",
      userName: "Laboratorio Demo",
      action: "create",
      entity: "client",
    });
  });

  it("BR-AUD-01 stores the entity id as text and keeps the detail", () => {
    const row = auditRow({
      user,
      action: "deactivate",
      entity: "client",
      entityId: 7,
      detail: { reason: "Cliente sin pedidos" },
    });
    expect(row.entityId).toBe("7");
    expect(row.detail).toEqual({ reason: "Cliente sin pedidos" });
  });

  it("stores null detail when none is given", () => {
    expect(auditRow({ user, action: "issue", entity: "certificate", entityId: "c1" }).detail).toBeNull();
  });
});
