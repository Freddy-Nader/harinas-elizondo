import { expect, test } from "./support/test";
import { COMPLETE_VALUES, insertClient, insertEquipmentPair, uniqueSuffix } from "./support/data";
import { captureResults, certificateIdFrom, createDraft, createLot, fillShipping } from "./support/flows";
import { loginAs } from "./support/users";

test.describe("Flujo completo de laboratorio", () => {
  test("PS-04 RF-04 RF-05 RF-06 lote, inspección, certificado y envío de punta a punta", async ({ page }) => {
    // Precondición: client (UC-02) and both machines (UC-01) exist; PI-01 and PI-03 cover those screens
    const client = await insertClient();
    const machines = await insertEquipmentPair();
    await loginAs(page, "transaction");

    // UC-03: lot
    const lotId = `L-PS04-${uniqueSuffix(6)}`;
    await createLot(page, lotId);

    // UC-04: inspection A, complete and within limits
    await page.getByRole("button", { name: "Iniciar inspección A" }).click();
    await captureResults(page, machines, COMPLETE_VALUES);
    await expect(page.getByText("Resultados guardados. La inspección está completa.")).toBeVisible();

    // UC-05: draft with all shipping data, then issue and send (RF-06)
    await createDraft(page, client.id, lotId, `OC-${uniqueSuffix(6)}`);
    await fillShipping(page);
    await page.getByRole("button", { name: "Crear borrador" }).click();
    await expect(page).toHaveURL(/\/certificados\/(?!nuevo$)[^/]+$/);
    const certificateId = certificateIdFrom(page);
    await expect(page.getByText("Todos los parámetros dentro de los valores de referencia.")).toBeVisible();
    await page.getByRole("button", { name: "Emitir certificado" }).click();
    // Delivery evidence (D-13): the client contact and Almacén
    await expect(page.getByText(`Enviado · ${client.contactEmail}`, { exact: false })).toBeVisible();

    // The list shows it as sent, and the lot data is now read-only (history)
    await page.goto("/certificados");
    await expect(page.getByRole("row").filter({ hasText: certificateId })).toContainText("Enviado");
    await page.goto(`/lotes/${lotId}`);
    await expect(page.getByText("El lote ya tiene un certificado emitido", { exact: false })).toBeVisible();
  });
});
