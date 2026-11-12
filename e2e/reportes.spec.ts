import { expect, test } from "./support/test";
import { loginAs } from "./support/users";

test.describe("RF-07 · UC-08 reportes", () => {
  // Written against the UAT task "Consultar el histórico filtrado por cliente y exportarlo a Excel".
  // Selectors may need adjusting to the version of the screen that is merged.
  test.skip(true, "Reportes (#15) pendiente de integrar: PR #32 o #33");

  test("PS-07 RF-07 UC-08 Q-09 reporte filtrado por cliente y exportación", async ({ page }) => {
    await loginAs(page, "query");
    await page.goto("/reportes");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByLabel("Cliente").selectOption({ index: 1 });
    await page.getByRole("button", { name: /Filtrar|Aplicar/ }).click();
    await expect(page.getByRole("table")).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Exportar/ }).click();
    expect((await download).suggestedFilename()).toMatch(/\.(xlsx|csv)$/);
  });
});
