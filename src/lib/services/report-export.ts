import ExcelJS from "exceljs";
import { CERTIFICATE_STATUS_LABEL } from "@/lib/domain/certificate";
import type { HistoryRow } from "@/lib/domain/report";

/**
 * RF-07 · D-19. Certificate history as `.xlsx` (exceljs: typed columns, real dates, accents)
 * and as CSV, both readable by Excel and Power BI. Headers are user-facing, so Spanish.
 * The columns and the CSV escaping are the ones @laxmxn wrote in `reportes/actions.ts`.
 */

type Cell = string | number | Date | null;
type Column = { header: string; width: number; numFmt?: string; value: (row: HistoryRow) => Cell };

/** Spreadsheets have no time zone. Shift the instant so the cell shows plant time (UTC-6). */
const plantWallClock = (date: Date | null) => (date ? new Date(date.getTime() - 6 * 60 * 60 * 1000) : null);

export const EXPORT_COLUMNS: readonly Column[] = [
  { header: "ID Certificado", width: 18, value: (r) => r.id },
  { header: "Estado", width: 12, value: (r) => CERTIFICATE_STATUS_LABEL[r.status] },
  { header: "Fecha de Emisión", width: 18, numFmt: "dd/mm/yyyy hh:mm", value: (r) => r.issuedAt },
  { header: "Clave SAP Cliente", width: 16, value: (r) => r.sapKey },
  { header: "Nombre del Cliente", width: 36, value: (r) => r.clientName },
  { header: "RFC", width: 15, value: (r) => r.rfc },
  { header: "ID Lote", width: 16, value: (r) => r.lotId },
  { header: "Secuencia Inspección", width: 18, value: (r) => r.inspectionSequence },
  { header: "Orden de Compra", width: 16, value: (r) => r.purchaseOrder },
  { header: "No. Factura", width: 14, value: (r) => r.invoiceNumber },
  { header: "Emitido Por", width: 26, value: (r) => r.issuedByName },
  { header: "Con Desviación", width: 14, value: (r) => (r.deviationParams.length > 0 ? "Sí" : "No") },
  { header: "Parámetros Fuera de Rango", width: 36, value: (r) => r.deviationParams.join("; ") },
  { header: "Entregas Fallidas", width: 16, value: (r) => r.failedDeliveries },
  { header: "Motivo de Cancelación", width: 36, value: (r) => r.cancellationReason },
];

/**
 * One CSV cell (RFC 4180): always quoted, inner quotes doubled, so commas and line breaks
 * are safe. Text a spreadsheet would run as a formula (starts with = + - @, tab or CR)
 * gets a leading apostrophe. Dates are ISO 8601 (UTC).
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** CSV with a UTF-8 BOM (so Excel reads accents) and CRLF line ends. */
export function toCsv(rows: readonly HistoryRow[]): string {
  const lines = [
    EXPORT_COLUMNS.map((c) => csvCell(c.header)).join(","),
    ...rows.map((row) => EXPORT_COLUMNS.map((c) => csvCell(c.value(row))).join(",")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** `.xlsx` with one sheet, a frozen bold header and typed cells. */
export async function toXlsx(rows: readonly HistoryRow[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Certificados", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = EXPORT_COLUMNS.map((c) => ({
    header: c.header,
    width: c.width,
    style: c.numFmt ? { numFmt: c.numFmt } : {},
  }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(EXPORT_COLUMNS.map((c) => (c.numFmt ? plantWallClock(c.value(row) as Date | null) : c.value(row))));
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
