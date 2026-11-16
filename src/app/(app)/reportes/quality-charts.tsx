"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FactorStats, TrendPoint } from "@/lib/domain/production-quality";

interface QualityChartsProps {
  factor: FactorStats;
  trend: TrendPoint[];
  factors: FactorStats[];
}

const tooltipStyle = {
  backgroundColor: "var(--background)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

const tick = { fill: "currentColor", fontSize: 12 };
const fmt = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 3 });

// Green inside the limits, amber outside, gray when the factor has no limits
const pointColor = (inSpec: boolean | null) =>
  inSpec === false ? "#f59e0b" : inSpec === true ? "#10b981" : "#94a3b8";

/** Padded axis range rounded to a round step, so ticks read 50, 60, 70 instead of 57.3. */
function niceDomain(min: number, max: number): [number, number] {
  const pad = (max - min) * 0.1 || Math.abs(max) * 0.1 || 1;
  const step = 10 ** Math.floor(Math.log10(pad));
  return [Math.floor((min - pad) / step) * step, Math.ceil((max + pad) / step) * step];
}

/** RF-07 · UC-08. Control chart of one factor and the share of lots in spec per factor. */
export function QualityCharts({ factor, trend, factors }: QualityChartsProps) {
  const unit = factor.unit ? ` ${factor.unit}` : "";
  const rates = factors
    .filter((f) => f.inSpecRate !== null)
    .map((f) => ({ label: f.label, rate: f.inSpecRate as number }));

  // Leave room around the limits so both lines are always visible
  const values = trend.map((p) => p.value);
  const bounds = [...values, factor.lower, factor.upper].filter((v): v is number => v !== null);
  const domain = bounds.length ? niceDomain(Math.min(...bounds), Math.max(...bounds)) : ["auto", "auto"];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gráfica de control · {factor.label}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Un punto por lote analizado, en orden de producción. Las líneas punteadas son los límites
            internacionales y la línea gris es el promedio.
          </p>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No hay lotes con inspección completa en el periodo seleccionado.
            </p>
          ) : (
            <div className="h-80 w-full text-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="lotId" tick={tick} interval="preserveStartEnd" />
                  <YAxis tick={tick} domain={domain} tickFormatter={fmt} width={64} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${fmt(Number(value))}${unit}`, factor.label]}
                    labelFormatter={(lotId, payload) => {
                      const point = payload?.[0]?.payload as TrendPoint | undefined;
                      return point ? `Lote ${lotId} · ${point.producedOn}` : `Lote ${lotId}`;
                    }}
                  />
                  {factor.upper !== null && (
                    <ReferenceLine
                      y={factor.upper}
                      stroke="#dc2626"
                      strokeDasharray="4 4"
                      label={{ value: "Límite superior", position: "insideTopRight", fill: "currentColor", fontSize: 11 }}
                    />
                  )}
                  {factor.lower !== null && (
                    <ReferenceLine
                      y={factor.lower}
                      stroke="#dc2626"
                      strokeDasharray="4 4"
                      label={{ value: "Límite inferior", position: "insideBottomRight", fill: "currentColor", fontSize: 11 }}
                    />
                  )}
                  {factor.mean !== null && <ReferenceLine y={factor.mean} stroke="#94a3b8" />}
                  <Line
                    dataKey="value"
                    name={factor.label}
                    type="linear"
                    stroke="#2563eb"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={(props) => {
                      const { cx, cy, payload, index } = props as {
                        cx: number;
                        cy: number;
                        payload: TrendPoint;
                        index: number;
                      };
                      return (
                        <circle key={index} cx={cx} cy={cy} r={4} fill={pointColor(payload.inSpec)} stroke="none" />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lotes dentro de especificación por factor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Porcentaje de lotes analizados cuyo valor quedó dentro de los límites internacionales.
          </p>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No hay lotes con inspección completa en el periodo seleccionado.
            </p>
          ) : (
            <div className="h-80 w-full text-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rates} layout="vertical" margin={{ top: 8, right: 40, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={tick} />
                  <YAxis type="category" dataKey="label" tick={tick} width={150} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, "Dentro de especificación"]} />
                  <Bar dataKey="rate" name="Dentro de especificación" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {rates.map((r) => (
                      <Cell key={r.label} fill={r.rate >= 95 ? "#10b981" : r.rate >= 80 ? "#f59e0b" : "#dc2626"} />
                    ))}
                    <LabelList dataKey="rate" position="right" formatter={(v) => `${v}%`} fill="currentColor" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
