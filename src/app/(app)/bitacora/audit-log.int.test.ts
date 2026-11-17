import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { saveClient } from "@/app/(app)/clientes/actions";
import { createLot } from "@/app/(app)/lotes/actions";
import { auditLog } from "@/lib/db/schema";
import { testDb, TEST_USERS } from "@/test/int/db";
import { clientForm, formData, initialState, redirectOf } from "@/test/int/fixtures";
import { signInAs, signOut } from "@/test/int/session";
import * as data from "./data";
import { listAuditLog } from "./data";

describe("Bitácora against Postgres (RF-08, D-20)", () => {
  beforeAll(async () => {
    signInAs("transaction");
    await redirectOf(saveClient(clientForm()));
    await redirectOf(
      createLot(initialState, formData({ id: "PC-LOT-AUD1", product: "Harina de prueba", producedOn: "2026-01-10", expiresOn: "2026-12-31" })),
    );
    // A third row from another employee, so the employee filter has something to exclude
    await testDb.insert(auditLog).values({
      userId: TEST_USERS.query.id,
      employeeId: TEST_USERS.query.employeeId,
      userName: TEST_USERS.query.name,
      action: "export",
      entity: "certificate",
      entityId: "history",
    });
  });
  beforeEach(() => signInAs("transaction"));

  it.each(["transaction", "query"] as const)(
    "PC-14 RF-08 / RF-01 a %s user reads every row, newest first, and total matches",
    async (role) => {
      signInAs(role);
      const { rows, total } = await listAuditLog({ page: 1 });
      expect(total).toBe(3);
      expect(rows.map((row) => row.entity)).toEqual(["certificate", "lot", "clients"]);
      expect(rows.map((row) => row.id)).toEqual([...rows.map((row) => row.id)].sort((a, b) => b - a));
    },
  );

  it("PC-14 RF-08 the entity filter returns only the rows of that entity", async () => {
    const { rows, total } = await listAuditLog({ entity: "lot", page: 1 });
    expect(total).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ entity: "lot", entityId: "PC-LOT-AUD1", action: "create" });
  });

  it("PC-14 RF-08 the employee filter returns only the rows of that employee", async () => {
    const { rows, total } = await listAuditLog({ employee: TEST_USERS.query.employeeId, page: 1 });
    expect(total).toBe(1);
    expect(rows[0]).toMatchObject({ userId: TEST_USERS.query.id, action: "export" });

    const byTransaction = await listAuditLog({ employee: TEST_USERS.transaction.employeeId, page: 1 });
    expect(byTransaction.total).toBe(2);
    expect(byTransaction.rows.every((row) => row.userId === TEST_USERS.transaction.id)).toBe(true);
  });

  it("PC-14 RF-08 / RF-01 without a session the log redirects to /login", async () => {
    signOut();
    expect(await redirectOf(listAuditLog({ page: 1 }))).toBe("/login");
  });

  it("PC-14 RF-08 / BR-AUD-01 the module exports no function that writes", () => {
    const functions = Object.entries(data).filter(([, value]) => typeof value === "function");
    expect(functions.map(([name]) => name)).toEqual(["listAuditLog"]);
  });
});
