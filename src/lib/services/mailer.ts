import "server-only";
import { Resend } from "resend";

/**
 * RF-06 · UC-06 · D-13. Outgoing email through Resend.
 *
 * - `RESEND_API_KEY` set: messages are sent with Resend from `EMAIL_FROM`.
 * - `RESEND_API_KEY` missing (local dev, tests, previews without the key): every message is
 *   SIMULATED. It is logged on the server (recipients, subject, attachment sizes, never the
 *   content) and reported as delivered, so the flow and its evidence can be demoed.
 * - `EMAIL_REDIRECT_TO` set: every real message goes to that one address instead of its
 *   recipients, and the body says who it was meant for. Resend without a verified domain can
 *   only send to the account owner's address, so this keeps the demo working.
 *
 * Callers only use `sendEmail`, `isEmailSimulated` and `warehouseEmail`.
 */

export type EmailAttachment = { filename: string; content: Buffer };

export type OutgoingEmail = {
  to: string[];
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
};

export type EmailResult =
  | { ok: true; simulated: boolean; messageId: string }
  | { ok: false; simulated: boolean; error: string };

/** Resend's shared test sender. Works without a verified domain. */
export const DEFAULT_EMAIL_FROM = "Harinas Elizondo <onboarding@resend.dev>";

function apiKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

/** Whether emails stay on the server. True while `RESEND_API_KEY` is missing. */
export function isEmailSimulated(): boolean {
  return apiKey() === undefined;
}

/** The warehouse mailbox that always receives certificates (RF-05). */
export function warehouseEmail(): string {
  return process.env.WAREHOUSE_EMAIL?.trim() || "almacen@demo.test";
}

function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
}

function redirectTo(): string | undefined {
  return process.env.EMAIL_REDIRECT_TO?.trim() || undefined;
}

export async function sendEmail(email: OutgoingEmail): Promise<EmailResult> {
  const key = apiKey();
  if (email.to.length === 0) return { ok: false, simulated: key === undefined, error: "Sin destinatarios." };
  if (key === undefined) return simulate(email);

  const redirect = redirectTo();
  const to = redirect ? [redirect] : email.to;
  const text = redirect
    ? `[Prueba] Este correo estaba dirigido a ${email.to.join(", ")}.\n\n${email.text}`
    : email.text;

  try {
    const { data, error } = await new Resend(key).emails.send({
      from: emailFrom(),
      to,
      subject: email.subject,
      text,
      attachments: (email.attachments ?? []).map((a) => ({ filename: a.filename, content: a.content })),
    });
    if (error || !data) {
      return { ok: false, simulated: false, error: `No se pudo enviar el correo. ${error?.message ?? "Respuesta vacía del proveedor."}` };
    }
    return { ok: true, simulated: false, messageId: data.id };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Error desconocido";
    return { ok: false, simulated: false, error: `No se pudo enviar el correo. ${detail}` };
  }
}

function simulate(email: OutgoingEmail): EmailResult {
  const messageId = `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  console.info("[mailer:simulated]", {
    messageId,
    to: email.to,
    subject: email.subject,
    attachments: (email.attachments ?? []).map((a) => ({ filename: a.filename, bytes: a.content.byteLength })),
  });
  return { ok: true, simulated: true, messageId };
}
