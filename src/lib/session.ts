import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/lib/auth";
import { getAuth } from "@/lib/auth";
import { canMutate, isRole } from "@/lib/permissions";

/**
 * Data access layer for the session (RF-01). Pages decide what to show with these
 * helpers, server actions call `requireRole` before touching data.
 *
 * Reading the session reads request headers, so every caller must render inside
 * a <Suspense> boundary (Cache Components, see docs/llm/architecture.md).
 */

/** The narrow user every screen and audit row needs. Never the raw session. */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
};

/** Thrown by `requireRole` when the signed-in user lacks the role. Message is user-facing. */
export class ForbiddenError extends Error {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Current user or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // Read the request first. During prerender this suspends, so the DB is never touched at build time
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email, role, employeeId } = session.user;
  return {
    id,
    name,
    email,
    // An unknown role in the DB gets the least privilege
    role: isRole(role) ? role : "query",
    employeeId: employeeId ?? null,
  };
});

/** Current user, or a redirect to /login. Use in pages and server components. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * RF-01. Use at the top of every server action and data function that needs a role.
 * Redirects when there is no session and throws ForbiddenError when the role is wrong.
 * With no roles given it requires a role that can mutate (transaction).
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  const allowed = roles.length > 0 ? roles.includes(user.role) : canMutate(user.role);
  if (!allowed) throw new ForbiddenError();
  return user;
}
