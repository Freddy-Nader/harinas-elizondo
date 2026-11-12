"use client";

import { useState } from "react";
import { controlClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/action-state";
import { EQUIPMENT_TYPE_LABEL, parametersFor, type EquipmentType } from "@/lib/domain/parameters";
import { evaluate, type LimitsByParameter } from "@/lib/domain/quality";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type EquipmentOption = { id: string; shortDescription: string; usable: boolean };

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  results: Record<string, { value: number; equipmentId: string }>;
  limits: LimitsByParameter;
  equipment: Record<EquipmentType, EquipmentOption[]>;
  readOnly: boolean;
};

const MACHINES: EquipmentType[] = ["alveograph", "farinograph"];

/**
 * RF-04 · UC-04. Results of both machines in one inspection (D-09). The deviation column
 * previews each value against the international limits as it is typed (BR-CER-04).
 */
export function ResultsForm({ action, results, limits, equipment, readOnly }: Props) {
  const { pending, onSubmit, errors } = useFormAction(action);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(results).map(([code, r]) => [code, String(r.value)])),
  );
  const captured = Object.values(values).filter((v) => v.trim() !== "").length;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <fieldset disabled={readOnly || pending} className="contents">
        {MACHINES.map((type) => {
          const params = parametersFor(type);
          const current = params.map((p) => results[p.code]?.equipmentId).find(Boolean) ?? "";
          const options = equipment[type];
          const fieldError = errors[`equipment_${type}`];
          return (
            <div key={type} className="flex flex-col gap-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h3 className="font-semibold">{EQUIPMENT_TYPE_LABEL[type]}</h3>
                <div className="flex min-w-64 flex-col gap-1">
                  <label htmlFor={`equipment_${type}`} className="text-xs font-medium text-muted-foreground">
                    Equipo utilizado
                  </label>
                  <select
                    id={`equipment_${type}`}
                    name={`equipment_${type}`}
                    defaultValue={current}
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={fieldError ? `equipment_${type}-error` : undefined}
                    className={cn(controlClass, "h-8")}
                  >
                    <option value="">Elige un equipo</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id} disabled={!o.usable && o.id !== current}>
                        {o.shortDescription} · {o.id}
                        {o.usable ? "" : " (no disponible)"}
                      </option>
                    ))}
                  </select>
                  {fieldError && (
                    <p id={`equipment_${type}-error`} className="text-xs text-destructive">
                      {fieldError}
                    </p>
                  )}
                  {options.every((o) => !o.usable) && (
                    <p className="text-xs text-destructive">
                      No hay {EQUIPMENT_TYPE_LABEL[type].toLowerCase()}s disponibles. Regístralo en Equipos.
                    </p>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">Parámetro</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Resultado</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Referencia internacional</th>
                      <th scope="col" className="py-2 font-medium">Desviación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.map((p) => {
                      const limit = limits[p.code];
                      const raw = values[p.code] ?? "";
                      const n = raw.trim() === "" ? null : Number(raw.replace(",", "."));
                      const result = n !== null && Number.isFinite(n) && limit ? evaluate(n, limit) : null;
                      const error = errors[p.code];
                      return (
                        <tr key={p.code} className="border-t align-top">
                          <td className="py-2.5 pr-3">
                            <p className="font-medium">{p.label}</p>
                            <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <Input
                                name={`value_${p.code}`}
                                inputMode="decimal"
                                autoComplete="off"
                                value={raw}
                                onChange={(e) => setValues((v) => ({ ...v, [p.code]: e.target.value }))}
                                aria-label={`${p.label}${p.unit ? ` en ${p.unit}` : ""}`}
                                aria-invalid={error ? true : undefined}
                                className="w-28 tabular-nums"
                              />
                              <span className="text-xs text-muted-foreground">{p.unit}</span>
                            </div>
                            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                          </td>
                          <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                            {limit ? `${formatNumber(limit.lower)} – ${formatNumber(limit.upper)}` : "Sin referencia"}
                          </td>
                          <td className="py-2.5" aria-live="polite">
                            <Deviation result={result} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar resultados"}
            </Button>
            <p className="text-sm text-muted-foreground tabular-nums">
              {captured} de 10 parámetros capturados
              {captured < 10 ? ". Puedes guardar y terminar después." : "."}
            </p>
          </div>
        )}
      </fieldset>
    </form>
  );
}

function Deviation({ result }: { result: ReturnType<typeof evaluate> | null }) {
  if (!result) return <span className="text-muted-foreground">—</span>;
  if (result.status === "within") return <span className="text-muted-foreground">Dentro de rango</span>;
  const sign = result.deviation > 0 ? "+" : "−";
  return (
    <span className="font-medium text-destructive tabular-nums">
      {result.status === "above" ? "Arriba" : "Abajo"} {sign}
      {formatNumber(Math.abs(result.deviation))}
    </span>
  );
}
