import { getCertificateHistory, getReportStatistics, ReportFilters } from "./data";
import { exportCertificatesAction } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    clientId?: string;
  }>;
}

/**
 * Reports and Statistics page (UC-08 / RF-07).
 */
export default async function ReportesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filters: ReportFilters = {
    startDate: resolvedParams.startDate,
    endDate: resolvedParams.endDate,
    clientId: resolvedParams.clientId,
  };

  const [history, stats] = await Promise.all([
    getCertificateHistory(filters),
    getReportStatistics(filters),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reportes y Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            Consulta el historial de certificados emitidos, tasas de cumplimiento y análisis de calidad (UC-08).
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await exportCertificatesAction(filters);
          }}
        >
          <Button type="submit" variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar a Excel / CSV (Q-09)
          </Button>
        </form>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total de Certificados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCertificates}</div>
            <p className="text-xs text-muted-foreground">Emitidos en el periodo seleccionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Desviaciones Registradas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeviations}</div>
            <p className="text-xs text-muted-foreground">Certificados con parámetros fuera de rango</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Tasa de Cumplimiento</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceRate}%</div>
            <p className="text-xs text-muted-foreground">Proporción dentro de norma</p>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Historial de Certificados Emitidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">No. Certificado</th>
                  <th className="p-3 font-medium">Fecha</th>
                  <th className="p-3 font-medium">Cliente</th>
                  <th className="p-3 font-medium">Lote ID</th>
                  <th className="p-3 font-medium">Inspección</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Emitido Por</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-24 text-center text-muted-foreground">
                      No se encontraron registros de certificados para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/50">
                      <td className="p-3 font-medium">{row.certificateNumber}</td>
                      <td className="p-3">
                        {row.issuedAt ? new Date(row.issuedAt).toLocaleDateString("es-MX") : "-"}
                      </td>
                      <td className="p-3">{row.clientName} ({row.sapKey})</td>
                      <td className="p-3">{row.lotNumber}</td>
                      <td className="p-3">{row.inspectionSequence}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Normal
                        </span>
                      </td>
                      <td className="p-3">{row.issuedByName ?? "Sistema"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}