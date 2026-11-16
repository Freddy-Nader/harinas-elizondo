/**
 * What every use case returns, so the site, the API and the CLI report the same thing.
 * `kind` tells an adapter which answer fits: 400 invalid, 404 not found, 409 conflict.
 */
export type Result<T> =
  | { ok: true; data: T; message: string }
  | { ok: false; kind: "invalid" | "not_found" | "conflict"; message: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T, message: string): Result<T> {
  return { ok: true, data, message };
}

export function failure(kind: "invalid" | "not_found" | "conflict", message: string, fieldErrors?: Record<string, string>): Result<never> {
  return { ok: false, kind, message, fieldErrors };
}
