import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { auditLog, clients } from "@/lib/db/schema";
import { testDb } from "@/test/int/db";
import { signInAs, signOut } from "@/test/int/session";
import { GET, POST } from "./[...op]/route";

const base = "http://localhost/api/v1/clients";
const body = {
  sapKey: "AP0001", businessName: "Panificadora API de Prueba", rfc: "TEST030303CCC",
  fiscalAddress: "Calle Ficticia 3, Ciudad de Prueba", deliveryAddresses: ["Bodega Ficticia 3"],
  contactName: "Contacto de Prueba", contactEmail: "contacto@prueba.test", requiresCertificate: true,
};

function call(op: string, payload?: unknown, raw?: string) {
  const url = `${base}/${op}`;
  const context = { params: Promise.resolve({ op: ["clients", op] }) };
  return payload === undefined && raw === undefined
    ? GET(new Request(url), context as never)
    : POST(new Request(url, { method: "POST", body: raw ?? JSON.stringify(payload) }), context as never);
}

describe("RF-01 / RF-03 / UC-02: /api/v1/clients against Postgres", () => {
  beforeEach(() => signInAs("transaction"));

  it("RF-01 answers 401 without a session", async () => {
    signOut();
    for (const response of [await call("list"), await call("create", body)]) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ ok: false, message: "Inicia sesión para continuar." });
    }
  });

  it("RF-01 answers 403 to a query user, for reads and writes, and writes nothing", async () => {
    signInAs("query");
    for (const response of [await call("list"), await call("create", body)]) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, message: "No tienes permiso para realizar esta acción." });
    }
    expect(await testDb.select().from(clients).where(eq(clients.sapKey, "AP0001"))).toHaveLength(0);
  });

  it("RF-03 / BR-AUD-01 create answers 200 and leaves the client and its audit row", async () => {
    const response = await call("create", body);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ ok: true, message: "Cliente registrado." });
    const [audit] = await testDb.select().from(auditLog).where(eq(auditLog.entityId, json.data.id));
    expect(audit).toMatchObject({ action: "create", entity: "clients", employeeId: "T0001", userName: "Analista Prueba" });
  });

  it("BR-CLI-01 a second identical create answers 409 with the SAP key message", async () => {
    const response = await call("create", { ...body, rfc: "TEST040404DDD" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      ok: false, message: "La clave SAP ya pertenece a otro cliente. Usa una clave diferente.",
    });
  });

  it("BR-CLI-02 a repeated RFC answers 409 with the RFC message", async () => {
    const response = await call("create", { ...body, sapKey: "AP0002" });
    expect(response.status).toBe(409);
    expect((await response.json()).message).toBe("El RFC ya pertenece a otro cliente. Revisa los datos existentes.");
  });

  it("RF-03 invalid input answers 400 with the Spanish message and the field", async () => {
    const response = await call("create", { ...body, sapKey: "", rfc: "mal" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false, kind: "invalid", message: "La clave SAP es obligatoria.",
      fieldErrors: { sapKey: "La clave SAP es obligatoria.", rfc: "El RFC no tiene un formato válido." },
    });
    const broken = await call("create", undefined, "{no es json");
    expect(broken.status).toBe(400);
  });

  it("RF-03 update changes the client and writes an update audit row, an unknown id answers 404", async () => {
    const [client] = await testDb.select().from(clients).where(eq(clients.sapKey, "AP0001"));
    const updated = await call("update", { ...body, id: client.id, businessName: "Razón social nueva" });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ ok: true, message: "Cliente actualizado." });
    const [after] = await testDb.select().from(clients).where(eq(clients.id, client.id));
    expect(after.businessName).toBe("Razón social nueva");
    const audit = await testDb.select().from(auditLog).where(eq(auditLog.entityId, client.id));
    expect(audit.map((row) => row.action).sort()).toEqual(["create", "update"]);

    const bad = await call("update", { ...body, id: "no-existe" });
    expect(bad.status).toBe(400);
    expect((await bad.json()).message).toBe("El identificador del cliente no es válido.");
    const missing = await call("update", { ...body, id: "00000000-0000-4000-8000-000000000000", sapKey: "AP0009", rfc: "TEST090909EEE" });
    expect(missing.status).toBe(404);
    expect((await missing.json()).message).toBe("No se encontró el cliente.");
  });

  it("RF-03 list answers 200 with the client in the directory", async () => {
    const response = await call("list");
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.message).toBe("Directorio de clientes (1)");
    expect(json.data.map((row: { sapKey: string }) => row.sapKey)).toEqual(["AP0001"]);
  });

  it("RF-01 an unknown operation answers 404 and a wrong method too", async () => {
    expect((await GET(new Request(`${base}/nada`), { params: Promise.resolve({ op: ["clients", "nada"] }) } as never)).status).toBe(404);
    expect((await GET(new Request(`${base}/create`), { params: Promise.resolve({ op: ["clients", "create"] }) } as never)).status).toBe(404);
  });
});
