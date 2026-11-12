"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditInsert, recordAudit } from "@/lib/audit";
import {
  fail,
  fieldErrorsFrom,
  pgError,
  succeed,
  type ActionState,
} from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { equipment, internationalLimits } from "@/lib/db/schema";
import {
  applyStatusChange,
  changedFields,
  equipmentInputSchema,
  equipmentTypeSchema,
  generateEquipmentKey,
  isEditable,
  isEquipmentKey,
  limitSchema,
  type StatusChange,
} from "@/lib/domain/equipment";
import { PARAMETERS } from "@/lib/domain/parameters";
import { ForbiddenError, requireRole } from "@/lib/session";

/**
 * RF-02 · UC-01 server actions. Every one checks the role first (RF-01) and writes the
 * audit row that feeds the equipment's change history (BR-AUD-01).
 */

const SERIAL_TAKEN = { serialNumber: "Ya existe un equipo con ese número de serie." };

function readForm(form: FormData) {
  const text = (name: string) => String(form.get(name) ?? "");
  return equipmentInputSchema.safeParse({
    shortDescription: text("shortDescription"),
    longDescription: text("longDescription"),
    brand: text("brand"),
    model: text("model"),
    serialNumber: text("serialNumber"),
    supplier: text("supplier"),
    acquiredOn: text("acquiredOn"),
    warrantyUntil: text("warrantyUntil"),
    location: text("location"),
    responsible: text("responsible"),
  });
}

async function authorize() {
  try {
    return { user: await requireRole() };
  } catch (error) {
    if (error instanceof ForbiddenError) return { denied: fail(error.message) };
    throw error;
  }
}

/** RF-02 · BR-EQP-01. Creates equipment with a generated key, then opens its detail page. */
export async function createEquipment(_: ActionState, form: FormData): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;

  const type = equipmentTypeSchema.safeParse(form.get("type"));
  const parsed = readForm(form);
  if (!type.success || !parsed.success) {
    return fail("Revisa los campos marcados.", {
      ...(type.success ? {} : { type: "Elige el tipo de equipo." }),
      ...(parsed.success ? {} : fieldErrorsFrom(parsed.error.issues)),
    });
  }

  let id: string | null = null;
  // A collision on the 8-char key is very unlikely, but retry a few times instead of failing
  for (let attempt = 0; attempt < 5 && !id; attempt++) {
    const key = generateEquipmentKey();
    try {
      const [row] = await getDb()
        .insert(equipment)
        .values({ id: key, type: type.data, ...parsed.data, createdBy: user.id })
        .onConflictDoNothing({ target: equipment.id })
        .returning({ id: equipment.id });
      id = row?.id ?? null;
    } catch (error) {
      if (pgError(error).code === "23505") return fail("Revisa los campos marcados.", SERIAL_TAKEN);
      throw error;
    }
  }
  if (!id) return fail("No pudimos generar una clave única. Intenta de nuevo.");

  await recordAudit({
    user,
    action: "create",
    entity: "equipment",
    entityId: id,
    detail: { type: type.data, shortDescription: parsed.data.shortDescription },
  });
  revalidatePath("/equipos");
  redirect(`/equipos/${id}`);
}

/** RF-02. Edits the general data. Retired equipment is read-only (D-16). */
export async function updateEquipment(
  id: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;
  if (!isEquipmentKey(id)) return fail("Equipo no encontrado.");

  const db = getDb();
  const [current] = await db.select().from(equipment).where(eq(equipment.id, id));
  if (!current) return fail("Equipo no encontrado.");
  if (!isEditable(current.status)) return fail("El equipo está dado de baja y ya no se puede modificar.");

  const parsed = readForm(form);
  if (!parsed.success) return fail("Revisa los campos marcados.", fieldErrorsFrom(parsed.error.issues));

  const diff = changedFields(current, parsed.data);
  if (Object.keys(diff).length === 0) return succeed("No hubo cambios que guardar.");

  try {
    await db.batch([
      db.update(equipment).set(parsed.data).where(eq(equipment.id, id)),
      auditInsert({ user, action: "update", entity: "equipment", entityId: id, detail: { changes: diff } }),
    ]);
  } catch (error) {
    if (pgError(error).code === "23505") return fail("Revisa los campos marcados.", SERIAL_TAKEN);
    throw error;
  }
  revalidatePath("/equipos", "layout");
  return succeed("Cambios guardados.");
}

const CHANGE_ACTION = {
  deactivate: "deactivate",
  reactivate: "reactivate",
  retire: "retire",
} as const satisfies Record<StatusChange, string>;

const CHANGE_MESSAGE: Record<StatusChange, string> = {
  deactivate: "Equipo inactivado.",
  reactivate: "Equipo reactivado.",
  retire: "Equipo dado de baja.",
};

/** RF-02 · D-16. Inactivate, reactivate or retire, always with the reason in the history. */
export async function changeEquipmentStatus(
  id: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;

  const change = String(form.get("change") ?? "");
  if (!(change in CHANGE_ACTION)) return fail("Cambio de estado no válido.");
  const db = getDb();
  const [current] = await db
    .select({ status: equipment.status })
    .from(equipment)
    .where(eq(equipment.id, id));
  if (!current) return fail("Equipo no encontrado.");

  const result = applyStatusChange(current.status, change as StatusChange, String(form.get("reason") ?? ""));
  if (!result.ok) return fail(result.error, { reason: result.error });

  await db.batch([
    db
      .update(equipment)
      .set({ status: result.status, statusReason: result.reason })
      .where(eq(equipment.id, id)),
    auditInsert({
      user,
      action: CHANGE_ACTION[change as StatusChange],
      entity: "equipment",
      entityId: id,
      detail: { from: current.status, to: result.status, reason: result.reason },
    }),
  ]);
  revalidatePath("/equipos", "layout");
  return succeed(CHANGE_MESSAGE[change as StatusChange]);
}

/**
 * RF-02 · BR-EQP-03. Sets the international limits of one parameter. They apply to every
 * equipment of that type (D-07), so the change shows in all their histories.
 */
export async function saveInternationalLimit(
  parameterCode: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;
  if (!PARAMETERS.some((p) => p.code === parameterCode)) return fail("Parámetro no válido.");

  const toNumber = (name: string) => {
    const raw = String(form.get(name) ?? "").trim().replace(",", ".");
    return raw === "" ? Number.NaN : Number(raw);
  };
  const parsed = limitSchema.safeParse({
    lowerLimit: toNumber("lowerLimit"),
    upperLimit: toNumber("upperLimit"),
  });
  if (!parsed.success) return fail("Revisa los límites.", fieldErrorsFrom(parsed.error.issues));

  const db = getDb();
  const [before] = await db
    .select()
    .from(internationalLimits)
    .where(eq(internationalLimits.parameterCode, parameterCode));
  const { lowerLimit, upperLimit } = parsed.data;
  if (before && before.lowerLimit === lowerLimit && before.upperLimit === upperLimit) {
    return succeed("No hubo cambios que guardar.");
  }

  await db.batch([
    db
      .insert(internationalLimits)
      .values({ parameterCode, lowerLimit, upperLimit, updatedBy: user.id })
      .onConflictDoUpdate({
        target: internationalLimits.parameterCode,
        set: { lowerLimit, upperLimit, updatedBy: user.id, updatedAt: new Date() },
      }),
    auditInsert({
      user,
      action: before ? "update" : "create",
      entity: "international_limit",
      entityId: parameterCode,
      detail: {
        before: before ? [before.lowerLimit, before.upperLimit] : null,
        after: [lowerLimit, upperLimit],
      },
    }),
  ]);
  revalidatePath("/equipos", "layout");
  return succeed("Límites guardados.");
}
