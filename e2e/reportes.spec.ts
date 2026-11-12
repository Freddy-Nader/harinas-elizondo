import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { expect, test } from "./support/test";
import { insertClient, insertInspectedLot, uniqueSuffix } from "./support/data";
import { certificateIdFrom, createDraft, fillShipping } from "./support/flows";
import { loginAs } from "./support/users";

test.describe("RF-07 · UC-08 reportes", () => {
  // Written against the UAT task "Consultar el histórico filtrado por cliente y exportarlo a Excel".
  test("PS-07 RF-07 UC-08 Q-09 reporte filtrado por cliente y exportación", async ({ page }) => {
    // Precondición: one issued certificate for a client of its own, so the filter has one row
    const client = await insertClient();
    const { lotId } = await insertInspectedLot();
    await loginAs(page, "transaction");
    await createDraft(page, client.id, lotId, `OC-${uniqueSuffix(6)}`);
    await page.getByRole("button", { name: "Crear borrador" }).click();
    await expect(page).toHaveURL(/\/certificados\/(?!nuevo$)[^/]+$/);
    const certificateId = certificateIdFrom(page);
    await fillShipping(page);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible();
    await page.getByRole("button", { name: "Emitir certificado" }).click();
    await expect(page.getByRole("heading", { level: 1, name: certificateId }).locator("..")).toContainText("Enviado");

    // The query role reads the report (D-14)
    await page.context().clearCookies();
    await loginAs(page, "query");
    await page.goto("/reportes");
    await expect(page.getByRole("heading", { level: 1, name: "Reportes y Estadísticas" })).toBeVisible();

    await page.getByLabel("Cliente").selectOption(client.id);
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(new RegExp(`clientId=${client.id}`));
    const table = page.getByRole("table").filter({ hasText: "No. Certificado" });
    await expect(table.getByRole("link", { name: certificateId })).toBeVisible();
    await expect(table.locator("tbody tr")).toHaveCount(1);

    // Q-09: the Excel export carries the filtered row
    const xlsxDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar a Excel" }).click();
    const xlsx = await xlsxDownload;
    expect(xlsx.suggestedFilename()).toMatch(/\.xlsx$/);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(await xlsx.path());
    const sheet = workbook.getWorksheet("Certificados");
    expect(sheet?.getRow(1).getCell(1).value).toBe("ID Certificado");
    expect(sheet?.rowCount).toBe(2);
    expect(sheet?.getRow(2).getCell(1).value).toBe(certificateId);

    // D-19: the CSV export too
    const csvDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const csv = await csvDownload;
    expect(csv.suggestedFilename()).toMatch(/\.csv$/);
    expect(await readFile(await csv.path(), "utf8")).toContain(certificateId);
  });
});
