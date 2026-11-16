import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

/**
 * RF-01. Two roles: "transaction" (full access) and "query" (reports only).
 * employeeId is stored with every audited action (RF-08).
 */
function createAuth() {
  return betterAuth({
    databaseHooks: {
      session: { create: { before: async (session) => {
        const account = await getDb().query.user.findFirst({
          where: (user, { eq }) => eq(user.id, session.userId),
          columns: { active: true },
        });
        return account?.active === true;
      } } },
    },
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    // Public sign-up is off (D-14). Accounts come from scripts/seed.ts and the Usuarios screen
    emailAndPassword: { enabled: true, disableSignUp: true },
    user: {
      additionalFields: {
        active: { type: "boolean", defaultValue: true, input: false },
        role: { type: "string", required: false, defaultValue: "query", input: false },
        employeeId: { type: "string", required: false, input: false },
      },
    },
    // RF-01. Counters live in Postgres because serverless instances do not share memory (D-28)
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  instance ??= createAuth();
  return instance;
}

export type Role = "transaction" | "query" | "admin";
