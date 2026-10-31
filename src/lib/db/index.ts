import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. See docs/llm/runbook.md");
  }
  return drizzle(neon(url), { schema, casing: "snake_case" });
}

let instance: ReturnType<typeof createDb> | undefined;

/** Lazy so `next build` works without a database (previews before Neon is connected). */
export function getDb() {
  instance ??= createDb();
  return instance;
}
