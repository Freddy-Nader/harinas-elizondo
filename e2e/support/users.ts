import type { Page } from "@playwright/test";
import { expect } from "./test";
import { TEST_USERS } from "../../src/test/int/db";

/** Obvious fake. It only exists in the throwaway e2e database. */
export const E2E_PASSWORD = "e2e-password-not-secret";

export type E2ERole = keyof typeof TEST_USERS;

/** RF-01. Signs in through the real login form and waits for the panel. */
export async function loginAs(page: Page, role: E2ERole) {
  const user = TEST_USERS[role];
  await page.goto("/login");
  await page.getByLabel("Correo").fill(user.email);
  await page.getByLabel("Contraseña").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  return user;
}
