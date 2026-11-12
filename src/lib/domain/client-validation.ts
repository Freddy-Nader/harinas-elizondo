import { z } from "zod";

/** RF-03 · UC-02 · BR-CLI-01/02. The SAP key and RFC are validated server-side. */
export const clientInputSchema = z.object({
  sapKey: z.string().trim().min(1, "La clave SAP es obligatoria.").max(10, "La clave SAP admite máximo 10 caracteres."),
  businessName: z.string().trim().min(1, "La razón social es obligatoria.").max(150),
  rfc: z.string().trim().min(1, "El RFC es obligatorio.").toUpperCase().refine(
    (value) => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(value),
    "El RFC no tiene un formato válido.",
  ),
  fiscalAddress: z.string().trim().min(1, "La dirección fiscal es obligatoria.").max(250),
  deliveryAddresses: z.array(z.string().trim().min(1).max(250, "Cada dirección admite máximo 250 caracteres."))
    .min(1, "Captura al menos una dirección de entrega."),
  contactName: z.string().trim().min(1, "El nombre del contacto es obligatorio.").max(100),
  contactEmail: z.email("El correo no tiene un formato válido.").max(100),
  requiresCertificate: z.boolean(),
});

export const limitInputSchema = z.object({
  parameterCode: z.string().min(1),
  lowerLimit: z.number().finite(),
  upperLimit: z.number().finite(),
}).refine((value) => value.lowerLimit <= value.upperLimit, {
  message: "El límite inferior no puede superar al superior.",
});

export function optionalText(value: string): string | null {
  return value.trim() || null;
}

/** BR-REF-01: particular limits may narrow the international range, never widen it. */
export function isWithinInternational(
  particular: { lowerLimit: number; upperLimit: number },
  international: { lowerLimit: number; upperLimit: number },
) {
  return particular.lowerLimit >= international.lowerLimit
    && particular.upperLimit <= international.upperLimit;
}
