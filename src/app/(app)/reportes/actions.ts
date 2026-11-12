"use server";

import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { getExportableCertificateData, ReportFilters } from "./data";

/**
 * Escapa una celda de CSV: duplica las comillas internas y neutraliza valores
 * que Excel interpretaría como fórmula (=, +, -, @).
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Server action to securely handle the export of certificate history to CSV/Excel.
 * Satisfies Q-09, RF-01, and RF-07.
 */
export async function exportCertificatesAction(filters: ReportFilters = {}) {
  // 1. Verify session and role authorization server-side (RF-01)
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new Error("No autorizado. Debe iniciar sesión.");
  }

  const userRole = (session.user as { role?: string }).role;
  if (!userRole || !["transaction", "query", "admin"].includes(userRole)) {
    throw new Error("Acceso denegado: No cuenta con permisos para exportar reportes.");
  }

  // 2. Fetch exportable data (solo certificados emitidos o enviados)
  const data = await getExportableCertificateData(filters);

  if (!data || data.length === 0) {
    throw new Error("No hay registros disponibles para exportar con los filtros seleccionados.");
  }

  // 3. Transform data into CSV format (compatible with Excel / Power BI - Q-09)
  const headersRow = [
    "ID Certificado",
    "Fecha de Emisión",
    "Clave SAP Cliente",
    "Nombre del Cliente",
    "RFC",
    "ID Lote",
    "Secuencia Inspección",
    "Orden de Compra",
    "No. Factura",
    "Emitido Por",
    "Con Desviación",
    "Parámetros Fuera de Rango",
  ];

  const csvRows = [
    headersRow.map(csvCell).join(","),
    ...data.map((row) =>
      [
        row.id,
        row.issuedAt ? new Date(row.issuedAt).toISOString() : "",
        row.sapKey,
        row.clientName,
        row.rfc,
        row.lotId,
        row.inspectionSequence,
        row.purchaseOrder,
        row.invoiceNumber,
        row.issuedByName,
        row.deviationParams.length > 0 ? "Sí" : "No",
        row.deviationParams.join("; "),
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  const csvContent = csvRows.join("\r\n");

  return {
    success: true,
    filename: `reporte-certificados-${new Date().toISOString().split("T")[0]}.csv`,
    csvData: csvContent,
  };
}