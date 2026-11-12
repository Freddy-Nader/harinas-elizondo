"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyPoint, ParameterIncidence } from "./data";

interface ReportChartsProps {
  byParameter: ParameterIncidence[];
  monthly: MonthlyPoint[];
}

const tooltipStyle = {
  backgroundColor: "var(--background)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

const tick = { fill: "currentColor", fontSize: 12 };

export function ReportCharts({ byParameter, monthly }: ReportChartsProps) {
  const top = byParameter[0];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Pareto de incidencias por parámetro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incidencias por parámetro (Pareto)</CardTitle>
          {top ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{top.label}</span> concentra el{" "}
              <span className="font-medium text-foreground">{top.percent}%</span> de las incidencias
              ({top.count} de{" "}
              {byParameter.reduce((sum, p) => sum + p.count, 0)}).
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          {byParameter.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No hay parámetros fuera de rango en el periodo seleccionado.
            </p>
          ) : (
            <div className="h-80 w-full text-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={byParameter} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={tick}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis yAxisId="left" allowDecimals={false} tick={tick} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    unit="%"
                    tick={tick}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="top" height={28} />
                  <ReferenceLine
                    yAxisId="right"
                    y={80}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Incidencias"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    dataKey="cumulativePercent"
                    name="% acumulado"
                    unit="%"
                    type="monotone"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tendencia mensual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificados emitidos por mes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Conformes contra certificados con al menos un parámetro fuera de rango.
          </p>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No hay certificados en el periodo seleccionado.
            </p>
          ) : (
            <div className="h-80 w-full text-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={tick} />
                  <YAxis allowDecimals={false} tick={tick} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="top" height={28} />
                  <Bar dataKey="compliant" name="Conformes" stackId="m" fill="#10b981" />
                  <Bar
                    dataKey="withDeviation"
                    name="Con desviación"
                    stackId="m"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}