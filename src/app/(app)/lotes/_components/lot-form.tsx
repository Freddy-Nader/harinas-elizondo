"use client";

import { fieldProps, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/action-state";

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  /** Present when editing. The lot code cannot change. */
  values?: { id: string; product: string; producedOn: string; expiresOn: string };
  suggestions: string[];
  readOnly?: boolean;
  submitLabel: string;
};

/** RF-04 · UC-03. Lot code, product (with suggestions, D-21) and dates. */
export function LotForm({ action, values, suggestions, readOnly, submitLabel }: Props) {
  const { pending, onSubmit, errors } = useFormAction(action);

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <fieldset disabled={readOnly || pending} className="contents">
        {values ? (
          <FormField id="id-readonly" label="Número de lote">
            <Input id="id-readonly" value={values.id} readOnly disabled className="font-mono" />
          </FormField>
        ) : (
          <FormField id="id" label="Número de lote" required error={errors.id} hint="El que imprime producción. Se guarda en mayúsculas.">
            <Input {...fieldProps("id", errors.id)} maxLength={20} required autoComplete="off" placeholder="L-2026-1104" className="font-mono uppercase" />
          </FormField>
        )}
        <FormField id="product" label="Producto" required error={errors.product}>
          <Input {...fieldProps("product", errors.product)} maxLength={60} required list="product-suggestions" defaultValue={values?.product ?? ""} placeholder="Harina de trigo panificable" />
          <datalist id="product-suggestions">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </FormField>
        <FormField id="producedOn" label="Fecha de producción" required error={errors.producedOn}>
          <Input {...fieldProps("producedOn", errors.producedOn)} type="date" required defaultValue={values?.producedOn ?? ""} />
        </FormField>
        <FormField id="expiresOn" label="Fecha de caducidad" required error={errors.expiresOn}>
          <Input {...fieldProps("expiresOn", errors.expiresOn)} type="date" required defaultValue={values?.expiresOn ?? ""} />
        </FormField>
        {!readOnly && (
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : submitLabel}
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}
