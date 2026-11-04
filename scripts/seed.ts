/**
 * Seed (D-14). Idempotent, safe to run more than once: existing rows are left alone.
 *
 *   pnpm db:seed
 *
 * Creates the ten parameters, demo international limits and one demo user per role.
 * Demo users share the password in SEED_PASSWORD (.env.local, never committed).
 *
 * Runs outside Next.js, so it builds its own DB client instead of importing
 * src/lib/db (which is "server-only").
 */
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { PARAMETERS } from "../src/lib/domain/parameters";
import * as schema from "../src/lib/db/schema";

config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL;
const password = process.env.SEED_PASSWORD;
if (!url) throw new Error("DATABASE_URL is not set. Run `vercel env pull .env.local` first.");
if (!password || password.length < 8) {
  throw new Error("SEED_PASSWORD (8+ chars) is not set in .env.local");
}

const db = drizzle(neon(url), { schema, casing: "snake_case" });

/**
 * Demo values for typical bread flour so the app can be shown end to end.
 * Not official. The team still has to confirm units and ranges (decisions.md Q-11).
 */
const DEMO_INTERNATIONAL_LIMITS: Record<string, [number, number]> = {
  ALV_P: [60, 90],
  ALV_L: [80, 120],
  ALV_W: [250, 350],
  ALV_PL: [0.5, 1.0],
  ALV_IE: [45, 60],
  FAR_ABS: [58, 64],
  FAR_DEV: [2, 6],
  FAR_STA: [8, 15],
  FAR_SOF: [30, 80],
  FAR_ARR: [1, 2.5],
};

const DEMO_USERS = [
  { email: "laboratorio@demo.test", name: "Laboratorio Demo", employeeId: "E0001", role: "transaction" },
  { email: "consulta@demo.test", name: "Gerencia Demo", employeeId: "E0002", role: "query" },
] as const;

async function main() {
  await db
    .insert(schema.parameters)
    .values(PARAMETERS.map(({ code, equipmentType, label, unit }) => ({ code, equipmentType, label, unit })))
    .onConflictDoNothing();
  console.log(`parameters: ${PARAMETERS.length} ensured`);

  await db
    .insert(schema.internationalLimits)
    .values(
      Object.entries(DEMO_INTERNATIONAL_LIMITS).map(([parameterCode, [lowerLimit, upperLimit]]) => ({
        parameterCode,
        lowerLimit,
        upperLimit,
      })),
    )
    .onConflictDoNothing();
  console.log("international_limits: demo values ensured");

  const hash = await hashPassword(password!);
  for (const demo of DEMO_USERS) {
    const existing = await db.query.user.findFirst({ where: eq(schema.user.email, demo.email) });
    if (existing) {
      console.log(`user ${demo.email}: already exists`);
      continue;
    }
    const id = randomUUID();
    await db.insert(schema.user).values({ id, ...demo, emailVerified: true });
    // Better Auth's email/password sign-in reads the hash from a "credential" account
    await db.insert(schema.account).values({
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: hash,
    });
    console.log(`user ${demo.email}: created (${demo.role})`);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
