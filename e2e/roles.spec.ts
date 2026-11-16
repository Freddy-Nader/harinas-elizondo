import { expect, test } from "./support/test";
import { loginAs } from "./support/users";

test.describe("RF-01 permisos por rol", () => {
  test("PS-05 RF-01 el usuario de consulta no puede emitir certificados", async ({ page }) => {
    await loginAs(page, "query");

    // The navigation only offers what the role can open
    const nav = page.getByRole("navigation", { name: "Módulos" });
    await expect(nav.getByRole("link", { name: "Reportes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Bitácora" })).toBeVisible();
    for (const hidden of ["Certificados", "Clientes", "Equipos", "Lotes", "Inspecciones", "Usuarios"]) {
      await expect(nav.getByRole("link", { name: hidden })).toHaveCount(0);
    }

    // Typing the URL does not help: the screens that issue certificates are closed
    for (const path of ["/certificados", "/certificados/nuevo"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Crear borrador" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Emitir certificado" })).toHaveCount(0);
    }
    await page.goto("/lotes/nuevo");
    await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();

    // Clientes uses the same restricted screen as every other module
    await page.goto("/clientes");
    await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar cliente" })).toHaveCount(0);
  });

  test("PS-06 RF-01 D-14 solo el administrador abre Usuarios", async ({ page }) => {
    await loginAs(page, "transaction");
    await page.goto("/usuarios");
    await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();

    await page.locator("aside").getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await loginAs(page, "admin");
    await expect(page.getByRole("navigation", { name: "Módulos" }).getByRole("link", { name: "Usuarios" })).toBeVisible();
    await page.goto("/usuarios");
    await expect(page.getByRole("heading", { name: "Acceso restringido" })).toHaveCount(0);
  });
});
