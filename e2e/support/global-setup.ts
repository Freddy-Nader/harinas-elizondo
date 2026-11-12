import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import migrate from "../../src/test/int/global-setup";
import { closeDatabase, resetDatabase, testDb, TEST_USERS } from "../../src/test/int/db";
import { account } from "../../src/lib/db/schema";
import { E2E_PASSWORD } from "./users";

/**
 * Runs once before the e2e suite. Reuses the integration setup of issue #21: the guard,
 * a clean schema from every migration in `drizzle/`, then the same synthetic base data as
 * scripts/seed.ts (ten parameters, demo international limits) with one user per role.
 * scripts/seed.ts itself talks to Neon over HTTP, so it cannot seed a plain Postgres.
 */
export default async function globalSetup() {
  await migrate();
  try {
    await resetDatabase();
    const hash = await hashPassword(E2E_PASSWORD);
    // Better Auth's email/password sign-in reads the hash from a "credential" account
    await testDb.insert(account).values(
      Object.values(TEST_USERS).map((user) => ({
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hash,
      })),
    );
  } finally {
    await closeDatabase();
  }
}
