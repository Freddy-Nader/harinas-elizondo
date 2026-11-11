"use server";

import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditInsert, recordAudit } from "@/lib/audit";
import { fail, fieldErrorsFrom, pgError, succeed, type ActionState } from "@/lib/action-state";
import { computeCertificateLines, loadCertificate } from "@/lib/certificate-data";
import { getDb } from "@/lib/db";
import {
  certificateLines,
  certificates,
  clientDeliveryAddresses,
  clients,
  deliveries,
  inspections,
  lots,
} from "@/lib/db/schema";
import {
  cancelCheck,
  certificateHash,
  certificateInputSchema,
  deliveryRecipients,
  isCertificateId,
  nextCertificateId,
  type CertificateInput,
} from "@/lib/domain/certificate";
import { changedFields } from "@/lib/domain/equipment";
import { renderCertificatePdf } from "@/lib/services/certificate-pdf";
import { sendEmail, warehouseEmail } from "@/lib/services/mailer";
import { ForbiddenError, requireRole, type SessionUser } from "@/lib/session";

/**
 * RF-05 · RF-06 · UC-05 / UC-06 server actions. Every one checks the role first (RF-01) and
 * writes its audit row (BR-AUD-01). Issuing snapshots the lines (D-10), stores the SHA-256
 * (D-26) and locks the inspection (BR-AUD-03), so the "conforme ficticia" edit of the old
 * process is impossible. Issued certificates are cancelled with a reason, never deleted (D-25).
 */

async function authorize() {
  try {
    return { user: await requireRole() };
  } catch (error) {
    if (error instanceof ForbiddenError) return { denied: fail(error.message) };
    throw error;
  }
}

function readForm(form: FormData) {
  const text = (name: string) => String(form.get(name) ?? "");
  return certificateInputSchema.safeParse({
    clientId: text("clientId"),
    lotId: text("lotId"),
    purchaseOrder: text("purchaseOrder"),
    quantityRequested: text("quantityRequested"),
    quantityDelivered: text("quantityDelivered"),
    invoiceNumber: text("invoiceNumber"),
    shippedOn: text("shippedOn"),
    deliveryAddressId: text("deliveryAddressId"),
    carrier: text("carrier"),
    requiresSignature: form.get("requiresSignature") === "on",
  });
}

/**
 * Client must be active, the destination must be one of the client's (D-22), and the lot's
 * latest inspection must be complete (BR-CER-01). Returns the row values to store.
 */
async function resolveInput(input: CertificateInput) {
  const db = getDb();
  const [[client], [lot], destinations] = await Promise.all([
    db.select({ status: clients.status }).from(clients).where(eq(clients.id, input.clientId)),
    db.select({ id: lots.id }).from(lots).where(eq(lots.id, input.lotId)),
    input.deliveryAddressId
      ? db
          .select({ address: clientDeliveryAddresses.address })
          .from(clientDeliveryAddresses)
          .where(
            and(
              eq(clientDeliveryAddresses.id, input.deliveryAddressId),
              eq(clientDeliveryAddresses.clientId, input.clientId),
            ),
          )
      : Promise.resolve([]),
  ]);

  const errors: Record<string, string> = {};
  if (!client) errors.clientId = "Cliente no encontrado.";
  else if (client.status !== "active") errors.clientId = "El cliente está inactivo.";
  if (!lot) errors.lotId = "Lote no encontrado.";
  if (input.deliveryAddressId && destinations.length === 0) {
    errors.deliveryAddressId = "Elige una dirección de entrega de este cliente.";
  }
  if (Object.keys(errors).length) return { errors };

  const { inspection, problem } = await computeCertificateLines(input.clientId, input.lotId);
  if (!inspection) return { errors: { lotId: problem ?? "El lote no se puede certificar." } };

  const { deliveryAddressId: _id, ...rest } = input;
  void _id;
  return {
    inspection,
    values: { ...rest, deliveryAddress: destinations[0]?.address ?? null },
  };
}

function mexicoYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "America/Mexico_City" }).format(now));
}

/** UC-05. Creates the draft with the next CER-YYYY-NNNNNN id (D-17), then opens it. */
export async function createCertificate(_: ActionState, form: FormData): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;

  const parsed = readForm(form);
  if (!parsed.success) return fail("Revisa los campos marcados.", fieldErrorsFrom(parsed.error.issues));
  const resolved = await resolveInput(parsed.data);
  if (resolved.errors) return fail("Revisa los campos marcados.", resolved.errors);

  const db = getDb();
  const year = mexicoYear();
  let id: string | null = null;
  // Two users creating at once may race for the same counter; retry with the next one
  for (let attempt = 0; attempt < 5 && !id; attempt++) {
    const [last] = await db
      .select({ id: certificates.id })
      .from(certificates)
      .where(like(certificates.id, `CER-${year}-%`))
      .orderBy(desc(certificates.id))
      .limit(1);
    const candidate = nextCertificateId(last?.id ?? null, year);
    const [row] = await db
      .insert(certificates)
      .values({ id: candidate, ...resolved.values, inspectionId: resolved.inspection.id })
      .onConflictDoNothing({ target: certificates.id })
      .returning({ id: certificates.id });
    id = row?.id ?? null;
  }
  if (!id) return fail("No pudimos asignar un folio. Intenta de nuevo.");

  await recordAudit({
    user,
    action: "create",
    entity: "certificate",
    entityId: id,
    detail: { clientId: parsed.data.clientId, lotId: parsed.data.lotId, purchaseOrder: parsed.data.purchaseOrder },
  });
  revalidatePath("/certificados");
  redirect(`/certificados/${id}`);
}

/** UC-05. Edits a draft. Issued certificates are read-only. */
export async function updateCertificate(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;
  if (!isCertificateId(id)) return fail("Certificado no encontrado.");

  const db = getDb();
  const [current] = await db.select().from(certificates).where(eq(certificates.id, id));
  if (!current) return fail("Certificado no encontrado.");
  if (current.status !== "draft") return fail("El certificado ya fue emitido y no se puede modificar.");

  const parsed = readForm(form);
  if (!parsed.success) return fail("Revisa los campos marcados.", fieldErrorsFrom(parsed.error.issues));
  const resolved = await resolveInput(parsed.data);
  if (resolved.errors) return fail("Revisa los campos marcados.", resolved.errors);

  const diff = changedFields(current, resolved.values);
  if (Object.keys(diff).length === 0 && current.inspectionId === resolved.inspection.id) {
    return succeed("No hubo cambios que guardar.");
  }

  await db.batch([
    db
      .update(certificates)
      .set({ ...resolved.values, inspectionId: resolved.inspection.id })
      .where(and(eq(certificates.id, id), eq(certificates.status, "draft"))),
    auditInsert({ user, action: "update", entity: "certificate", entityId: id, detail: { changes: diff } }),
  ]);
  revalidatePath("/certificados", "layout");
  return succeed("Cambios guardados.");
}

/**
 * UC-05 · BR-CER-01/02/05 · D-10 · D-26 · BR-AUD-03. Issues a draft: takes the lot's latest
 * inspection (must be complete), snapshots the ten lines, stores the SHA-256, locks the
 * inspection and, by default, sends it (RF-06).
 */
export async function issueCertificate(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;
  if (!isCertificateId(id)) return fail("Certificado no encontrado.");

  const loaded = await loadCertificate(id);
  if (!loaded) return fail("Certificado no encontrado.");
  if (loaded.blockers.length) return fail(loaded.blockers[0]);
  if (!loaded.inspection || !loaded.preview?.ok) return fail("No se pudieron calcular los resultados del certificado.");

  const { cert, client, lot } = loaded;
  const { lines } = loaded.preview;
  const inspection = loaded.inspection;
  const issuedAt = new Date();
  const signatureHash = certificateHash({
    id,
    clientSapKey: client.sapKey,
    lotId: lot.id,
    inspectionSequence: inspection.sequence,
    purchaseOrder: cert.purchaseOrder,
    invoiceNumber: cert.invoiceNumber,
    quantityRequested: cert.quantityRequested,
    quantityDelivered: cert.quantityDelivered,
    shippedOn: cert.shippedOn,
    deliveryAddress: cert.deliveryAddress,
    carrier: cert.carrier,
    issuedAt,
    issuerEmployeeId: user.employeeId,
    lines,
  });

  const db = getDb();
  try {
    await db.batch([
      db.insert(certificateLines).values(
        lines.map((l) => ({
          certificateId: id,
          parameterCode: l.parameterCode,
          value: l.value,
          lowerLimit: l.lowerLimit,
          upperLimit: l.upperLimit,
          deviation: l.deviation,
        })),
      ),
      db
        .update(certificates)
        .set({ status: "issued", inspectionId: inspection.id, issuedAt, issuedBy: user.id, signatureHash })
        .where(and(eq(certificates.id, id), eq(certificates.status, "draft"))),
      // BR-AUD-03. From now on the results cannot change. Keep the first lock time
      db
        .update(inspections)
        .set({ lockedAt: sql`coalesce(${inspections.lockedAt}, now())` })
        .where(eq(inspections.id, inspection.id)),
      auditInsert({
        user,
        action: "issue",
        entity: "certificate",
        entityId: id,
        detail: {
          lotId: lot.id,
          inspection: inspection.sequence,
          signatureHash,
          deviations: lines.filter((l) => l.status !== "within").map((l) => l.parameterCode),
        },
      }),
    ]);
  } catch (error) {
    // The lines' primary key collides when another user issued it a moment ago
    if (pgError(error).code === "23505") return fail("El certificado ya fue emitido.");
    throw error;
  }

  revalidatePath("/certificados", "layout");
  revalidatePath("/lotes", "layout");
  revalidatePath("/inspecciones", "layout");

  if (form.get("sendNow") !== "on") return succeed("Certificado emitido.");
  const sent = await deliver(id, user, "send");
  return sent.ok
    ? succeed(`Certificado emitido y enviado a ${sent.recipients.join(", ")}.`)
    : fail(`Certificado emitido, pero el envío falló: ${sent.error}`);
}

/** RF-06 · UC-06. Sends (or re-sends) an issued certificate and stores the evidence. */
export async function sendCertificate(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  void form;
  const { user, denied } = await authorize();
  if (denied) return denied;
  if (!isCertificateId(id)) return fail("Certificado no encontrado.");

  const [current] = await getDb()
    .select({ status: certificates.status })
    .from(certificates)
    .where(eq(certificates.id, id));
  if (!current) return fail("Certificado no encontrado.");
  if (current.status === "draft") return fail("Emite el certificado antes de enviarlo.");
  if (current.status === "cancelled") return fail("El certificado está cancelado y ya no se envía.");

  const sent = await deliver(id, user, current.status === "sent" ? "resend" : "send");
  return sent.ok ? succeed(`Enviado a ${sent.recipients.join(", ")}.`) : fail(`El envío falló: ${sent.error}`);
}

/**
 * D-25. Cancels an issued or sent certificate with a reason. The row, its snapshot, hash and
 * the inspection lock stay, so the history and the evidence are kept.
 */
export async function cancelCertificate(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user, denied } = await authorize();
  if (denied) return denied;
  if (!isCertificateId(id)) return fail("Certificado no encontrado.");

  const db = getDb();
  const [current] = await db
    .select({ status: certificates.status })
    .from(certificates)
    .where(eq(certificates.id, id));
  if (!current) return fail("Certificado no encontrado.");

  const check = cancelCheck(current.status, String(form.get("reason") ?? ""));
  if (!check.ok) return fail(check.error, { reason: check.error });

  await db.batch([
    db
      .update(certificates)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: user.id, cancellationReason: check.reason })
      .where(and(eq(certificates.id, id), inArray(certificates.status, ["issued", "sent"]))),
    auditInsert({
      user,
      action: "cancel",
      entity: "certificate",
      entityId: id,
      detail: { from: current.status, reason: check.reason },
    }),
  ]);
  revalidatePath("/certificados", "layout");
  return succeed("Certificado cancelado.");
}

/** Renders the PDF, emails it, and writes the delivery row and the audit row together. */
async function deliver(id: string, user: SessionUser, action: "send" | "resend") {
  const loaded = await loadCertificate(id);
  if (!loaded || loaded.cert.status === "draft" || loaded.cert.status === "cancelled") {
    return { ok: false as const, error: "Certificado no disponible para envío." };
  }

  const recipients = deliveryRecipients(loaded.client.contactEmail, warehouseEmail());
  let result;
  try {
    const pdf = await renderCertificatePdf(loaded.pdf);
    result = await sendEmail({
      to: recipients,
      subject: `Certificado de calidad ${id} · Lote ${loaded.lot.id} · OC ${loaded.cert.purchaseOrder}`,
      text: [
        `Estimado(a) ${loaded.client.contactName ?? loaded.client.businessName}:`,
        "",
        `Adjuntamos el certificado de calidad ${id} del lote ${loaded.lot.id} correspondiente a su orden de compra ${loaded.cert.purchaseOrder}.`,
        "",
        "Laboratorio de Control de Calidad · Harinas Elizondo",
      ].join("\n"),
      attachments: [{ filename: `${id}.pdf`, content: pdf }],
    });
  } catch (error) {
    result = { ok: false as const, simulated: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }

  const db = getDb();
  await db.batch([
    db.insert(deliveries).values({
      certificateId: id,
      recipients,
      succeeded: result.ok,
      error: result.ok ? null : result.error,
      sentBy: user.id,
    }),
    db
      .update(certificates)
      .set({ status: result.ok ? "sent" : loaded.cert.status })
      .where(and(eq(certificates.id, id), inArray(certificates.status, ["issued", "sent"]))),
    auditInsert({
      user,
      action,
      entity: "certificate",
      entityId: id,
      detail: { recipients, succeeded: result.ok, simulated: result.simulated },
    }),
  ]);
  revalidatePath("/certificados", "layout");

  return result.ok ? { ok: true as const, recipients } : { ok: false as const, error: result.error };
}
