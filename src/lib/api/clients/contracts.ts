import { z } from "zod";
import { clientInputSchema } from "@/lib/domain/client-validation";
import type { Contract, FieldMeta } from "@/lib/api/contract";

/** RF-03 · UC-02. The labels are the ones the Clientes form shows. */
export const clientFields = [
  { name: "sapKey", label: "Clave SAP", kind: "text", required: true },
  { name: "businessName", label: "Razón social", kind: "text", required: true },
  { name: "rfc", label: "RFC", kind: "text", required: true },
  { name: "contactEmail", label: "Correo de contacto", kind: "email", required: true },
  { name: "contactName", label: "Nombre de contacto", kind: "text", required: true },
  { name: "fiscalAddress", label: "Dirección fiscal", kind: "text", required: true },
  { name: "deliveryAddresses", label: "Direcciones de entrega", kind: "list", required: true },
  { name: "requiresCertificate", label: "Requiere certificado de calidad", kind: "boolean", required: false },
] as const satisfies readonly FieldMeta[];

export type ClientFieldName = (typeof clientFields)[number]["name"];

/** Label of a field with the "*" the form prints on required ones. */
export function clientLabel(name: ClientFieldName) {
  const field = clientFields.find((entry) => entry.name === name)!;
  return field.required ? `${field.label} *` : field.label;
}

export const clientCreateContract = {
  name: "clients.create",
  roles: ["transaction"],
  input: clientInputSchema,
  fields: clientFields,
} satisfies Contract;

export const clientUpdateContract = {
  name: "clients.update",
  roles: ["transaction"],
  input: clientInputSchema.extend({ id: z.uuid({ error: (issue) => issue.input === undefined ? "Falta el identificador del cliente." : "El identificador del cliente no es válido." }) }),
  fields: [{ name: "id", label: "Identificador del cliente", kind: "text", required: true }, ...clientFields],
} satisfies Contract;

export const clientListContract = {
  name: "clients.list",
  roles: ["transaction"],
  input: z.object({}),
  fields: [],
} satisfies Contract;
