import type { CertificateLine } from "@/lib/domain/certificate";
import { EQUIPMENT_TYPE_LABEL } from "@/lib/domain/parameters";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * RF-05 · BR-CER-04. Result, limits and signed deviation per parameter. Out-of-range values
 * are highlighted, never hidden (the "visualizador" the as-is process asked for).
 */
export function LinesTable({ lines, showSource }: { lines: CertificateLine[]; showSource?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Parámetro</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Equipo</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Resultado</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Mínimo</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Máximo</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Desviación</th>
            {showSource && <th scope="col" className="px-4 py-2.5 font-medium">Referencia</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const out = l.status !== "within";
            return (
              <tr key={l.parameterCode} className={cn("border-b last:border-0", out && "bg-destructive/5")}>
                <td className="px-4 py-2">
                  {l.label}
                  {l.unit && <span className="text-muted-foreground"> · {l.unit}</span>}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{EQUIPMENT_TYPE_LABEL[l.equipmentType]}</td>
                <td className={cn("px-4 py-2 text-right tabular-nums", out && "font-medium text-destructive")}>
                  {formatNumber(l.value)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatNumber(l.lowerLimit)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatNumber(l.upperLimit)}</td>
                <td className={cn("px-4 py-2 text-right tabular-nums", out ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {l.deviation > 0 ? "+" : ""}
                  {formatNumber(l.deviation)}
                  <span className="sr-only">{out ? (l.status === "above" ? " por encima" : " por debajo") : " dentro de rango"}</span>
                </td>
                {showSource && (
                  <td className="px-4 py-2 text-muted-foreground">{l.source === "client" ? "Cliente" : "Internacional"}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
