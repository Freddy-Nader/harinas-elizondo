import { expect, test } from "./support/test";
import { COMPLETE_VALUES, insertEquipmentPair, uniqueSuffix } from "./support/data";
import { captureResults, createLot } from "./support/flows";
import { loginAs } from "./support/users";

test.describe("RF-04 · UC-03 · UC-04 lotes e inspecciones", () => {
  test("PI-05 RF-04 UC-03 UC-04 BR-INS-02 lote con inspección completa y desviación", async ({ page }) => {
    // Precondición: one usable alveograph and farinograph (BR-EQP-03)
    const machines = await insertEquipmentPair();
    await loginAs(page, "transaction");

    const lotId = `L-PI05-${uniqueSuffix(6)}`;
    await createLot(page, lotId);
    await expect(page.getByText("El lote no tiene inspecciones. La primera recibe la secuencia A.")).toBeVisible();

    // BR-INS-02: the system assigns sequence A
    await page.getByRole("button", { name: "Iniciar inspección A" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Inspección A" })).toBeVisible();

    // Partial save: only the alveograph, with Tenacidad (P) above its 60 to 90 limit
    const alveograph = { ALV_P: 95, ALV_L: 100, ALV_W: 300, ALV_PL: 0.75, ALV_IE: 50 };
    await captureResults(page, machines, alveograph);
    await expect(page.getByText("Resultados guardados. Faltan 5 de 10 parámetros.")).toBeVisible();
    await expect(page.getByText("Incompleta · 5/10")).toBeVisible();
    // BR-CER-04: live deviation preview
    await expect(page.getByRole("row").filter({ hasText: "Tenacidad (P)" })).toContainText("Arriba +5");

    // Complete it with the farinograph
    const farinograph = Object.fromEntries(Object.entries(COMPLETE_VALUES).filter(([code]) => code.startsWith("FAR_")));
    await captureResults(page, machines, farinograph);
    await expect(page.getByText("Resultados guardados. La inspección está completa.")).toBeVisible();
    await expect(page.getByText("Completa", { exact: true })).toBeVisible();

    // The lot shows inspection A complete with one deviation, and B needs a reason (BR-INS-04)
    await page.getByRole("link", { name: `← Lote ${lotId}` }).click();
    const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: "A", exact: true }) });
    await expect(row).toContainText("Completa");
    await expect(row).toContainText("1 desviación");
    await expect(page.getByLabel("Motivo de la re-inspección B")).toBeVisible();
  });
});
