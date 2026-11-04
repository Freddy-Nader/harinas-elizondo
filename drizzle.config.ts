import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Same files Next.js reads locally; `vercel env pull .env.local` fills them
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  // Migrations use the direct (unpooled) connection when Neon provides one
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
