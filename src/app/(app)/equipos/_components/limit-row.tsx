"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/action-state";

type Props = {
  code: string;
  label: string;
  unit: string;
  lower: number | null;
  upper: number | null;
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  readOnly?: boolean;
};

/** RF-02. One parameter with its international lower and upper limits. */
export function LimitRow({ code, label, unit, lower, upper, action, readOnly }: Props) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.fieldErrors ?? {};
  const missing = lower === null || upper === null;
  const error = errors.lowerLimit ?? errors.upperLimit;

  return (
    <form
      onSubmit={onSubmit}
      className="grid items-start gap-2 border-b py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto]"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">
          {label}
          {unit && <span className="font-normal text-muted-foreground"> · {unit}</span>}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{code}</p>
        {missing && <p className="text-xs text-destructive">Sin valores de referencia</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Input
        name="lowerLimit"
        inputMode="decimal"
        aria-label={`${label}, límite inferior`}
        aria-invalid={errors.lowerLimit ? true : undefined}
        placeholder="Mínimo"
        defaultValue={lower ?? ""}
        disabled={readOnly || pending}
        className="tabular-nums"
      />
      <Input
        name="upperLimit"
        inputMode="decimal"
        aria-label={`${label}, límite superior`}
        aria-invalid={errors.upperLimit ? true : undefined}
        placeholder="Máximo"
        defaultValue={upper ?? ""}
        disabled={readOnly || pending}
        className="tabular-nums"
      />
      {!readOnly && (
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      )}
    </form>
  );
}
