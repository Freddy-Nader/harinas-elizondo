import { z } from "zod";

/** RF-01. Validates the inputs of `scripts/set-password.ts` without touching a database. */
export function parseSetPasswordInput(emailRaw: string | undefined, password: string | undefined) {
  const email = z.email().max(100).safeParse(emailRaw?.trim().toLowerCase());
  if (!email.success || !password || password.length < 16 || password.length > 128) return null;
  return { email: email.data, password };
}
