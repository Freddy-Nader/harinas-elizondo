import type { Role } from "@/lib/auth";

/**
 * Single source for navigation and module placeholders.
 * `href` and the text fields are user-facing, so they are in Spanish.
 * `requirement` / `useCase` point to docs/llm/requirements.md.
 */
export type AppModule = {
  href: string;
  title: string;
  summary: string;
  requirement: string;
  useCase: string;
  roles: readonly Role[];
};

export const MODULES: readonly AppModule[] = [
  {
    href: "/clientes",
    title: "Clientes",
    summary:
      "Alta, consulta, modificación e inactivación de clientes con su clave SAP ByD y sus valores de referencia particulares.",
    requirement: "RF-03",
    useCase: "UC-02",
    roles: ["transaction"],
  },
  {
    href: "/equipos",
    title: "Equipos",
    summary:
      "Alveógrafos y farinógrafos con clave generada por el sistema, parámetros que analizan y límites internacionales.",
    requirement: "RF-02",
    useCase: "UC-01",
    roles: ["transaction"],
  },
  {
    href: "/lotes",
    title: "Lotes",
    summary: "Alta de lotes de producción con producto, fecha de producción y caducidad.",
    requirement: "RF-04",
    useCase: "UC-03",
    roles: ["transaction"],
  },
  {
    href: "/inspecciones",
    title: "Inspecciones",
    summary:
      "Captura de resultados por lote. La secuencia (A, B, … Z, AA) la asigna el sistema y la última inspección completa se usa para certificar.",
    requirement: "RF-04",
    useCase: "UC-03 · UC-04",
    roles: ["transaction"],
  },
  {
    href: "/certificados",
    title: "Certificados",
    summary:
      "Emisión del certificado en PDF con resultados, valores de referencia y desviación, y envío al cliente y a Almacén.",
    requirement: "RF-05 · RF-06",
    useCase: "UC-05 · UC-06 · UC-07",
    roles: ["transaction"],
  },
  {
    href: "/reportes",
    title: "Reportes",
    summary:
      "Histórico de certificados con filtros, gráficas por periodo y exportación a Excel para Power BI.",
    requirement: "RF-07",
    useCase: "UC-08",
    roles: ["transaction", "query"],
  },
  {
    href: "/bitacora",
    title: "Bitácora",
    summary: "Quién hizo qué y cuándo en clientes, equipos, inspecciones y certificados.",
    requirement: "RF-08",
    useCase: "—",
    roles: ["transaction", "query"],
  },
];

export function findModule(href: string) {
  const mod = MODULES.find((m) => m.href === href);
  if (!mod) throw new Error(`Unknown module ${href}`);
  return mod;
}
