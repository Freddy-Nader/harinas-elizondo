import "server-only";

/**
 * RF-06 · UC-06 · D-13. Outgoing email. For now every message is SIMULATED: it is logged
 * on the server (recipients, subject, attachment sizes, never the content) and reported as
 * delivered, so the whole flow and its evidence can be demoed without a mail provider.
 *
 * To send for real, implement `deliver` with Resend (D-13) behind `RESEND_API_KEY` and keep
 * this signature. Callers do not change.
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

/** Whether emails leave the server. False until a provider is wired. */
export function isEmailSimulated(): boolean {
  return true;
}

/** The warehouse mailbox that always receives certificates (RF-05). */
export function warehouseEmail(): string {
  return process.env.WAREHOUSE_EMAIL?.trim() || "almacen@demo.test";
}

export async function sendEmail(email: OutgoingEmail): Promise<EmailResult> {
  if (email.to.length === 0) return { ok: false, simulated: isEmailSimulated(), error: "Sin destinatarios." };

  const messageId = `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  console.info("[mailer:simulated]", {
    messageId,
    to: email.to,
    subject: email.subject,
    attachments: (email.attachments ?? []).map((a) => ({ filename: a.filename, bytes: a.content.byteLength })),
  });
  return { ok: true, simulated: true, messageId };
}
