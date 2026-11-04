/**
 * Shape every form action returns to `useActionState`. `at` changes on each run, so the
 * form can show a toast exactly once per submit.
 */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  at?: number;
};

export const initialActionState: ActionState = { ok: false };

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors, at: Date.now() };
}

export function succeed(message: string): ActionState {
  return { ok: true, message, at: Date.now() };
}

/** First message per field from a Zod error, keyed by the top-level path. */
export function fieldErrorsFrom(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * Postgres error code and constraint from a Drizzle or Neon error, so actions can turn a
 * unique violation (23505) into a field message instead of a 500.
 */
export function pgError(error: unknown): { code?: string; constraint?: string } {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && "code" in candidate) {
      const { code, constraint } = candidate as { code?: unknown; constraint?: unknown };
      return {
        code: typeof code === "string" ? code : undefined,
        constraint: typeof constraint === "string" ? constraint : undefined,
      };
    }
  }
  return {};
}
