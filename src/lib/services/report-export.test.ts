import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { HistoryRow } from "@/lib/domain/report";
import { csvCell, EXPORT_COLUMNS, toCsv, toXlsx } from "./report-export";

const row = (overrides: Partial<HistoryRow> = {}): HistoryRow => ({
  id: "CER-2026-000001",
  status: "sent",
  issuedAt: new Date("2026-11-05T18:30:00Z"),
  clientName: 'Panadería "La Espiga", S.A.',
  sapKey: "PRUEBA01",
  rfc: null,
  lotId: "L-PRUEBA-001",
  inspectionSequence: "A",
  purchaseOrder: "=HYPERLINK(\"x\")",
  invoiceNumber: null,
  issuedByName: "Usuario Demo",
  cancellationReason: null,
  deviationParams: ["Humedad", "Fuerza W"],
  failedDeliveries: 1,
  ...overrides,
});

describe("D-19 CSV export", () => {
  it("D-19 quotes every text cell and doubles inner quotes", () => {
    expect(csvCell('Dice "hola", adiós')).toBe('"Dice ""hola"", adiós"');
    expect(csvCell("línea 1\nlínea 2")).toBe('"línea 1\nlínea 2"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(-0.5)).toBe("-0.5");
  });

  it("D-19 neutralizes text a spreadsheet would run as a formula", () => {
    for (const text of ["=1+1", "+1", "-1", "@SUM(A1)", "\tx"]) expect(csvCell(text)).toBe(`"'${text.replace(/"/g, '""')}"`);
  });

  it("D-19 writes a UTF-8 BOM, CRLF line ends and one line per certificate", () => {
    const csv = toCsv([row(), row({ id: "CER-2026-000002" })]);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0].split(",")).toHaveLength(EXPORT_COLUMNS.length);
    expect(lines[1]).toContain('"Panadería ""La Espiga"", S.A."');
    expect(lines[1]).toContain('"2026-11-05T18:30:00.000Z"');
    expect(lines[1]).toContain('"Enviado"');
    expect(lines[1]).toContain('"Humedad; Fuerza W"');
  });
});

describe("D-19 xlsx export", () => {
  it("D-19 keeps real dates in plant time, typed numbers and accents", async () => {
    const file = await toXlsx([row(), row({ status: "cancelled", cancellationReason: "Error de captura" })]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(file) as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Certificados")!;
    const col = (header: string) => EXPORT_COLUMNS.findIndex((c) => c.header === header) + 1;

    expect(sheet.rowCount).toBe(3);
    expect(sheet.getRow(1).getCell(col("Fecha de Emisión")).value).toBe("Fecha de Emisión");
    const issued = sheet.getRow(2).getCell(col("Fecha de Emisión"));
    expect(issued.value).toBeInstanceOf(Date);
    // 18:30 UTC is 12:30 at the plant
    expect((issued.value as Date).toISOString()).toBe("2026-11-05T12:30:00.000Z");
    expect(issued.numFmt).toBe("dd/mm/yyyy hh:mm");
    expect(sheet.getRow(2).getCell(col("Entregas Fallidas")).value).toBe(1);
    expect(sheet.getRow(2).getCell(col("Nombre del Cliente")).value).toBe('Panadería "La Espiga", S.A.');
    expect(sheet.getRow(3).getCell(col("Estado")).value).toBe("Cancelado");
    expect(sheet.getRow(3).getCell(col("Motivo de Cancelación")).value).toBe("Error de captura");
  });
});
