"use server";

import { recordAudit } from "@/lib/audit";
import { parseReportFilters, plantToday } from "@/lib/domain/report";
import { toCsv, toXlsx } from "@/lib/services/report-export";
import { ForbiddenError, requireRole } from "@/lib/session";
import { getExportableCertificateData } from "./data";

export type ExportFormat = "xlsx" | "csv";

export type ExportResult =
  | { success: true; filename: string; mimeType: string; base64: boolean; data: string }
  | { success: false; error: string };

const MIME: Record<ExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv;charset=utf-8",
};

/**
 * RF-07 · UC-08 · D-19. Exports the certificate history with the filters on screen, as
 * `.xlsx` (exceljs) or CSV, both readable by Excel and Power BI.
 * RF-01: both roles can export. Without a session `requireRole` redirects to /login.
 * BR-AUD-01: every export writes an `export` audit row with the format and the filters.
 *
 * Errors come back as a result, not thrown, because production builds hide the message of
 * an error thrown by a server action.
 */
export async function exportCertificatesAction(
  rawFilters: Record<string, unknown> = {},
  format: ExportFormat = "xlsx",
): Promise<ExportResult> {
  let user;
  try {
    user = await requireRole("transaction", "query");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { success: false, error: "Acceso denegado: no cuenta con permisos para exportar reportes." };
    }
    throw error; // the /login redirect
  }

  // The filters come from the browser, so they are validated again here
  const today = plantToday(new Date());
  const filters = parseReportFilters(rawFilters, today);
  const fileFormat: ExportFormat = format === "csv" ? "csv" : "xlsx";

  const data = await getExportableCertificateData(filters);
  if (data.length === 0) {
    return { success: false, error: "No hay registros disponibles para exportar con los filtros seleccionados." };
  }

  const content =
    fileFormat === "csv" ? toCsv(data) : Buffer.from(await toXlsx(data)).toString("base64");

  await recordAudit({
    user,
    action: "export",
    entity: "certificate",
    entityId: "history",
    detail: {
      format: fileFormat,
      rows: data.length,
      filters: {
        startDate: filters.startDate ?? null,
        endDate: filters.endDate ?? null,
        period: filters.period ?? null,
        clientId: filters.clientId ?? null,
        status: filters.status ?? null,
      },
    },
  });

  return {
    success: true,
    filename: `reporte-certificados-${today}.${fileFormat}`,
    mimeType: MIME[fileFormat],
    base64: fileFormat === "xlsx",
    data: content,
  };
}
