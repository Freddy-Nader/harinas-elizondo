"use client";

import Link from "next/link";
import { fieldProps, FormField } from "@/components/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/action-state";

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  next: string;
  latest: { id: number; sequence: string; complete: boolean } | null;
};

/** RF-04 · BR-INS-02 · BR-INS-04. Starts the next inspection; the letter comes from the system. */
export function NewInspection({ action, next, latest }: Props) {
  const { pending, onSubmit, errors } = useFormAction(action);

  if (latest && !latest.complete) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          La inspección {latest.sequence} está incompleta. Termínala antes de crear otra.
        </p>
        <Link href={`/inspecciones/${latest.id}`} className={buttonVariants({ size: "sm" })}>
          Continuar inspección {latest.sequence}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
      {latest ? (
        <FormField
          id="reason"
          label={`Motivo de la re-inspección ${next}`}
          required
          error={errors.reason}
          hint="La inspección anterior ya está completa. Solo se repite por una falla del equipo, y el motivo queda en la bitácora."
        >
          <Input {...fieldProps("reason", errors.reason)} maxLength={200} required placeholder="Falla de calibración en el alveógrafo" />
        </FormField>
      ) : (
        <p className="text-sm text-muted-foreground">El lote no tiene inspecciones. La primera recibe la secuencia A.</p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : latest ? `Registrar re-inspección ${next}` : "Iniciar inspección A"}
        </Button>
      </div>
    </form>
  );
}
