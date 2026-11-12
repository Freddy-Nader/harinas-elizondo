import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Integration tests need a database. They run with `pnpm test:int` (vitest.int.config.mts)
    exclude: ["src/**/*.int.test.ts"],
  },
});
