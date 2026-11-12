import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { account, auditLog, user } from "@/lib/db/schema";
import { testDb, TEST_USERS } from "@/test/int/db";
import { formData, initialState } from "@/test/int/fixtures";
import { signInAs } from "@/test/int/session";
import { createUser } from "./actions";

// Made-up account. The password is a fake value that exists only in this test.
const newUserForm = () =>
  formData({
    name: "Usuario Nuevo de Prueba",
    email: "nuevo@prueba.test",
    employeeId: "T0100",
    password: "fake-password-for-tests",
    role: "query",
  });

const createdUsers = () => testDb.select().from(user).where(eq(user.email, "nuevo@prueba.test"));

describe("Usuarios server actions against Postgres (RF-01, D-14)", () => {
  it("PC-11 RF-01 lets only an active administrator create accounts", async () => {
    signInAs("transaction");
    await expect(createUser(initialState, newUserForm())).rejects.toThrow("No tienes permiso para realizar esta acción.");

    // A deactivated administrator is treated as signed out (migration 0004, `user.active`)
    signInAs({ ...TEST_USERS.admin, active: false });
    await expect(createUser(initialState, newUserForm())).rejects.toThrow("REDIRECT:/login");

    expect(await createdUsers()).toHaveLength(0);
  });

  it("PC-12 RF-01 / BR-AUD-01 creates the account, its credential and the audit row together", async () => {
    signInAs("admin");
    expect(await createUser(initialState, newUserForm())).toMatchObject({ ok: true, message: "Cuenta creada." });

    const [created] = await createdUsers();
    expect(created).toMatchObject({ role: "query", active: true, employeeId: "T0100" });
    const [credential] = await testDb.select().from(account).where(eq(account.userId, created.id));
    expect(credential.providerId).toBe("credential");
    expect(credential.password).not.toContain("fake-password-for-tests");
    const audit = await testDb.select().from(auditLog).where(eq(auditLog.entityId, created.id));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: "create", entity: "user", employeeId: "T0003" });

    // The unique email rejects a duplicate and the failed batch leaves no second credential
    const again = await createUser(initialState, newUserForm());
    expect(again).toMatchObject({ ok: false, message: "Ya existe una cuenta con ese correo o número de empleado." });
    expect(await createdUsers()).toHaveLength(1);
    expect(await testDb.select().from(account)).toHaveLength(1);
  });
});
