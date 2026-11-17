/** RF-01: set a new password on an existing account, outside the web application. */
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { parseSetPasswordInput } from "../src/lib/set-password-input";
import { account, auditLog, session, user } from "../src/lib/db/schema";

config({ path: [".env.local", ".env"], quiet: true });
const input = parseSetPasswordInput(process.env.PASSWORD_EMAIL, process.env.NEW_PASSWORD);
const url = process.env.DATABASE_URL;
if (!input || !url) {
  console.error("Configura DATABASE_URL, PASSWORD_EMAIL y una contraseña nueva de 16 a 128 caracteres.");
  process.exit(1);
}
const db = drizzle(neon(url), { casing: "snake_case" });

async function main() {
  const [found] = await db.select({ id: user.id }).from(user).where(eq(user.email, input!.email)).limit(1);
  if (!found) {
    console.error("No existe una cuenta con ese correo.");
    process.exit(1);
  }
  const credential = and(eq(account.userId, found.id), eq(account.providerId, "credential"));
  const [hasCredential] = await db.select({ id: account.id }).from(account).where(credential).limit(1);
  if (!hasCredential) {
    console.error("La cuenta no tiene contraseña propia (no usa inicio de sesión con credenciales).");
    process.exit(1);
  }
  await db.batch([
    db.update(account).set({ password: await hashPassword(input!.password) }).where(credential),
    db.delete(session).where(eq(session.userId, found.id)),
    db.insert(auditLog).values({
      userName: "Script de mantenimiento",
      action: "update",
      entity: "user",
      entityId: found.id,
      detail: { field: "password" },
    }),
  ]);
  console.log("Contraseña actualizada. Las sesiones abiertas de esa cuenta se cerraron.");
}
main().catch(() => {
  console.error("No se pudo actualizar la contraseña. Verifica la conexión.");
  process.exitCode = 1;
});
