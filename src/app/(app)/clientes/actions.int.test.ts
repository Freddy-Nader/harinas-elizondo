import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { auditLog, clientDeliveryAddresses, clients } from "@/lib/db/schema";
import { holdUntilConcurrent, testDb, TEST_USERS } from "@/test/int/db";
import { clientForm, redirectOf } from "@/test/int/fixtures";
import { signInAs } from "@/test/int/session";
import { saveClient } from "./actions";

const RFC_TAKEN = "El RFC ya pertenece a otro cliente. Revisa los datos existentes.";

describe("Clientes server actions against Postgres (UC-02)", () => {
  beforeEach(() => signInAs("transaction"));

  it("PC-01 RF-03 / BR-AUD-01 stores the client, its destinations and the audit row together", async () => {
    const target = await redirectOf(
      saveClient(clientForm({ deliveryAddresses: ["Bodega Ficticia 1", "Bodega Ficticia 2"] })),
    );
    expect(target).toBe("/clientes");

    const [client] = await testDb.select().from(clients).where(eq(clients.sapKey, "PC0001"));
    expect(client).toMatchObject({ rfc: "TEST010101AAA", status: "active", createdBy: TEST_USERS.transaction.id });
    const destinations = await testDb
      .select()
      .from(clientDeliveryAddresses)
      .where(eq(clientDeliveryAddresses.clientId, client.id));
    expect(destinations.map((d) => d.address).sort()).toEqual(["Bodega Ficticia 1", "Bodega Ficticia 2"]);
    const audit = await testDb.select().from(auditLog).where(eq(auditLog.entityId, client.id));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: "create", entity: "clients", employeeId: "T0001", userName: "Analista Prueba" });
  });

  it("PC-02 RF-03 rejects a second client with an RFC that already exists", async () => {
    const target = await redirectOf(saveClient(clientForm({ sapKey: "PC0002" })));
    expect(target).toBe("/clientes?error=" + encodeURIComponent(RFC_TAKEN));
    expect(await testDb.select().from(clients).where(eq(clients.sapKey, "PC0002"))).toHaveLength(0);
  });

  it("PC-03 RF-03 keeps the RFC unique when two users save the same RFC at the same time", async () => {
    // Both saves pass the "RFC is free" read before either one writes, so only the
    // unique constraint of migration 0002 can stop the second one.
    holdUntilConcurrent(/^insert into "clients"/);
    const rfc = "TEST020202BBB";
    const targets = await Promise.all([
      redirectOf(saveClient(clientForm({ sapKey: "PC0003", rfc, businessName: "Molino de Prueba Tres" }))),
      redirectOf(saveClient(clientForm({ sapKey: "PC0004", rfc, businessName: "Molino de Prueba Cuatro" }))),
    ]);
    expect(targets.sort()).toEqual(["/clientes", "/clientes?error=" + encodeURIComponent(RFC_TAKEN)]);

    const saved = await testDb.select().from(clients).where(eq(clients.rfc, rfc));
    expect(saved).toHaveLength(1);
    // BR-AUD-01. The losing save left nothing behind: no destinations and no audit row
    const destinations = await testDb.select().from(clientDeliveryAddresses);
    const owners = new Set((await testDb.select({ id: clients.id }).from(clients)).map((c) => c.id));
    expect(destinations.every((d) => owners.has(d.clientId))).toBe(true);
    const audit = await testDb.select().from(auditLog).where(eq(auditLog.entity, "clients"));
    expect(audit.every((row) => owners.has(row.entityId))).toBe(true);
    expect(audit.filter((row) => row.entityId === saved[0].id)).toHaveLength(1);
  });
});
