import type { Page } from "@playwright/test";
import { PARAMETERS } from "../../src/lib/domain/parameters";
import { expect } from "./test";

/** UC-03. Registers a lot through the form and waits for its page. */
export async function createLot(page: Page, id: string) {
  await page.goto("/lotes/nuevo");
  await page.getByLabel("Número de lote").fill(id);
  await page.getByLabel("Producto").fill("Harina de trigo de prueba");
  await page.getByLabel("Fecha de producción").fill("2026-11-01");
  await page.getByLabel("Fecha de caducidad").fill("2027-05-01");
  await page.getByRole("button", { name: "Registrar lote" }).click();
  await expect(page.getByRole("heading", { level: 1, name: id })).toBeVisible();
}

/**
 * UC-04. Captures results on the open inspection page. `codes` limits which parameters are
 * typed, so a partial save can be tested.
 */
export async function captureResults(
  page: Page,
  machines: { alveograph: string; farinograph: string },
  values: Record<string, number>,
) {
  await page.locator("#equipment_alveograph").selectOption(machines.alveograph);
  await page.locator("#equipment_farinograph").selectOption(machines.farinograph);
  for (const p of PARAMETERS) {
    if (values[p.code] === undefined) continue;
    await page.locator(`input[name="value_${p.code}"]`).fill(String(values[p.code]));
  }
  await page.getByRole("button", { name: "Guardar resultados" }).click();
}

/** UC-05. Picks client, lot and purchase order on /certificados/nuevo and creates the draft. */
export async function createDraft(page: Page, clientId: string, lotId: string, purchaseOrder: string) {
  await page.goto("/certificados/nuevo");
  await page.getByRole("combobox", { name: "Cliente", exact: true }).selectOption(clientId);
  await page.getByRole("combobox", { name: "Lote", exact: true }).selectOption(lotId);
  await page.getByLabel("Orden de compra").fill(purchaseOrder);
}

/** BR-CER-05. Shipping data required before issuing. The destination defaults to the only one. */
export async function fillShipping(page: Page) {
  await page.getByLabel("Transportista").fill("Transportes de Prueba");
  await page.getByLabel("Factura").fill("F-E2E-0001");
  await page.getByLabel("Cantidad entregada (kg)").fill("1000");
  await page.getByLabel("Fecha de envío").fill("2026-11-10");
}

/** Reads the certificate id (D-17) from the URL of its page. */
export function certificateIdFrom(page: Page) {
  const id = new URL(page.url()).pathname.split("/").pop();
  if (!id) throw new Error(`No certificate id in ${page.url()}`);
  return decodeURIComponent(id);
}
