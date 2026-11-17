import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: mocked.getDb }));

import { clientCreateContract, clientUpdateContract } from "./contracts";
import { saveClient } from "./use-cases";

const actor = { id: "u1", name: "Transacción", email: "t@example.test", role: "transaction", employeeId: "E001" } as const;
const input = {
  sapKey: "SAP001", businessName: "Cliente de prueba", rfc: "ABC260101AB1", fiscalAddress: "Fiscal de prueba",
  deliveryAddresses: ["Entrega de prueba"], contactName: "Contacto", contactEmail: "contacto@example.test",
  requiresCertificate: true,
};

/** A db whose duplicate preflights answer `lookups` in order, and whose batch is `batch`. */
function fakeDb(lookups: unknown[][], batch = vi.fn().mockResolvedValue([])) {
  const limit = vi.fn();
  for (const rows of lookups) limit.mockResolvedValueOnce(rows);
  const query = { values: vi.fn(() => ({})), where: vi.fn(() => ({})), set: vi.fn(() => ({ where: vi.fn(() => ({})) })) };
  mocked.getDb.mockReturnValue({
    select: () => ({ from: () => ({ where: () => Object.assign(Promise.resolve(lookups[0] ?? []), { limit }) }) }),
    insert: () => query, delete: () => query, update: () => query, batch,
  });
  return { batch };
}

describe("RF-03 / UC-02: clients use case", () => {
  beforeEach(() => vi.resetAllMocks());

  it("BR-AUD-01 creates the client, destinations and audit row in one batch", async () => {
    const { batch } = fakeDb([[], []]);
    const result = await saveClient(actor, input);
    expect(result).toMatchObject({ ok: true, message: "Cliente registrado." });
    expect(batch).toHaveBeenCalledOnce();
    expect(batch.mock.calls[0][0]).toHaveLength(4);
  });

  it("BR-CLI-02 refuses a duplicate RFC with the Spanish message and writes nothing", async () => {
    const { batch } = fakeDb([[{ id: "other" }]]);
    expect(await saveClient(actor, input)).toMatchObject({
      ok: false, kind: "conflict", message: "El RFC ya pertenece a otro cliente. Revisa los datos existentes.",
    });
    expect(batch).not.toHaveBeenCalled();
  });

  it("BR-CLI-01 refuses a duplicate SAP key with the Spanish message and writes nothing", async () => {
    const { batch } = fakeDb([[], [{ id: "other" }]]);
    expect(await saveClient(actor, input)).toMatchObject({
      ok: false, kind: "conflict", message: "La clave SAP ya pertenece a otro cliente. Usa una clave diferente.",
    });
    expect(batch).not.toHaveBeenCalled();
  });

  it("RF-03 answers not found for an unknown id on update", async () => {
    const { batch } = fakeDb([[]]);
    expect(await saveClient(actor, { ...input, id: "missing" })).toMatchObject({
      ok: false, kind: "not_found", message: "No se encontró el cliente.",
    });
    expect(batch).not.toHaveBeenCalled();
  });

  it("BR-CLI-01 turns a concurrent unique violation into the same friendly conflict", async () => {
    fakeDb([[], []], vi.fn().mockRejectedValue({ cause: { code: "23505", constraint: "clients_sap_key_unique" } }));
    expect(await saveClient(actor, input)).toMatchObject({
      ok: false, kind: "conflict", message: "La clave SAP ya pertenece a otro cliente. Usa una clave diferente.",
    });
  });

  it("RF-03 contracts keep the validation messages of the form", () => {
    const parsed = clientCreateContract.input.safeParse({ ...input, sapKey: "" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toBe("La clave SAP es obligatoria.");
    expect(clientUpdateContract.input.safeParse(input).error?.issues[0].message).toBe("Falta el identificador del cliente.");
  });
});
