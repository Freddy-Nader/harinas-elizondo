import { expect, test } from "./support/test";
import { E2E_PASSWORD, loginAs } from "./support/users";

test.describe("RF-01 inicio y cierre de sesión", () => {
  test("PS-01 RF-01 sin sesión, una ruta protegida manda a /login y regresa tras entrar", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/login\?next=%2Fclientes$/);
    await page.getByLabel("Correo").fill("analista@prueba.test");
    await page.getByLabel("Contraseña").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/clientes$/);
  });

  test("PS-02 RF-01 una contraseña incorrecta no inicia sesión", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo").fill("analista@prueba.test");
    await page.getByLabel("Contraseña").fill("contrasena-incorrecta");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    // Prefix only, so it holds before and after the visual identity PR (#34) splits the message in two
    await expect(page.getByText(/^No pudimos iniciar sesión/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("PS-03 RF-01 entrar y salir con cada rol", async ({ page }) => {
    for (const [role, label] of [
      ["transaction", "Usuario de transacción"],
      ["query", "Usuario de consulta"],
      ["admin", "Administrador"],
    ] as const) {
      const user = await loginAs(page, role);
      const sidebar = page.locator("aside");
      await expect(sidebar.getByText(user.name)).toBeVisible();
      await expect(sidebar.getByText(`${label} · ${user.employeeId}`, { exact: true })).toBeVisible();
      await sidebar.getByRole("button", { name: "Cerrar sesión" }).click();
      await expect(page).toHaveURL(/\/login$/);
      await page.goto("/panel");
      await expect(page).toHaveURL(/\/login$/);
    }
  });
});
