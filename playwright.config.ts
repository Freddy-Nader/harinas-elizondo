import { defineConfig, devices } from "@playwright/test";
import { assertSafeTestDatabaseUrl } from "./src/test/int/guard";

/**
 * Integral and system tests (PI-/PS- in docs/llm/testing.md, issue #22). Run with
 * `pnpm test:e2e`. The app is built and started against the throwaway Postgres in
 * TEST_DATABASE_URL, never Neon: the guard throws before anything starts when the URL is
 * not localhost, 127.0.0.1, [::1] or the CI service host, or the database name does not
 * end in `_test`.
 */
const databaseUrl = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  // One shared database, so specs run one at a time
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/support/global-setup.ts",
  use: {
    baseURL,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // E2E_SKIP_BUILD=1 reuses the last `.next` build while iterating locally
    command: `${process.env.E2E_SKIP_BUILD === "1" ? "" : "pnpm build && "}pnpm start --port ${port}`,
    url: `${baseURL}/login`,
    timeout: 300_000,
    // Never reuse a running server: it could point at a real database
    reuseExistingServer: false,
    stdout: "pipe",
    env: {
      DATABASE_URL: databaseUrl,
      // Test-only switch of src/lib/db/local-postgres.ts (Neon HTTP cannot reach plain Postgres)
      E2E_LOCAL_POSTGRES: "1",
      // Obvious fakes, only valid for this throwaway server
      BETTER_AUTH_SECRET: "e2e-dummy-secret-not-used-anywhere-real",
      BETTER_AUTH_URL: baseURL,
    },
  },
});
