import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { assertSafeTestDatabaseUrl } from "@/test/int/guard";
import * as schema from "./schema";

/**
 * TEST ONLY. The e2e suite (issue #22, PI-/PS- in docs/llm/testing.md) runs `next start`
 * against a throwaway local Postgres, and the Neon HTTP driver cannot reach a plain
 * Postgres. `getDb()` uses this client only when `E2E_LOCAL_POSTGRES=1` is set outside
 * Vercel, and the guard below refuses any URL that is not a local or CI `*_test` database.
 * Production (Vercel, Neon) never takes this path.
 */
export function isLocalPostgresEnabled() {
  return process.env.E2E_LOCAL_POSTGRES === "1" && !process.env.VERCEL;
}

type BatchQuery = { toSQL(): { sql: string; params: unknown[] } };

export function createLocalPostgresDb(url: string | undefined) {
  const pool = new Pool({ connectionString: assertSafeTestDatabaseUrl(url), max: 5 });

  /** Same contract as `batch` of the Neon HTTP driver: one transaction, all or nothing. */
  async function batch(queries: readonly BatchQuery[]) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const results = [];
      for (const { sql, params } of queries.map((query) => query.toSQL())) {
        results.push((await client.query(sql, params)).rows);
      }
      await client.query("commit");
      return results;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  return Object.assign(drizzle(pool, { schema, casing: "snake_case" }), { batch });
}
