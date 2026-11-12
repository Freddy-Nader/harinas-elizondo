"use client";

import { useState } from "react";
import { fieldProps, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/action-state";
import type { EquipmentStatus, StatusChange } from "@/lib/domain/equipment";

type Props = {
  status: EquipmentStatus;
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
};

/** RF-02 · D-16. Inactivate (temporary), reactivate, or retire (final). */
export function StatusPanel({ status, action }: Props) {
  const { state, pending, onSubmit } = useFormAction(action);
  const [change, setChange] = useState<StatusChange | null>(null);

  if (status === "retired") {
    return (
      <p className="text-sm text-muted-foreground">
        El equipo está dado de baja. Se conserva solo como historial y ya no se puede modificar.
      </p>
    );
  }

  const options: { change: StatusChange; label: string; variant: "outline" | "destructive" }[] =
    status === "active"
      ? [
          { change: "deactivate", label: "Inactivar", variant: "outline" },
          { change: "retire", label: "Dar de baja", variant: "destructive" },
        ]
      : [
          { change: "reactivate", label: "Reactivar", variant: "outline" },
          { change: "retire", label: "Dar de baja", variant: "destructive" },
        ];

  // After a saved change the status moves on, so a choice that no longer applies hides the box
  const needsReason =
    (change === "deactivate" || change === "retire") && options.some((o) => o.change === change);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            key={o.change}
            type={o.change === "reactivate" ? "submit" : "button"}
            name={o.change === "reactivate" ? "change" : undefined}
            value={o.change === "reactivate" ? o.change : undefined}
            variant={change === o.change ? "default" : o.variant}
            disabled={pending}
            onClick={() => setChange(o.change === "reactivate" ? null : o.change)}
          >
            {o.label}
          </Button>
        ))}
      </div>
      {needsReason && (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <input type="hidden" name="change" value={change} />
          <FormField
            id="reason"
            label={change === "retire" ? "Motivo de la baja" : "Motivo de la inactivación"}
            required
            error={state.fieldErrors?.reason}
            hint={
              change === "retire"
                ? "La baja es definitiva. El equipo queda solo como historial."
                : "La inactivación es temporal. Podrás reactivarlo después."
            }
          >
            <Input {...fieldProps("reason", state.fieldErrors?.reason)} maxLength={200} required autoFocus />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" variant={change === "retire" ? "destructive" : "default"} disabled={pending}>
              {pending ? "Guardando…" : change === "retire" ? "Confirmar baja" : "Confirmar inactivación"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setChange(null)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
