"use client";

import { useState } from "react";
import { fieldProps, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/action-state";

/** D-25. Cancel an issued or sent certificate. Always asks for the reason first. */
export function CancelPanel({ action }: { action: (state: ActionState, form: FormData) => Promise<ActionState> }) {
  const { pending, onSubmit, errors } = useFormAction(action);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Cancelar certificado
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border p-3">
      <FormField
        id="reason"
        label="Motivo de la cancelación"
        required
        error={errors.reason}
        hint="El certificado no se borra: queda en el historial marcado como cancelado y ya no se puede enviar."
      >
        <Input {...fieldProps("reason", errors.reason)} maxLength={200} required autoFocus />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Cancelando…" : "Confirmar cancelación"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Volver
        </Button>
      </div>
    </form>
  );
}
