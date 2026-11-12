import Link from "next/link";
import { Suspense } from "react";
import { getClientOptions, getReportData } from "./data";
import { ExportButton } from "./export-button";
import { ReportCharts } from "./charts";
import { CertificateStatusBadge } from "../certificados/_components/status-badge";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CERTIFICATE_STATUS_LABEL } from "@/lib/domain/certificate";
import {
  filtersToParams,
  paginate,
  parseReportFilters,
  PERIOD_LABEL,
  PERIOD_PRESETS,
  plantToday,
  REPORT_STATUSES,
} from "@/lib/domain/report";
import { requireRole } from "@/lib/session";
import { FileText, CheckCircle2, AlertTriangle, BarChart3, Ban, MailX } from "lucide-react";

export const metadata = { title: "Reportes" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const fmt = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 3 });

function buildHref(params: Record<string, string | undefined>, hash = "") {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return `?${qs.toString()}${hash}`;
}

// RF-01: only roles listed for /reportes in modules.ts (transaction and query). The session
// is read inside <Suspense> (Cache Components), and the data layer checks the role again.
export default function ReportesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/reportes">
        <ReportContent searchParams={searchParams} />
      </ModuleGate>
    </Suspense>
  );
}

async function ReportContent({ searchParams }: PageProps) {
  const currentUser = await requireRole("transaction", "query");
  const resolvedParams = await searchParams;
  const filters = parseReportFilters(resolvedParams, plantToday(new Date()));
  const showDeviations = resolvedParams.detalle === "desviaciones";

  const [report, clientOptions] = await Promise.all([getReportData(filters), getClientOptions()]);
  const { history, deviations, byParameter, monthly, stats } = report;
  const historyPage = paginate(history, filters.page);
  // The query role cannot open /certificados, so its link opens the PDF, which both roles can read
  const certificateHref = (id: string) =>
    currentUser.role === "transaction" ? `/certificados/${id}` : `/certificados/${id}/pdf`;
  const pageHref = (page: number) =>
    buildHref({ ...filtersToParams(filters), page: page > 1 ? String(page) : undefined, detalle: resolvedParams.detalle as string | undefined });

  // Opening or closing the detail keeps the active filters
  const deviationsHref = buildHref(
    { ...filtersToParams(filters), detalle: showDeviations ? undefined : "desviaciones" },
    showDeviations ? "" : "#detalle-desviaciones",
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reportes y Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            Consulta el historial de certificados emitidos, tasas de cumplimiento y análisis de calidad.
            Las estadísticas solo cuentan certificados emitidos o enviados; los cancelados se muestran aparte.
          </p>
        </div>

        {/* Usamos el componente cliente para manejar la descarga */}
        <ExportButton filters={filters} />
      </div>

      {/* Filtros */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Periodo
          <select
            name="period"
            defaultValue={filters.period ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Por fechas</option>
            {PERIOD_PRESETS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
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
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Estado
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Todos</option>
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CERTIFICATE_STATUS_LABEL[s]}
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
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelledCertificates}</div>
            <p className="text-xs text-muted-foreground">No cuentan en las estadísticas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Entregas Fallidas</CardTitle>
            <MailX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedDeliveries}</div>
            <p className="text-xs text-muted-foreground">Intentos de envío que no se completaron</p>
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
                  <th className="p-3 font-medium">Resultado</th>
                  <th className="p-3 font-medium">Emitido Por</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="h-24 text-center text-muted-foreground">
                      No se encontraron registros de certificados para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  historyPage.items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        <Link href={certificateHref(row.id)} className="underline-offset-4 hover:underline">
                          {row.id}
                        </Link>
                      </td>
                      <td className="p-3">
                        {row.issuedAt ? new Date(row.issuedAt).toLocaleDateString("es-MX") : "-"}
                      </td>
                      <td className="p-3">
                        {row.clientName} ({row.sapKey})
                      </td>
                      <td className="p-3">{row.lotId}</td>
                      <td className="p-3">{row.inspectionSequence}</td>
                      <td className="p-3">
                        <CertificateStatusBadge status={row.status} />
                      </td>
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
          {historyPage.pageCount > 1 && (
            <nav aria-label="Paginación del historial" className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Página {historyPage.page} de {historyPage.pageCount} · {historyPage.total} certificados
              </span>
              <div className="flex gap-2">
                {historyPage.page > 1 && (
                  <Link href={pageHref(historyPage.page - 1)} className="rounded-md border px-3 py-1.5 hover:bg-muted">
                    Anterior
                  </Link>
                )}
                {historyPage.page < historyPage.pageCount && (
                  <Link href={pageHref(historyPage.page + 1)} className="rounded-md border px-3 py-1.5 hover:bg-muted">
                    Siguiente
                  </Link>
                )}
              </div>
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  );
}