import { z } from "zod";
import { PARAMETERS, type EquipmentType } from "./parameters";

/**
 * RF-04 · UC-03 · UC-04. Pure rules for production lots and their inspections.
 */

/** Lot code as printed by production: letters, digits and dashes, stored uppercase. */
export const LOT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{0,19}$/;

export function normalizeLotCode(value: string) {
  return value.trim().toUpperCase();
}

const date = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatoria.`)
    .refine((v) => z.iso.date().safeParse(v).success, `${label} no es válida.`);

/** UC-03. Product and dates. The code is captured only on create. */
export const lotDataSchema = z
  .object({
    product: z
      .string()
      .trim()
      .min(1, "El producto es obligatorio.")
      .max(60, "El producto admite máximo 60 caracteres."),
    producedOn: date("La fecha de producción"),
    expiresOn: date("La fecha de caducidad"),
  })
  .refine((v) => v.expiresOn > v.producedOn, {
    path: ["expiresOn"],
    message: "La caducidad debe ser posterior a la fecha de producción.",
  });

export const lotCodeSchema = z
  .string()
  .transform(normalizeLotCode)
  .refine((v) => v.length > 0, "El número de lote es obligatorio.")
  .refine((v) => v.length <= 20, "El número de lote admite máximo 20 caracteres.")
  .refine(
    (v) => !v || v.length > 20 || LOT_CODE_PATTERN.test(v),
    "Usa solo letras, números y guiones.",
  );

export type InspectionSummary = { sequence: string; complete: boolean; locked: boolean };

/**
 * BR-INS-04 · D-15. Whether a new inspection can start for a lot, given its latest one.
 * The first one needs nothing. After an incomplete one, finish that one first. After a
 * complete one it is a re-inspection and needs the equipment-failure reason.
 */
export function startInspection(
  latest: InspectionSummary | null,
  reason: string,
): { ok: true; reinspection: boolean; reason: string | null } | { ok: false; error: string } {
  if (!latest) return { ok: true, reinspection: false, reason: null };
  if (!latest.complete) {
    return {
      ok: false,
      error: `Completa la inspección ${latest.sequence} antes de crear otra.`,
    };
  }
  const trimmed = reason.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Una nueva inspección necesita el motivo de la falla del equipo.",
    };
  }
  if (trimmed.length > 200) return { ok: false, error: "El motivo admite máximo 200 caracteres." };
  return { ok: true, reinspection: true, reason: trimmed };
}

/** Raw form input for one inspection: equipment per machine and a text value per parameter. */
export type ResultsForm = {
  equipment: Partial<Record<EquipmentType, string>>;
  values: Record<string, string>;
};

export type ParsedResults = {
  /** Values to store, by parameter code */
  values: Record<string, number>;
  /** Equipment used per machine, only for machines with at least one value */
  equipment: Partial<Record<EquipmentType, string>>;
  /** Parameters left blank, to clear if they had a value */
  cleared: string[];
};

/**
 * RF-04. Parses captured results. Blank is allowed (the inspection stays incomplete).
 * A machine with any value needs its equipment. Values are non-negative numbers, and a
 * comma works as the decimal separator.
 */
export function parseResults(
  input: ResultsForm,
): { ok: true; data: ParsedResults } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const values: Record<string, number> = {};
  const cleared: string[] = [];
  const used = new Set<EquipmentType>();

  for (const p of PARAMETERS) {
    const raw = (input.values[p.code] ?? "").trim().replace(",", ".");
    if (raw === "") {
      cleared.push(p.code);
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) errors[p.code] = "Escribe un número.";
    else if (n < 0) errors[p.code] = "No puede ser negativo.";
    else if (Math.abs(n) >= 10_000_000) errors[p.code] = "El valor es demasiado grande.";
    else {
      values[p.code] = n;
      used.add(p.equipmentType);
    }
  }

  const equipment: Partial<Record<EquipmentType, string>> = {};
  for (const type of used) {
    const id = (input.equipment[type] ?? "").trim();
    if (!id) errors[`equipment_${type}`] = "Elige el equipo con que se midió.";
    else equipment[type] = id;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: { values, equipment, cleared } };
}
