import Link from "next/link";
import { controlClass } from "@/components/form-field";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasFilters, type AuditFilters } from "../filters";
import { ACTION_OPTIONS, actionLabel, ENTITY_OPTIONS, entityLabel } from "../labels";

/**
 * RF-08. Filter bar. A plain GET form, so the filters live in the URL and the page
 * can be shared or reloaded. Submitting goes back to page 1.
 */
export function AuditFilterForm({ filters }: { filters: AuditFilters }) {
  return (
    <form role="search" aria-label="Filtrar la bitácora" action="/bitacora" className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field id="entidad" label="Entidad">
        <select id="entidad" name="entidad" defaultValue={filters.entity ?? ""} className={`${controlClass} h-8`}>
          <option value="">Todas</option>
          {withCurrent(ENTITY_OPTIONS, filters.entity, entityLabel).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="accion" label="Acción">
        <select id="accion" name="accion" defaultValue={filters.action ?? ""} className={`${controlClass} h-8`}>
          <option value="">Todas</option>
          {withCurrent(ACTION_OPTIONS, filters.action, actionLabel).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="empleado" label="Empleado">
        <Input id="empleado" name="empleado" defaultValue={filters.employee ?? ""} placeholder="Número o nombre" maxLength={100} />
      </Field>
      <Field id="desde" label="Desde">
        <Input id="desde" name="desde" type="date" defaultValue={filters.from ?? ""} />
      </Field>
      <Field id="hasta" label="Hasta">
        <Input id="hasta" name="hasta" type="date" defaultValue={filters.to ?? ""} />
      </Field>
      <Field id="id" label="Identificador del registro">
        <Input id="id" name="id" defaultValue={filters.entityId ?? ""} placeholder="Clave, lote o folio" maxLength={40} />
      </Field>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
        <button type="submit" className={buttonVariants()}>
          Filtrar
        </button>
        {hasFilters(filters) && (
          <Link href="/bitacora" className={buttonVariants({ variant: "ghost" })}>
            Quitar filtros
          </Link>
        )}
      </div>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** Keeps a code that is not in the known list (from the URL) selectable, so the form shows what is applied. */
function withCurrent(
  options: readonly { value: string; label: string }[],
  current: string | undefined,
  label: (code: string) => string,
) {
  if (!current || options.some((o) => o.value === current)) return options;
  return [...options, { value: current, label: label(current) }];
}
