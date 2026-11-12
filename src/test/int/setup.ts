import { afterAll, beforeAll, vi } from "vitest";
import { assertSafeTestDatabaseUrl } from "./guard";

/**
 * Per-file setup of the integration suite (`*.int.test.ts`, PC-xx in docs/llm/testing.md).
 * The database, the SQL, the constraints and the transactions are real. What is replaced:
 *
 * - `@/lib/db`: same Drizzle schema over node-postgres, because the Neon HTTP driver cannot
 *   reach a plain Postgres (see db.ts).
 * - `@/lib/auth`: the session, so each test picks its role (see session.ts).
 * - `next/headers`, `next/cache`, `next/navigation` and `server-only`: they only work inside
 *   a Next.js request. `redirect` throws `REDIRECT:<path>`, like in the unit tests.
 */

// If anything bypasses the mock below, it still cannot reach a real database.
process.env.DATABASE_URL = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const { testDb } = await import("./db");
  return { getDb: () => testDb };
});
vi.mock("@/lib/auth", async () => {
  const { currentSession } = await import("./session");
  return { getAuth: () => ({ api: { getSession: async () => currentSession() } }) };
});
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

// Clean tables and fresh base data for every test file.
beforeAll(async () => {
  const [{ resetDatabase }, { signOut }] = await Promise.all([import("./db"), import("./session")]);
  signOut();
  await resetDatabase();
});

afterAll(async () => {
  const { closeDatabase } = await import("./db");
  await closeDatabase();
});
