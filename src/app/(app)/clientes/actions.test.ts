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

function validForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({ sapKey: "SAP001", businessName: "Cliente de prueba", rfc: "abc260101ab1",
    fiscalAddress: "Fiscal de prueba", deliveryAddresses: "Entrega de prueba", contactName: "Contacto", contactEmail: "contacto@example.test" })) form.set(key, value);
  return form;
}

describe("RF-03 / UC-02 duplicate client alerts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocked.getSession.mockResolvedValue({ user: { id: "u1", name: "Transacción", role: "transaction" } });
  });

  it.each([
    ["RFC", [[{ id: "other" }]], "El RFC ya pertenece a otro cliente. Revisa los datos existentes."],
    ["SAP", [[], [{ id: "other" }]], "La clave SAP ya pertenece a otro cliente. Usa una clave diferente."],
  ])("shows a specific %s alert without writing data", async (_, responses, message) => {
    const limit = vi.fn();
    for (const response of responses) limit.mockResolvedValueOnce(response);
    const batch = vi.fn();
    mocked.getDb.mockReturnValue({ select: () => ({ from: () => ({ where: () => ({ limit }) }) }), batch });
    await expect(saveClient(validForm())).rejects.toThrow("REDIRECT:/clientes?error=" + encodeURIComponent(message));
    expect(batch).not.toHaveBeenCalled();
  });

  it.each([
    ["clients_rfc_unique", "El RFC ya pertenece a otro cliente. Revisa los datos existentes."],
    ["clients_sap_key_unique", "La clave SAP ya pertenece a otro cliente. Usa una clave diferente."],
  ])("handles concurrent %s conflicts with the same friendly alert", async (constraint, message) => {
    const query = { values: vi.fn(() => ({})), where: vi.fn(() => ({})) };
    mocked.getDb.mockReturnValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => query, delete: () => query,
      batch: vi.fn().mockRejectedValue({ cause: { code: "23505", constraint } }),
    });
    await expect(saveClient(validForm())).rejects.toThrow("REDIRECT:/clientes?error=" + encodeURIComponent(message));
  });
});
