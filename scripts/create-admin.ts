/** D-14: provision the initial administrator outside the web application. */
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { z } from "zod";
import { account, user } from "../src/lib/db/schema";

config({ path: [".env.local", ".env"], quiet: true });
const email = z.email().max(100).safeParse(process.env.ADMIN_EMAIL?.trim().toLowerCase());
const password = process.env.ADMIN_PASSWORD;
const url = process.env.DATABASE_URL;
if (!email.success || !password || password.length < 12 || password.length > 128 || !url) {
  console.error("Configura DATABASE_URL, ADMIN_EMAIL y una contraseña de 12 a 128 caracteres.");
  process.exit(1);
}
const db = drizzle(neon(url), { casing: "snake_case" });
const id = randomUUID();
async function main() {
  await db.batch([
    db.insert(user).values({ id, name: "Administrador", email: email.data!, role: "admin" }),
    db.insert(account).values({ id: randomUUID(), userId: id, accountId: id,
      providerId: "credential", password: await hashPassword(password!) }),
  ]);
  console.log("Cuenta administradora creada.");
}
main().catch(() => {
  console.error("No se pudo crear la cuenta. Verifica la migración, la conexión y que el correo no esté registrado.");
  process.exitCode = 1;
});
