"use server";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, pgError, succeed, type ActionState } from "@/lib/action-state";
import { auditInsert } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { account, session, user } from "@/lib/db/schema";
import { requireRole } from "@/lib/session";

const operationalRoles = ["transaction", "query"] as const;
const role = z.enum(operationalRoles);
const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase().max(100),
  employeeId: z.string().trim().toUpperCase().min(1).max(10),
  password: z.string().min(12).max(128),
  role,
});

/** RF-01 / D-14: only administrators provision operational accounts. */
export async function createUser(_: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole("admin");
  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Revisa los datos. La contraseña debe tener entre 12 y 128 caracteres.");
  const { password, ...data } = parsed.data;
  const db = getDb();
  const id = randomUUID();
  try {
    await db.batch([
      db.insert(user).values({ id, ...data }),
      db.insert(account).values({ id: randomUUID(), userId: id, accountId: id, providerId: "credential", password: await hashPassword(password) }),
      auditInsert({ user: actor, action: "create", entity: "user", entityId: id, detail: { role: data.role } }),
    ]);
  } catch (error) {
    if (pgError(error).code === "23505") return fail("Ya existe una cuenta con ese correo o número de empleado.");
    throw error;
  }
  revalidatePath("/usuarios");
  return succeed("Cuenta creada.");
}

export async function updateUser(_: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole("admin");
  const parsed = z.object({ id: z.string().min(1).max(128), role, active: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Revisa el rol y el estado de la cuenta.");
  const { id, role: nextRole, active: activeValue } = parsed.data;
  const active = activeValue === "true";
  const db = getDb();
  const [target] = await db.select({ role: user.role, active: user.active }).from(user)
    .where(and(eq(user.id, id), inArray(user.role, operationalRoles)));
  if (!target) return fail("Solo puedes editar cuentas de transacción o consulta.");
  if (target.role === nextRole && target.active === active) return succeed("No hay cambios que guardar.");
  await db.batch([
    db.update(user).set({ role: nextRole, active }).where(and(eq(user.id, id), inArray(user.role, operationalRoles))),
    db.delete(session).where(eq(session.userId, id)),
    auditInsert({ user: actor, action: target.active === active ? "update" : active ? "reactivate" : "deactivate",
      entity: "user", entityId: id, detail: { role: nextRole, active } }),
  ]);
  revalidatePath("/usuarios");
  return succeed("Cuenta actualizada. Se cerraron sus sesiones activas.");
}
