import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { PARAMETERS } from "@/lib/domain/parameters";
import { assertSafeTestDatabaseUrl } from "./guard";

/**
 * Database client of the integration suite. The app talks to Neon over HTTP
 * (`drizzle-orm/neon-http`), which cannot reach a plain Postgres, so the suite replaces
 * `@/lib/db` with this node-postgres client (see setup.ts). Queries, constraints and
 * transactions are the real ones; only the transport differs.
 */
const pool = new Pool({ connectionString: assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL), max: 10 });

// --- Concurrency gate -------------------------------------------------------------------

type Gate = { pattern: RegExp; count: number; waiting: (() => void)[]; timer?: ReturnType<typeof setTimeout> };
let gate: Gate | null = null;

/**
 * Holds every statement (or batch) whose SQL matches `pattern` until `count` callers are
 * waiting, then releases them together. It makes "two users at the same time" tests
 * deterministic: both callers have passed their read checks before either one writes, so
 * the database constraint decides, not timing. Released after 3 s if fewer callers arrive,
 * so a wrong pattern fails an assertion instead of hanging.
 */
export function holdUntilConcurrent(pattern: RegExp, count = 2) {
  gate = { pattern, count, waiting: [] };
}

function releaseGate() {
  const current = gate;
  gate = null;
  if (!current) return;
  clearTimeout(current.timer);
  for (const resume of current.waiting) resume();
}

function waitAtGate(sqlText: string): Promise<void> {
  const current = gate;
  if (!current || !current.pattern.test(sqlText)) return Promise.resolve();
  return new Promise((resolve) => {
    current.waiting.push(resolve);
    if (current.waiting.length >= current.count) releaseGate();
    else current.timer ??= setTimeout(releaseGate, 3000);
  });
}

const poolQuery = pool.query.bind(pool) as (...args: unknown[]) => Promise<unknown>;
pool.query = (async (...args: unknown[]) => {
  const first = args[0];
  const text = typeof first === "string" ? first : ((first as { text?: string } | undefined)?.text ?? "");
  await waitAtGate(text);
  return poolQuery(...args);
}) as typeof pool.query;

// --- Client -----------------------------------------------------------------------------

type BatchQuery = { toSQL(): { sql: string; params: unknown[] } };

/**
 * Stand-in for `batch` of the Neon HTTP driver, which runs its statements in one
 * transaction. Same contract here: all statements commit together or none does.
 */
async function batch(queries: readonly BatchQuery[]) {
  const statements = queries.map((query) => query.toSQL());
  await waitAtGate(statements[0]?.sql ?? "");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const results = [];
    for (const { sql, params } of statements) results.push((await client.query(sql, params)).rows);
    await client.query("commit");
    return results;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export const testDb = Object.assign(drizzle(pool, { schema, casing: "snake_case" }), { batch });

// --- Reset and base data ----------------------------------------------------------------

/** Synthetic users, one per role (RF-01). They exist only in the test database. */
export const TEST_USERS = {
  transaction: { id: "test-user-transaction", name: "Analista Prueba", email: "analista@prueba.test", role: "transaction", employeeId: "T0001", active: true },
  query: { id: "test-user-query", name: "Consulta Prueba", email: "consulta@prueba.test", role: "query", employeeId: "T0002", active: true },
  admin: { id: "test-user-admin", name: "Administrador Prueba", email: "admin@prueba.test", role: "admin", employeeId: "T0003", active: true },
} as const;

/** Synthetic international limits (D-07). Not official values. */
export const TEST_LIMITS: Record<string, [number, number]> = {
  ALV_P: [60, 90],
  ALV_L: [80, 120],
  ALV_W: [250, 350],
  ALV_PL: [0.5, 1],
  ALV_IE: [45, 60],
  FAR_ABS: [58, 64],
  FAR_DEV: [2, 6],
  FAR_STA: [8, 15],
  FAR_SOF: [30, 80],
  FAR_ARR: [1, 2.5],
};

/** Empties every table and seeds the catalog, the limits and one user per role again. */
export async function resetDatabase() {
  releaseGate();
  const { rows } = await poolQuery("select tablename from pg_tables where schemaname = 'public'") as {
    rows: { tablename: string }[];
  };
  if (rows.length === 0) throw new Error("The test database has no tables. Did the global setup run the migrations?");
  const tables = rows.map((row) => `"public"."${row.tablename}"`).join(", ");
  await poolQuery(`truncate table ${tables} restart identity cascade`);

  await testDb
    .insert(schema.parameters)
    .values(PARAMETERS.map(({ code, equipmentType, label, unit }) => ({ code, equipmentType, label, unit })));
  await testDb.insert(schema.internationalLimits).values(
    Object.entries(TEST_LIMITS).map(([parameterCode, [lowerLimit, upperLimit]]) => ({
      parameterCode,
      lowerLimit,
      upperLimit,
    })),
  );
  await testDb.insert(schema.user).values(Object.values(TEST_USERS).map((u) => ({ ...u, emailVerified: true })));
}

export async function closeDatabase() {
  releaseGate();
  await pool.end();
}
