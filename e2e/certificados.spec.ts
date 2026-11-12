import { expect, test } from "./support/test";
import { insertClient, insertInspectedLot, uniqueSuffix } from "./support/data";
import { certificateIdFrom, createDraft, fillShipping } from "./support/flows";
import { loginAs } from "./support/users";

test.describe("RF-05 · RF-06 · UC-05 · UC-06 · UC-07 certificados", () => {
  test("PI-06 UC-05 UC-06 UC-07 BR-CER-05 BR-AUD-03 emitir certificado, enviarlo y ver el PDF", async ({ page }) => {
    // Precondición: an active client with one destination and a lot whose inspection A is complete
    const client = await insertClient();
    const { lotId, inspectionId } = await insertInspectedLot();
    await loginAs(page, "transaction");

    await createDraft(page, client.id, lotId, `OC-${uniqueSuffix(6)}`);
    await page.getByRole("button", { name: "Crear borrador" }).click();
    await expect(page).toHaveURL(/\/certificados\/(?!nuevo$)[^/]+$/);
    const certificateId = certificateIdFrom(page);
    await expect(page.getByText("Borrador", { exact: true })).toBeVisible();

    // BR-CER-05: without shipping data the draft cannot be issued
    await expect(page.getByText("Falta el número de factura.")).toBeVisible();
    await expect(page.getByText("Falta el transportista.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Emitir certificado" })).toBeDisabled();

    // The draft preview PDF is available and marked as a draft (UC-07)
    const draftPdf = await page.request.get(`/certificados/${certificateId}/pdf`);
    expect(draftPdf.status()).toBe(200);
    expect(draftPdf.headers()["content-disposition"]).toContain("borrador");

    // Complete the shipping data and save the draft
    await fillShipping(page);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible();
    await expect(page.getByText("Listo para emitir.", { exact: false })).toBeVisible();

    // UC-05 · RF-06: issue and send in one step (simulated email, D-13)
    await page.getByRole("button", { name: "Emitir certificado" }).click();
    await expect(page.getByRole("heading", { level: 1, name: certificateId }).locator("..")).toContainText("Enviado");
    // Delivery evidence (D-13): the client contact and Almacén
    await expect(page.getByText(`Enviado · ${client.contactEmail}`, { exact: false })).toBeVisible();
    await expect(page.getByText("Huella digital (SHA-256)", { exact: false })).toBeVisible();

    // UC-07: the issued PDF opens
    await expect(page.getByRole("link", { name: "Ver PDF" })).toBeVisible();
    const pdf = await page.request.get(`/certificados/${certificateId}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.headers()["content-disposition"]).toContain(`${certificateId}.pdf`);

    // BR-AUD-03: the inspection used by the certificate is locked
    await page.goto(`/inspecciones/${inspectionId}`);
    await expect(page.getByText("Certificada", { exact: true })).toBeVisible();
    await expect(page.getByText("Esta inspección ya se usó en un certificado.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar resultados" })).toHaveCount(0);
  });
});
