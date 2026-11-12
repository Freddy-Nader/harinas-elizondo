import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { fakeRfc, uniqueSuffix } from "./support/data";
import { loginAs } from "./support/users";

test.describe("RF-03 · UC-02 clientes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "transaction");
    await page.goto("/clientes");
  });

  test("PI-01 RF-03 UC-02 alta de cliente con dos direcciones y valores de referencia propios", async ({ page }) => {
    const suffix = uniqueSuffix();
    const sapKey = `PI${suffix}`;
    const businessName = `Panificadora de Prueba ${suffix}`;

    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Registrar cliente" }) });
    await form.getByLabel("Clave SAP").fill(sapKey);
    await form.getByLabel("Razón social").fill(businessName);
    await form.getByLabel("RFC").fill(fakeRfc());
    await form.getByLabel("Correo de contacto").fill(`compras-${suffix.toLowerCase()}@prueba.test`);
    await form.getByLabel("Nombre de contacto").fill("Contacto de Prueba");
    await form.getByLabel("Dirección fiscal").fill("Calle Ficticia 1, Ciudad de Prueba");
    await form.getByLabel("Dirección de entrega 1", { exact: true }).fill("Bodega Ficticia Norte, Ciudad de Prueba");
    await form.getByRole("button", { name: "+ Agregar dirección de entrega" }).click();
    await form.getByLabel("Dirección de entrega 2", { exact: true }).fill("Bodega Ficticia Sur, Ciudad de Prueba");
    await form.getByRole("button", { name: "Registrar cliente" }).click();

    // The directory lists the new client
    const row = page.getByRole("row").filter({ hasText: sapKey });
    await expect(row).toContainText(businessName);
    await expect(row).toContainText("Activo");

    // Both destinations were stored
    await row.getByRole("link", { name: "Consultar / editar" }).click();
    await expect(page.getByRole("heading", { name: "Modificar cliente" })).toBeVisible();
    await expect(page.getByLabel("Dirección de entrega 1", { exact: true })).toHaveValue("Bodega Ficticia Norte, Ciudad de Prueba");
    await expect(page.getByLabel("Dirección de entrega 2", { exact: true })).toHaveValue("Bodega Ficticia Sur, Ciudad de Prueba");

    // BR-CLI-04: a stricter own limit for Tenacidad (P); the international one is 60 to 90
    const limit = page.locator("form").filter({ hasText: "Tenacidad (P)" });
    await expect(limit).toContainText("Límite internacional · 60 a 90");
    await limit.getByLabel("Mínimo").fill("65");
    await limit.getByLabel("Máximo").fill("85");
    await limit.getByRole("button", { name: "Guardar" }).click();
    await expect(page.locator("form").filter({ hasText: "Tenacidad (P)" })).toContainText("Límite particular");
    await expect(page.locator("form").filter({ hasText: "Tenacidad (P)" }).getByLabel("Mínimo")).toHaveValue("65");
  });

  test("PI-02 RF-03 BR-CLI-01 un RFC repetido se rechaza con aviso", async ({ page }) => {
    const rfc = fakeRfc();
    const first = uniqueSuffix();
    await fillClient(page, first, rfc);
    await expect(page.getByRole("row").filter({ hasText: `PI${first}` })).toBeVisible();

    await fillClient(page, uniqueSuffix(), rfc);
    await expect(page.getByRole("alert").filter({ hasText: "El RFC ya pertenece a otro cliente" })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: rfc })).toHaveCount(1);
  });
});

/** Fills and submits the "Registrar cliente" form with synthetic data. */
async function fillClient(page: Page, suffix: string, rfc: string) {
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Registrar cliente" }) });
  await form.getByLabel("Clave SAP").fill(`PI${suffix}`);
  await form.getByLabel("Razón social").fill(`Molino de Prueba ${suffix}`);
  await form.getByLabel("RFC").fill(rfc);
  await form.getByLabel("Correo de contacto").fill(`contacto-${suffix.toLowerCase()}@prueba.test`);
  await form.getByLabel("Nombre de contacto").fill("Contacto de Prueba");
  await form.getByLabel("Dirección fiscal").fill("Calle Ficticia 2, Ciudad de Prueba");
  await form.getByLabel("Dirección de entrega 1", { exact: true }).fill("Bodega Ficticia 2, Ciudad de Prueba");
  await form.getByRole("button", { name: "Registrar cliente" }).click();
}
