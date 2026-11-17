import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T,>(fn: T) => fn,
}));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { getSession: mocked.getSession } }),
}));

import { authorizeMutation } from "./session";

describe("RF-01: authorizeMutation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns a denied ActionState with the exact message for a query user", async () => {
    mocked.getSession.mockResolvedValue({
      user: { id: "u2", name: "Consulta", email: "q@example.test", role: "query", employeeId: "E002" },
    });
    const result = await authorizeMutation();
    expect(result.user).toBeUndefined();
    expect(result.denied).toMatchObject({
      ok: false,
      message: "No tienes permiso para realizar esta acción.",
    });
  });

  it("returns the user for a transaction user", async () => {
    mocked.getSession.mockResolvedValue({
      user: { id: "u1", name: "Transacción", email: "t@example.test", role: "transaction", employeeId: "E001" },
    });
    const result = await authorizeMutation();
    expect(result.denied).toBeUndefined();
    expect(result.user).toEqual({
      id: "u1",
      name: "Transacción",
      email: "t@example.test",
      role: "transaction",
      employeeId: "E001",
    });
  });
});
