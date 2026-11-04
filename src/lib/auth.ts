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
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    // Public sign-up is off (D-14). Accounts come from scripts/seed.ts and the Usuarios screen
    emailAndPassword: { enabled: true, disableSignUp: true },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "query", input: false },
        employeeId: { type: "string", required: false, input: false },
      },
    },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  instance ??= createAuth();
  return instance;
}

export type Role = "transaction" | "query";
