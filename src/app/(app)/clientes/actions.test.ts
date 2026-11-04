import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getSession: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { getSession: mocked.getSession } }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocked.getDb }));

import {
  changeClientStatus,
  removeClientLimit,
  saveClient,
  saveClientLimit,
} from "./actions";

const actions = [
  ["register or edit a client", saveClient],
  ["activate or deactivate a client", changeClientStatus],
  ["set client reference limits", saveClientLimit],
  ["remove a client reference override", removeClientLimit],
] as const;

describe("RF-01 / UC-02: clients server-side role authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  for (const [description, action] of actions) {
    it(`blocks unauthenticated users from ${description}`, async () => {
      mocked.getSession.mockResolvedValue(null);
      await expect(action(new FormData())).rejects.toThrow("REDIRECT:/login");
      expect(mocked.getDb).not.toHaveBeenCalled();
    });

    it(`blocks query-only users from ${description}`, async () => {
      mocked.getSession.mockResolvedValue({
        user: { id: "user-query", name: "Consulta", role: "query", employeeId: "E002" },
      });
      await expect(action(new FormData())).rejects.toThrow("Acceso restringido.");
      expect(mocked.getDb).not.toHaveBeenCalled();
    });
  }
});
