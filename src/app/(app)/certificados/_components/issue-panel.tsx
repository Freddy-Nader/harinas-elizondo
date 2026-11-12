"use client";

import { Button } from "@/components/ui/button";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/action-state";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

/**
 * UC-05 · RF-06. Issue the draft. Sending is on by default and can be turned off to review
 * the PDF first ("automatic by default, with optional confirmation").
 */
export function IssuePanel({ action, blockers, recipients }: { action: Action; blockers: string[]; recipients: string[] }) {
  const { pending, onSubmit } = useFormAction(action);
  const blocked = blockers.length > 0;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {blocked ? (
        <ul className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          Listo para emitir. Al emitir se guardan los resultados tal como se ven arriba y la inspección queda bloqueada:
          ya no se podrán modificar sus resultados.
        </p>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="sendNow" defaultChecked className="mt-0.5 size-4 accent-foreground" disabled={blocked || pending} />
        <span>
          Enviar por correo al emitir
          <span className="block text-xs text-muted-foreground">{recipients.join(", ")}</span>
        </span>
      </label>
      <div>
        <Button type="submit" disabled={blocked || pending}>
          {pending ? "Emitiendo…" : "Emitir certificado"}
        </Button>
      </div>
    </form>
  );
}

/** RF-06. Send an issued certificate, or send it again. */
export function SendButton({ action, label }: { action: Action; label: string }) {
  const { pending, onSubmit } = useFormAction(action);
  return (
    <form onSubmit={onSubmit}>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Enviando…" : label}
      </Button>
    </form>
  );
}
