import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { assertSafeTestDatabaseUrl } from "./src/test/int/guard";

// Fail before Vitest starts when the URL is missing or not a local *_test database.
assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);

/**
 * Component (integration) tests, PC-xx in docs/llm/testing.md. Run with `pnpm test:int`.
 * They need a disposable Postgres in TEST_DATABASE_URL (local or CI only, see
 * src/test/int/guard.ts). Files run one at a time because they share that database.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.int.test.ts"],
    globalSetup: ["src/test/int/global-setup.ts"],
    setupFiles: ["src/test/int/setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
