import Link from "next/link";
import { connection } from "next/server";
import { getClientOptions, getReportData, ReportFilters } from "./data";
import { ExportButton } from "./export-button";
import { ReportCharts } from "./charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    clientId?: string;
    detalle?: string;
  }>;
}

const fmt = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 3 });

function buildHref(params: Record<string, string | undefined>, hash = "") {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return `?${qs.toString()}${hash}`;
}

export default async function ReportesPage({ searchParams }: PageProps) {
  // Forzar renderizado dinámico en el servidor (compatible con Next.js 16)
  await connection();

  const resolvedParams = await searchParams;
  const filters: ReportFilters = {
    startDate: resolvedParams.startDate,
    endDate: resolvedParams.endDate,
    clientId: resolvedParams.clientId,
  };
  const showDeviations = resolvedParams.detalle === "desviaciones";

  const [report, clientOptions] = await Promise.all([getReportData(filters), getClientOptions()]);
  const { history, deviations, byParameter, monthly, stats } = report;

  // Al abrir/cerrar el detalle se conservan los filtros activos
  const deviationsHref = buildHref(
    { ...filters, detalle: showDeviations ? undefined : "desviaciones" },
    showDeviations ? "" : "#detalle-desviaciones",
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reportes y Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            Consulta el historial de certificados emitidos, tasas de cumplimiento y análisis de calidad (UC-08).
            Solo se cuentan certificados emitidos o enviados.
          </p>
        </div>

        {/* Usamos el componente cliente para manejar la descarga */}
        <ExportButton filters={filters} />
      </div>

      {/* Filtros */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Desde
          <input
            type="date"
            name="startDate"
            defaultValue={filters.startDate ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Hasta
          <input
            type="date"
            name="endDate"
            defaultValue={filters.endDate ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Cliente
          <select
            name="clientId"
            defaultValue={filters.clientId ?? ""}
            className="h-9 min-w-56 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Todos los clientes</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.sapKey})
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Filtrar</Button>
        <Link
          href="?"
          className="inline-flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          Limpiar
        </Link>
      </form>

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

        {/* Clic para ver los parámetros fuera de rango */}
        <Link href={deviationsHref} scroll={!showDeviations} aria-expanded={showDeviations}>
          <Card
            className={`h-full cursor-pointer transition-colors hover:bg-muted/50 ${
              showDeviations ? "ring-2 ring-amber-500" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Desviaciones Registradas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.certificatesWithDeviation}</div>
              <p className="text-xs text-muted-foreground">
                Certificados con parámetros fuera de rango ({stats.totalIncidences} incidencias).{" "}
                {showDeviations ? "Clic para ocultar el detalle." : "Clic para ver el detalle."}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Tasa de Cumplimiento</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.complianceRate === null ? "—" : `${stats.complianceRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">Proporción dentro de norma</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <ReportCharts byParameter={byParameter} monthly={monthly} />

      {/* Detalle de desviaciones */}
      {showDeviations && (
        <Card id="detalle-desviaciones" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Parámetros fuera de rango
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {stats.totalIncidences} incidencias en {stats.certificatesWithDeviation} certificados.
              Un valor igual al límite se considera dentro de norma.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">No. Certificado</th>
                    <th className="p-3 font-medium">Fecha</th>
                    <th className="p-3 font-medium">Cliente</th>
                    <th className="p-3 font-medium">Lote</th>
                    <th className="p-3 font-medium">Parámetro</th>
                    <th className="p-3 font-medium text-right">Valor</th>
                    <th className="p-3 font-medium text-right">Rango permitido</th>
                    <th className="p-3 font-medium">Fuera de rango</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deviations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="h-24 text-center text-muted-foreground">
                        No hay parámetros fuera de rango en el periodo seleccionado.
                      </td>
                    </tr>
                  ) : (
                    deviations.map((d) => (
                      <tr key={`${d.certificateId}-${d.parameterCode}`} className="hover:bg-muted/50">
                        <td className="p-3 font-medium">{d.certificateId}</td>
                        <td className="p-3">
                          {d.issuedAt ? new Date(d.issuedAt).toLocaleDateString("es-MX") : "-"}
                        </td>
                        <td className="p-3">
                          {d.clientName} ({d.sapKey})
                        </td>
                        <td className="p-3">{d.lotId}</td>
                        <td className="p-3">{d.parameterLabel}</td>
                        <td className="p-3 text-right tabular-nums">
                          {fmt(d.value)} {d.unit}
                        </td>
                        <td className="p-3 text-right tabular-nums">
                          {fmt(d.lowerLimit)} – {fmt(d.upperLimit)} {d.unit}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {d.direction === "bajo" ? "Bajo" : "Alto"} por {fmt(d.outBy)} {d.unit}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
                      <td className="p-3 font-medium">{row.id}</td>
                      <td className="p-3">
                        {row.issuedAt ? new Date(row.issuedAt).toLocaleDateString("es-MX") : "-"}
                      </td>
                      <td className="p-3">
                        {row.clientName} ({row.sapKey})
                      </td>
                      <td className="p-3">{row.lotId}</td>
                      <td className="p-3">{row.inspectionSequence}</td>
                      <td className="p-3">
                        {row.deviationParams.length === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Normal
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Con desviación
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {row.deviationParams.join(", ")}
                            </p>
                          </div>
                        )}
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