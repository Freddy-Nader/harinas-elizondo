"use client";

import { controlClass, fieldProps, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/action-state";
import { EQUIPMENT_TYPE_LABEL, parametersFor, type EquipmentType } from "@/lib/domain/parameters";

type Values = {
  shortDescription: string;
  longDescription: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  supplier: string | null;
  acquiredOn: string | null;
  warrantyUntil: string | null;
  location: string | null;
  responsible: string | null;
};

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  /** Present when editing. The type is fixed once the equipment exists. */
  type?: EquipmentType;
  values?: Values;
  readOnly?: boolean;
  submitLabel: string;
};

const TEXT_FIELDS = [
  { id: "brand", label: "Marca", max: 40 },
  { id: "model", label: "Modelo", max: 40 },
  { id: "serialNumber", label: "Número de serie", max: 30 },
  { id: "supplier", label: "Proveedor", max: 80 },
  { id: "location", label: "Ubicación", max: 80 },
  { id: "responsible", label: "Responsable", max: 100 },
] as const;

/** RF-02 · UC-01. General data of a lab equipment, for create and edit. */
export function EquipmentForm({ action, type, values, readOnly, submitLabel }: Props) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <fieldset disabled={readOnly || pending} className="contents">
        {type ? (
          <FormField id="type-readonly" label="Tipo de equipo" hint={paramHint(type)}>
            <Input id="type-readonly" value={EQUIPMENT_TYPE_LABEL[type]} readOnly disabled />
          </FormField>
        ) : (
          <FormField id="type" label="Tipo de equipo" required error={errors.type} hint="Define los cinco parámetros que mide. No se puede cambiar después.">
            <select {...fieldProps("type", errors.type)} defaultValue="" className={`${controlClass} h-8`} required>
              <option value="" disabled>
                Elige un tipo
              </option>
              {(Object.keys(EQUIPMENT_TYPE_LABEL) as EquipmentType[]).map((t) => (
                <option key={t} value={t}>
                  {EQUIPMENT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField id="shortDescription" label="Descripción corta" required error={errors.shortDescription}>
          <Input
            {...fieldProps("shortDescription", errors.shortDescription)}
            maxLength={60}
            required
            defaultValue={values?.shortDescription ?? ""}
            placeholder="Alveógrafo línea 1"
          />
        </FormField>

        {TEXT_FIELDS.map((f) => (
          <FormField key={f.id} id={f.id} label={f.label} error={errors[f.id]}>
            <Input {...fieldProps(f.id, errors[f.id])} maxLength={f.max} defaultValue={values?.[f.id] ?? ""} />
          </FormField>
        ))}

        <FormField id="acquiredOn" label="Fecha de adquisición" error={errors.acquiredOn}>
          <Input {...fieldProps("acquiredOn", errors.acquiredOn)} type="date" defaultValue={values?.acquiredOn ?? ""} />
        </FormField>
        <FormField id="warrantyUntil" label="Garantía hasta" error={errors.warrantyUntil}>
          <Input {...fieldProps("warrantyUntil", errors.warrantyUntil)} type="date" defaultValue={values?.warrantyUntil ?? ""} />
        </FormField>

        <FormField id="longDescription" label="Descripción larga" error={errors.longDescription} className="sm:col-span-2">
          <textarea
            {...fieldProps("longDescription", errors.longDescription)}
            rows={3}
            maxLength={1000}
            defaultValue={values?.longDescription ?? ""}
            className={`${controlClass} py-2`}
          />
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

function paramHint(type: EquipmentType) {
  return `Mide: ${parametersFor(type)
    .map((p) => p.label)
    .join(", ")}.`;
}
