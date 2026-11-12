import type { AuditAction, AuditEntity } from "@/lib/audit";
import { PARAMETERS } from "@/lib/domain/parameters";

/**
 * RF-08. Spanish labels for the English codes stored in `audit_log`.
 * Unknown codes (a module added later, or a legacy row) fall back to the raw code,
 * so the screen never breaks on a value it does not know.
 */
export const ENTITY_LABEL: Record<AuditEntity, string> = {
  client: "Cliente",
  client_limit: "Límite particular de cliente",
  equipment: "Equipo",
  parameter: "Parámetro",
  international_limit: "Límite internacional",
  lot: "Lote",
  inspection: "Inspección",
  certificate: "Certificado",
  delivery: "Envío",
  user: "Usuario",
};

/** Codes written by a module that differ from `AuditEntity`. Clientes writes the plural. */
const ENTITY_ALIAS: Record<string, AuditEntity> = { clients: "client" };

/** Actions outside `AuditAction` that Clientes writes for particular limits. */
const EXTRA_ACTION_LABEL: Record<string, string> = {
  update_limit: "Cambio de límite particular",
  remove_limit: "Eliminación de límite particular",
};

export const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Alta",
  update: "Modificación",
  deactivate: "Inactivación",
  reactivate: "Reactivación",
  retire: "Baja",
  close: "Cierre",
  reinspect: "Reinspección",
  issue: "Emisión",
  send: "Envío",
  resend: "Reenvío",
  cancel: "Cancelación",
  export: "Exportación",
};

const has = <T extends object>(map: T, key: string): key is Extract<keyof T, string> => Object.hasOwn(map, key);

/** The `AuditEntity` a stored code stands for, or the code itself when unknown. */
export function canonicalEntity(entity: string): string {
  return has(ENTITY_ALIAS, entity) ? ENTITY_ALIAS[entity] : entity;
}

/** Every stored code that means the same entity, for the entity filter. */
export function entityCodes(entity: string): string[] {
  const canonical = canonicalEntity(entity);
  const aliases = Object.keys(ENTITY_ALIAS).filter((code) => ENTITY_ALIAS[code] === canonical);
  return [canonical, ...aliases];
}

export function entityLabel(entity: string): string {
  const canonical = canonicalEntity(entity);
  return has(ENTITY_LABEL, canonical) ? ENTITY_LABEL[canonical] : entity;
}

export function actionLabel(action: string): string {
  if (has(ACTION_LABEL, action)) return ACTION_LABEL[action];
  return has(EXTRA_ACTION_LABEL, action) ? EXTRA_ACTION_LABEL[action] : action;
}

/** What to show as the entity's identifier. International limits are keyed by parameter code. */
export function entityIdLabel(entity: string, entityId: string): string {
  if (entity === "international_limit" || entity === "parameter") {
    return PARAMETERS.find((p) => p.code === entityId)?.label ?? entityId;
  }
  return entityId;
}

/** Detail page of the entity, or null when the entity has no page of its own. */
export function entityHref(entity: string, entityId: string): string | null {
  const id = encodeURIComponent(entityId);
  switch (canonicalEntity(entity)) {
    case "client":
      return `/clientes?editar=${id}`;
    case "equipment":
      return `/equipos/${id}`;
    case "lot":
      return `/lotes/${id}`;
    case "inspection":
      return `/inspecciones/${id}`;
    case "certificate":
      return `/certificados/${id}`;
    default:
      return null;
  }
}

/** Options for the filter selects, in the order the user reads them. */
export const ENTITY_OPTIONS = (Object.keys(ENTITY_LABEL) as AuditEntity[]).map((value) => ({
  value,
  label: ENTITY_LABEL[value],
}));

export const ACTION_OPTIONS = [
  ...(Object.keys(ACTION_LABEL) as AuditAction[]).map((value) => ({ value, label: ACTION_LABEL[value] })),
  ...Object.entries(EXTRA_ACTION_LABEL).map(([value, label]) => ({ value, label })),
];
