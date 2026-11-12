import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { assertSafeTestDatabaseUrl } from "./guard";

/**
 * Runs once before the integration suite. Rebuilds the schema from scratch and applies
 * every migration in `drizzle/`, so the suite also proves the migrations run on a clean
 * Postgres. The guard throws before anything is dropped when the URL is not a test database.
 */
export default async function globalSetup() {
  const pool = new Pool({ connectionString: assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL) });
  try {
    await pool.query("drop schema if exists public cascade");
    await pool.query("drop schema if exists drizzle cascade");
    await pool.query("create schema public");
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  } finally {
    await pool.end();
  }
}
