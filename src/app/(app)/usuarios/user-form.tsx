"use client";

import type { ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { useFormAction } from "@/hooks/use-form-action";

export function UserForm({ action, children, label }: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  label: string;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  return (
    <form onSubmit={onSubmit}>
      <fieldset disabled={pending} className="flex flex-wrap items-end gap-3">
        {children}
        <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" type="submit">
          {pending ? "Guardando…" : label}
        </button>
      </fieldset>
      {state.message && <p role={state.ok ? "status" : "alert"} className="mt-2 text-sm">{state.message}</p>}
    </form>
  );
}
