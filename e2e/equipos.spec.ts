import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { uniqueSuffix } from "./support/data";
import { loginAs } from "./support/users";

test.describe("RF-02 · UC-01 equipos", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "transaction");
  });

  test("PI-03 RF-02 UC-01 BR-EQP-01 alta de alveógrafo y farinógrafo con sus límites", async ({ page }) => {
    // Alveograph: the system generates the key, and the limits of its five parameters can be set
    await createEquipment(page, "Alveógrafo", `Alveógrafo de prueba ${uniqueSuffix()}`);
    await expect(page.getByText(/Alveógrafo · Clave [A-HJ-KM-NP-Z2-9]{8}/)).toBeVisible();
    await expect(page.getByText("Listo para certificar")).toBeVisible();
    await saveLimits(page, "Fuerza panadera (W)", "240", "360");
    await expect(page.getByText("Límites guardados.")).toBeVisible();
    await expect(page.getByLabel("Fuerza panadera (W), límite inferior")).toHaveValue("240");

    // Farinograph: the other machine of the inspection (D-09)
    await createEquipment(page, "Farinógrafo", `Farinógrafo de prueba ${uniqueSuffix()}`);
    await expect(page.getByText(/Farinógrafo · Clave [A-HJ-KM-NP-Z2-9]{8}/)).toBeVisible();
    await saveLimits(page, "Estabilidad", "7", "16");
    await expect(page.getByText("Límites guardados.")).toBeVisible();

    // Both appear in the list
    await page.goto("/equipos");
    await expect(page.getByRole("row").filter({ hasText: "Alveógrafo de prueba" }).first()).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Farinógrafo de prueba" }).first()).toBeVisible();
  });

  test("PI-04 RF-02 BR-EQP-02 un límite inferior mayor que el superior se rechaza", async ({ page }) => {
    await createEquipment(page, "Alveógrafo", `Alveógrafo de prueba ${uniqueSuffix()}`);
    await saveLimits(page, "Extensibilidad (L)", "130", "90");
    await expect(page.getByText("El límite inferior no puede ser mayor que el superior.")).toBeVisible();
    // Nothing changed: the page still shows the seeded 80 to 120 after a reload
    await page.reload();
    await expect(page.getByLabel("Extensibilidad (L), límite inferior")).toHaveValue("80");
    await expect(page.getByLabel("Extensibilidad (L), límite superior")).toHaveValue("120");
  });
});

async function createEquipment(page: Page, type: "Alveógrafo" | "Farinógrafo", description: string) {
  await page.goto("/equipos/nuevo");
  await page.getByLabel("Tipo de equipo").selectOption({ label: type });
  await page.getByLabel("Descripción corta").fill(description);
  await page.getByLabel("Marca").fill("Marca Ficticia");
  await page.getByRole("button", { name: "Registrar equipo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: description })).toBeVisible();
}

async function saveLimits(page: Page, label: string, lower: string, upper: string) {
  const row = page.locator("form").filter({ has: page.getByLabel(`${label}, límite inferior`) });
  await row.getByLabel(`${label}, límite inferior`).fill(lower);
  await row.getByLabel(`${label}, límite superior`).fill(upper);
  await row.getByRole("button", { name: "Guardar" }).click();
}
