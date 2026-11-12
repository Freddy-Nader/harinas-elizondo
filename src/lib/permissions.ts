import type { Role } from "@/lib/auth";
import { MODULES } from "@/lib/modules";

/**
 * RF-01. Pure access rules shared by the nav, the pages and the server actions.
 * Transaction users can do everything. Query users only read reports, history and the audit log.
 */
export const ROLES = ["transaction", "query", "admin"] as const satisfies readonly Role[];

/** Spanish labels shown in the UI. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  transaction: "Usuario de transacción",
  query: "Usuario de consulta",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Routes every signed-in user can open, whatever the role. */
const OPEN_ROUTES = ["/panel"];

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * RF-01. Whether a role may open a route. Module routes follow `roles` in modules.ts.
 * Anything unknown is transaction-only, so a new screen is closed by default.
 */
export function canAccess(role: Role, pathname: string): boolean {
  if (OPEN_ROUTES.some((href) => matches(pathname, href))) return true;
  const mod = MODULES.find((m) => matches(pathname, m.href));
  if (mod) return mod.roles.includes(role);
  return role === "transaction";
}

/** Whether a role may run mutations (create, update, issue). Only transaction users can. */
export function canMutate(role: Role): boolean {
  return role === "transaction";
}

/**
 * Where to send the user after signing in. Accepts only same-site paths, so a crafted
 * `?next=https://evil.test` or `?next=//evil.test` falls back to the panel.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/panel";
  }
  if (value === "/login" || value.startsWith("/login?") || value.startsWith("/api/")) {
    return "/panel";
  }
  return value;
}
