import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/audit", () => ({ auditInsert: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { createUser, updateUser } from "./actions";

describe("RF-01 / D-14 account administration", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([createUser, updateUser])("requires admin before any database access", async (action) => {
    mocks.requireRole.mockRejectedValue(new Error("Acceso restringido"));
    await expect(action({ ok: false }, new FormData())).rejects.toThrow("Acceso restringido");
    expect(mocks.requireRole).toHaveBeenCalledWith("admin");
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it.each([createUser, updateUser])("rejects administrator as an assignable role", async (action) => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ id: "test", role: "admin", active: "true",
      name: "Cuenta ficticia", email: "example@example.test", employeeId: "E123",
      password: "example-test-only" })) form.set(key, value);
    expect((await action({ ok: false }, form)).ok).toBe(false);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
