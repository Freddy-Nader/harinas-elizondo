"use server";

import { and, desc, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditInsert, recordAudit } from "@/lib/audit";
import { fail, fieldErrorsFrom, pgError, succeed, type ActionState } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { inspections, lots } from "@/lib/db/schema";
import { changedFields } from "@/lib/domain/equipment";
import { nextSequence, sequenceToNumber } from "@/lib/domain/inspection-sequence";
import { lotCodeSchema, lotDataSchema, startInspection } from "@/lib/domain/lot";
import { latestInspection } from "@/lib/inspection-data";
import { ForbiddenError, requireRole } from "@/lib/session";

/** RF-04 · UC-03 server actions. Role first (RF-01), audit row with every change (BR-AUD-01). */

async function authorize() {
  try {
    return { user: await requireRole() };
  } catch (error) {
    if (error instanceof ForbiddenError) return { denied: fail(error.message) };
    throw error;
  }
}

function readLotData(form: FormData) {
  return lotDataSchema.safeParse({
    product: String(form.get("product") ?? ""),
    producedOn: String(form.get("producedOn") ?? ""),
    expiresOn: String(form.get("expiresOn") ?? ""),
  });
}

/** UC-03. Registers a production lot with the code printed by production. */
export async function createLot(_: ActionState, form: FormData): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;

  const code = lotCodeSchema.safeParse(String(form.get("id") ?? ""));
  const data = readLotData(form);
  if (!code.success || !data.success) {
    return fail("Revisa los campos marcados.", {
      ...(code.success ? {} : { id: code.error.issues[0]?.message ?? "Número de lote no válido." }),
      ...(data.success ? {} : fieldErrorsFrom(data.error.issues)),
    });
  }

  const [row] = await getDb()
    .insert(lots)
    .values({ id: code.data, ...data.data, createdBy: user.id })
    .onConflictDoNothing({ target: lots.id })
    .returning({ id: lots.id });
  if (!row) return fail("Revisa los campos marcados.", { id: "Ya existe un lote con ese número." });

  await recordAudit({ user, action: "create", entity: "lot", entityId: row.id, detail: { product: data.data.product } });
  revalidatePath("/lotes");
  redirect(`/lotes/${encodeURIComponent(row.id)}`);
}

/** UC-03. Edits product and dates until a certificate uses one of its inspections. */
export async function updateLot(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;

  const db = getDb();
  const [current] = await db.select().from(lots).where(eq(lots.id, id));
  if (!current) return fail("Lote no encontrado.");
  // BR-AUD-03. Once a certificate uses an inspection of this lot, its data is history
  const [locked] = await db
    .select({ id: inspections.id })
    .from(inspections)
    .where(and(eq(inspections.lotId, id), isNotNull(inspections.lockedAt)))
    .limit(1);
  if (locked) return fail("El lote ya tiene un certificado emitido y no se puede modificar.");

  const data = readLotData(form);
  if (!data.success) return fail("Revisa los campos marcados.", fieldErrorsFrom(data.error.issues));
  const diff = changedFields(current, data.data);
  if (!Object.keys(diff).length) return succeed("No hubo cambios que guardar.");

  await db.batch([
    db.update(lots).set(data.data).where(eq(lots.id, id)),
    auditInsert({ user, action: "update", entity: "lot", entityId: id, detail: { changes: diff } }),
  ]);
  revalidatePath("/lotes", "layout");
  return succeed("Cambios guardados.");
}

/**
 * RF-04 · BR-INS-02 · BR-INS-04. Starts the next inspection of a lot. The sequence comes
 * from the system, never from the form. After a complete inspection it is a re-inspection
 * and needs the equipment-failure reason (D-15).
 */
export async function startLotInspection(lotId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;

  const db = getDb();
  const [lot] = await db.select({ id: lots.id }).from(lots).where(eq(lots.id, lotId));
  if (!lot) return fail("Lote no encontrado.");

  const latest = await latestInspection(lotId);
  const rule = startInspection(
    latest && { sequence: latest.sequence, complete: latest.complete, locked: latest.lockedAt !== null },
    String(form.get("reason") ?? ""),
  );
  if (!rule.ok) return fail(rule.error, { reason: rule.error });

  let created: { id: number; sequence: string } | undefined;
  // Two people starting at once both compute the same letter. The unique index rejects one, so retry
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    const sequences = await db
      .select({ sequence: inspections.sequence })
      .from(inspections)
      .where(eq(inspections.lotId, lotId))
      .orderBy(desc(inspections.id));
    const last = sequences.map((s) => s.sequence).sort((a, b) => sequenceToNumber(a) - sequenceToNumber(b)).at(-1) ?? null;
    try {
      [created] = await db
        .insert(inspections)
        .values({ lotId, sequence: nextSequence(last), reinspectionReason: rule.reason, createdBy: user.id })
        .returning({ id: inspections.id, sequence: inspections.sequence });
    } catch (error) {
      if (pgError(error).code !== "23505") throw error;
    }
  }
  if (!created) return fail("No pudimos asignar la secuencia. Intenta de nuevo.");

  await recordAudit({
    user,
    action: rule.reinspection ? "reinspect" : "create",
    entity: "inspection",
    entityId: created.id,
    detail: { lotId, sequence: created.sequence, reason: rule.reason },
  });
  revalidatePath("/lotes", "layout");
  revalidatePath("/inspecciones");
  redirect(`/inspecciones/${created.id}`);
}
