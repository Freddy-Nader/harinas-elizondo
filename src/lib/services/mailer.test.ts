import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(function (this: { emails: { send: typeof send } }) {
    this.emails = { send };
  }),
}));

const { DEFAULT_EMAIL_FROM, isEmailSimulated, sendEmail } = await import("./mailer");

const email = {
  to: ["cliente@example.com", "almacen@example.com"],
  subject: "Certificado de calidad CER-2026-000001",
  text: "Adjuntamos el certificado.",
  attachments: [{ filename: "CER-2026-000001.pdf", content: Buffer.from("%PDF-1.7") }],
};

beforeEach(() => {
  send.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("RF-06 D-13 mailer without RESEND_API_KEY", () => {
  beforeEach(() => vi.stubEnv("RESEND_API_KEY", ""));

  it("RF-06 stays simulated and never calls Resend", async () => {
    expect(isEmailSimulated()).toBe(true);
    const result = await sendEmail(email);
    expect(result).toMatchObject({ ok: true, simulated: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("RF-06 rejects an email with no recipients", async () => {
    expect(await sendEmail({ ...email, to: [] })).toEqual({ ok: false, simulated: true, error: "Sin destinatarios." });
  });
});

describe("RF-06 D-13 mailer with RESEND_API_KEY", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("EMAIL_REDIRECT_TO", "");
  });

  it("RF-06 sends through Resend with the PDF attached", async () => {
    send.mockResolvedValue({ data: { id: "msg_123" }, error: null });
    expect(isEmailSimulated()).toBe(false);

    const result = await sendEmail(email);

    expect(result).toEqual({ ok: true, simulated: false, messageId: "msg_123" });
    expect(send).toHaveBeenCalledWith({
      from: DEFAULT_EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      text: email.text,
      attachments: [{ filename: "CER-2026-000001.pdf", content: email.attachments[0].content }],
    });
  });

  it("RF-06 uses EMAIL_FROM when set", async () => {
    vi.stubEnv("EMAIL_FROM", "Laboratorio <lab@harinas.example>");
    send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
    await sendEmail(email);
    expect(send.mock.calls[0][0].from).toBe("Laboratorio <lab@harinas.example>");
  });

  it("RF-06 EMAIL_REDIRECT_TO sends to one address and names the real recipients", async () => {
    vi.stubEnv("EMAIL_REDIRECT_TO", "demo@example.com");
    send.mockResolvedValue({ data: { id: "msg_2" }, error: null });

    await sendEmail(email);

    const sent = send.mock.calls[0][0];
    expect(sent.to).toEqual(["demo@example.com"]);
    expect(sent.text).toContain("cliente@example.com, almacen@example.com");
    expect(sent.text).toContain(email.text);
  });

  it("RF-06 reports a provider error as a failed delivery in Spanish", async () => {
    send.mockResolvedValue({ data: null, error: { message: "Invalid `to` field.", name: "validation_error" } });
    const result = await sendEmail(email);
    expect(result).toEqual({ ok: false, simulated: false, error: "No se pudo enviar el correo. Invalid `to` field." });
  });

  it("RF-06 reports a network failure as a failed delivery", async () => {
    send.mockRejectedValue(new Error("fetch failed"));
    expect(await sendEmail(email)).toEqual({ ok: false, simulated: false, error: "No se pudo enviar el correo. fetch failed" });
  });
});
