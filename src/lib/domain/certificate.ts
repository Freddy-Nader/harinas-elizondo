import { createHash } from "node:crypto";
import { z } from "zod";
import { sequenceToNumber } from "./inspection-sequence";
import { PARAMETERS, type EquipmentType } from "./parameters";
import { evaluate, resolveReferenceValues, type Evaluation, type LimitsByParameter } from "./quality";

/**
 * RF-05 · RF-06 · UC-05 / UC-06. Pure rules for quality certificates.
 * Lifecycle: draft → issued (lines snapshotted, inspection locked, hash stored) → sent
 * (delivery evidence). Issued or sent can be cancelled with a reason, never deleted (D-25).
 */

export type CertificateStatus = "draft" | "issued" | "sent" | "cancelled";

export const CERTIFICATE_STATUS_LABEL: Record<CertificateStatus, string> = {
  draft: "Borrador",
  issued: "Emitido",
  sent: "Enviado",
  cancelled: "Cancelado",
};

// ---------------------------------------------------------------------------
// D-17. Certificate id CER-YYYY-NNNNNN, a 6-digit counter that restarts every year
// ---------------------------------------------------------------------------

const ID_PATTERN = /^CER-(\d{4})-(\d{6})$/;
const MAX_COUNTER = 999_999;

export function isCertificateId(value: string): boolean {
  return ID_PATTERN.test(value);
}

export function formatCertificateId(year: number, counter: number): string {
  if (!Number.isInteger(counter) || counter < 1 || counter > MAX_COUNTER) {
    throw new RangeError(`Certificate counter out of range: ${counter}`);
  }
  return `CER-${year}-${String(counter).padStart(6, "0")}`;
}

/** D-17. Next id for `year`, given the highest id issued that year (or null for the first). */
export function nextCertificateId(lastOfYear: string | null, year: number): string {
  const match = lastOfYear ? ID_PATTERN.exec(lastOfYear) : null;
  const counter = match && Number(match[1]) === year ? Number(match[2]) + 1 : 1;
  return formatCertificateId(year, counter);
}

// ---------------------------------------------------------------------------
// BR-CER-01. The certificate uses the LATEST inspection of the lot, and only if it is
// complete. An older complete one is never picked silently (professor review 2026-11-04)
// ---------------------------------------------------------------------------

export type InspectionCandidate = { id: number; sequence: string; complete: boolean };

export type InspectionPick<T> =
  | { ok: true; inspection: T }
  | { ok: false; reason: "none" }
  | { ok: false; reason: "incomplete"; inspection: T };

export function latestInspection<T extends InspectionCandidate>(inspections: readonly T[]): T | null {
  let latest: T | null = null;
  for (const inspection of inspections) {
    if (!latest || sequenceToNumber(inspection.sequence) > sequenceToNumber(latest.sequence)) latest = inspection;
  }
  return latest;
}

export function pickCertifiableInspection<T extends InspectionCandidate>(inspections: readonly T[]): InspectionPick<T> {
  const latest = latestInspection(inspections);
  if (!latest) return { ok: false, reason: "none" };
  if (!latest.complete) return { ok: false, reason: "incomplete", inspection: latest };
  return { ok: true, inspection: latest };
}

/** User-facing reason a lot cannot be certified right now, or null when it can. */
export function inspectionProblem(pick: InspectionPick<InspectionCandidate>): string | null {
  if (pick.ok) return null;
  if (pick.reason === "none") return "El lote no tiene inspecciones registradas.";
  return `La última inspección del lote (${pick.inspection.sequence}) está incompleta. Complétala antes de certificar.`;
}

// ---------------------------------------------------------------------------
// BR-CER-02 · BR-REF-01 · BR-CER-04 · D-10. Certificate lines
// ---------------------------------------------------------------------------

export type CertificateLine = {
  parameterCode: string;
  label: string;
  unit: string;
  equipmentType: EquipmentType;
  value: number;
  lowerLimit: number;
  upperLimit: number;
  deviation: number;
  status: Evaluation["status"];
  /** Where the limits came from. Only known while previewing; snapshots store the numbers only. */
  source?: "client" | "international";
};

export type LinesResult =
  | { ok: true; lines: CertificateLine[] }
  | { ok: false; missingResults: string[]; missingLimits: string[] };

/**
 * Builds the ten lines the certificate prints: the inspection value, the client's limits
 * (or the international ones, BR-REF-01) and the signed deviation (BR-CER-04). Out-of-range
 * values never block. Missing results (BR-CER-02) or limits do.
 */
export function buildCertificateLines(
  results: Record<string, number | null | undefined>,
  international: LimitsByParameter,
  client: LimitsByParameter | null,
): LinesResult {
  const limits = resolveReferenceValues(international, client);
  const missingResults: string[] = [];
  const missingLimits: string[] = [];
  const lines: CertificateLine[] = [];

  for (const p of PARAMETERS) {
    const value = results[p.code];
    const limit = limits[p.code];
    if (value === null || value === undefined || Number.isNaN(value)) missingResults.push(p.code);
    if (!limit) missingLimits.push(p.code);
    if (value === null || value === undefined || Number.isNaN(value) || !limit) continue;

    const { status, deviation } = evaluate(value, limit);
    lines.push({
      parameterCode: p.code,
      label: p.label,
      unit: p.unit,
      equipmentType: p.equipmentType,
      value,
      lowerLimit: limit.lower,
      upperLimit: limit.upper,
      deviation,
      status,
      source: client?.[p.code] ? "client" : "international",
    });
  }

  if (missingResults.length || missingLimits.length) return { ok: false, missingResults, missingLimits };
  return { ok: true, lines };
}

/** Rebuilds display lines from the stored snapshot (D-10), in the catalog order. */
export function linesFromSnapshot(
  rows: readonly { parameterCode: string; value: number; lowerLimit: number; upperLimit: number; deviation: number }[],
): CertificateLine[] {
  return PARAMETERS.flatMap((p) => {
    const row = rows.find((r) => r.parameterCode === p.code);
    if (!row) return [];
    return [
      {
        parameterCode: p.code,
        label: p.label,
        unit: p.unit,
        equipmentType: p.equipmentType,
        value: row.value,
        lowerLimit: row.lowerLimit,
        upperLimit: row.upperLimit,
        deviation: row.deviation,
        status: row.deviation < 0 ? "below" : row.deviation > 0 ? "above" : "within",
      },
    ];
  });
}

export function countDeviations(lines: readonly CertificateLine[]): number {
  return lines.filter((l) => l.status !== "within").length;
}

// ---------------------------------------------------------------------------
// Form input. Order data on create, shipping data any time before issuing
// ---------------------------------------------------------------------------

/** Number typed in the form: blank → null, comma works as decimal separator. */
const optionalQuantity = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(",", "."))
    .refine((v) => v === "" || Number.isFinite(Number(v)), `${label} debe ser un número.`)
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || v > 0, `${label} debe ser mayor que cero.`)
    .refine((v) => v === null || v < 10_000_000, `${label} es demasiado grande.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} admite máximo ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || z.iso.date().safeParse(v).success, `${label} no es válida.`)
    .transform((v) => (v === "" ? null : v));

/** UC-05. Everything the user types for a certificate. */
export const certificateInputSchema = z.object({
  clientId: z.uuid("Elige un cliente."),
  lotId: z.string().trim().min(1, "Elige un lote.").max(20, "Lote no válido."),
  purchaseOrder: z
    .string()
    .trim()
    .min(1, "La orden de compra es obligatoria.")
    .max(20, "La orden de compra admite máximo 20 caracteres."),
  quantityRequested: optionalQuantity("La cantidad solicitada"),
  quantityDelivered: optionalQuantity("La cantidad entregada"),
  invoiceNumber: optionalText("La factura", 20),
  shippedOn: optionalDate("La fecha de envío"),
  /** One of the client's destinations (D-22). The action copies its text (D-24) */
  deliveryAddressId: z
    .string()
    .trim()
    .refine((v) => v === "" || z.uuid().safeParse(v).success, "Elige una dirección de entrega.")
    .transform((v) => (v === "" ? null : v)),
  carrier: optionalText("El transportista", 100),
  requiresSignature: z.boolean(),
});

export type CertificateInput = z.output<typeof certificateInputSchema>;

export const CERTIFICATE_FIELD_LABEL: Record<string, string> = {
  clientId: "Cliente",
  lotId: "Lote",
  purchaseOrder: "Orden de compra",
  quantityRequested: "Cantidad solicitada",
  quantityDelivered: "Cantidad entregada",
  invoiceNumber: "Factura",
  shippedOn: "Fecha de envío",
  deliveryAddress: "Dirección de entrega",
  carrier: "Transportista",
  requiresSignature: "Firma",
};

// ---------------------------------------------------------------------------
// BR-CER-05 and the other checks before a certificate can be issued
// ---------------------------------------------------------------------------

export type IssueCheckInput = {
  status: CertificateStatus;
  purchaseOrder: string | null;
  invoiceNumber: string | null;
  quantityDelivered: number | null;
  shippedOn: string | null;
  deliveryAddress: string | null;
  carrier: string | null;
  client: { status: "active" | "inactive" | "retired" };
  lot: { producedOn: string; expiresOn: string };
  /** From `inspectionProblem`: null when the latest inspection is complete */
  inspectionProblem: string | null;
};

/**
 * Everything that stops a draft from being issued, as user-facing Spanish messages.
 * Empty list means it can be issued. Deviations are not here on purpose (BR-CER-04).
 */
export function issueBlockers(c: IssueCheckInput): string[] {
  const blockers: string[] = [];
  if (c.status !== "draft") blockers.push("El certificado ya fue emitido.");
  if (c.client.status !== "active") blockers.push("El cliente está inactivo.");
  if (c.inspectionProblem) blockers.push(c.inspectionProblem);
  if (!c.purchaseOrder) blockers.push("Falta la orden de compra.");
  // BR-CER-05. Invoice and shipping data before closing (carrier and destination, D-24)
  if (!c.invoiceNumber) blockers.push("Falta el número de factura.");
  if (c.quantityDelivered === null) blockers.push("Falta la cantidad entregada.");
  if (!c.shippedOn) blockers.push("Falta la fecha de envío.");
  if (!c.deliveryAddress) blockers.push("Falta la dirección de entrega.");
  if (!c.carrier) blockers.push("Falta el transportista.");
  if (c.shippedOn && c.shippedOn < c.lot.producedOn) {
    blockers.push("La fecha de envío es anterior a la producción del lote.");
  }
  if (c.shippedOn && c.shippedOn > c.lot.expiresOn) {
    blockers.push("La fecha de envío es posterior a la caducidad del lote.");
  }
  return blockers;
}

// ---------------------------------------------------------------------------
// D-26. Signature hash: SHA-256 of what the certificate states, fixed at issue time
// ---------------------------------------------------------------------------

export type HashableCertificate = {
  id: string;
  clientSapKey: string;
  lotId: string;
  inspectionSequence: string;
  purchaseOrder: string;
  invoiceNumber: string | null;
  quantityRequested: number | null;
  quantityDelivered: number | null;
  shippedOn: string | null;
  deliveryAddress: string | null;
  carrier: string | null;
  issuedAt: Date;
  issuerEmployeeId: string | null;
  lines: readonly { parameterCode: string; value: number; lowerLimit: number; upperLimit: number; deviation: number }[];
};

/**
 * Deterministic: fixed key order and lines sorted by code, so recomputing it later from the
 * stored row and snapshot gives the same hash unless something was altered.
 */
export function certificateHash(c: HashableCertificate): string {
  const canonical = JSON.stringify([
    "harinas-elizondo/certificate/v1",
    c.id,
    c.clientSapKey,
    c.lotId,
    c.inspectionSequence,
    c.purchaseOrder,
    c.invoiceNumber,
    c.quantityRequested,
    c.quantityDelivered,
    c.shippedOn,
    c.deliveryAddress,
    c.carrier,
    c.issuedAt.toISOString(),
    c.issuerEmployeeId,
    [...c.lines]
      .sort((a, b) => a.parameterCode.localeCompare(b.parameterCode))
      .map((l) => [l.parameterCode, l.value, l.lowerLimit, l.upperLimit, l.deviation]),
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

// ---------------------------------------------------------------------------
// D-25. Cancellation
// ---------------------------------------------------------------------------

/** Issued or sent certificates can be cancelled with a reason. Drafts are just left unissued. */
export function cancelCheck(status: CertificateStatus, reason: string): { ok: true; reason: string } | { ok: false; error: string } {
  if (status === "draft") return { ok: false, error: "Un borrador no se cancela: simplemente no lo emitas." };
  if (status === "cancelled") return { ok: false, error: "El certificado ya está cancelado." };
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "Escribe el motivo de la cancelación." };
  if (trimmed.length > 200) return { ok: false, error: "El motivo admite máximo 200 caracteres." };
  return { ok: true, reason: trimmed };
}

// ---------------------------------------------------------------------------
// RF-06 · UC-06. Who gets the email
// ---------------------------------------------------------------------------

/**
 * The client contact (when it has an email) and the warehouse, without duplicates.
 * Q-16 (special clients only?) is open, so for now every client with an email gets it.
 */
export function deliveryRecipients(clientEmail: string | null | undefined, warehouseEmail: string): string[] {
  const list = [clientEmail?.trim(), warehouseEmail.trim()].filter((v): v is string => Boolean(v));
  return [...new Set(list.map((v) => v.toLowerCase()))];
}

/** PDF base fonts only cover Latin-1, so unit glyphs like ₂ or ⁻⁴ are spelled out. */
export function pdfSafeText(text: string): string {
  const map: Record<string, string> = {
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    "⁻": "^-", "–": "-", "—": "-", "…": "...",
  };
  return text.replace(/[₀-₉⁰¹²³⁴-⁹⁻–—…]/g, (ch) => map[ch] ?? ch);
}
