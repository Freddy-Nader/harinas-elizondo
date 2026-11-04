import { z } from "zod";

/** RF-03 · UC-02 · BR-CLI-01/02. The SAP key and RFC are validated server-side. */
export const clientInputSchema = z.object({
  sapKey: z.string().trim().min(1, "La clave SAP es obligatoria.").max(10, "La clave SAP admite máximo 10 caracteres."),
  businessName: z.string().trim().min(1, "La razón social es obligatoria.").max(150),
  rfc: z.string().trim().toUpperCase().refine(
    (value) => !value || /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(value),
    "El RFC no tiene un formato válido.",
  ),
  deliveryAddress: z.string().trim().max(250),
  contactName: z.string().trim().max(100),
  contactEmail: z.union([z.literal(""), z.email("El correo no tiene un formato válido.")]),
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
