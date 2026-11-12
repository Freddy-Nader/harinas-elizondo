import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { createLocalPostgresDb, isLocalPostgresEnabled } from "./local-postgres";
import * as schema from "./schema";

function createNeonDb(url: string) {
  return drizzle(neon(url), { schema, casing: "snake_case" });
}

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. See docs/llm/runbook.md");
  }
  // TEST ONLY (e2e, issue #22): plain local Postgres. Off unless E2E_LOCAL_POSTGRES=1 outside Vercel
  if (isLocalPostgresEnabled()) {
    return createLocalPostgresDb(url) as unknown as ReturnType<typeof createNeonDb>;
  }
  return createNeonDb(url);
}

let instance: ReturnType<typeof createDb> | undefined;

/** Lazy so `next build` works without a database (previews before Neon is connected). */
export function getDb() {
  instance ??= createDb();
  return instance;
}
