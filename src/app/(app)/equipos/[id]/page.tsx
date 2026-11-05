import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { Separator } from "@/components/ui/separator";
import {
  EQUIPMENT_FIELD_LABEL,
  EQUIPMENT_STATUS_LABEL,
  equipmentReadiness,
  isEditable,
  isEquipmentKey,
  type EquipmentStatus,
} from "@/lib/domain/equipment";
import { EQUIPMENT_TYPE_LABEL, PARAMETERS, parametersFor } from "@/lib/domain/parameters";
import { changeEquipmentStatus, saveInternationalLimit, updateEquipment } from "../actions";
import { EquipmentForm } from "../_components/equipment-form";
import { LimitRow } from "../_components/limit-row";
import { StatusBadge } from "../_components/status-badge";
import { StatusPanel } from "../_components/status-panel";
import { getEquipment, getEquipmentHistory, getInternationalLimits } from "../data";

export const metadata = { title: "Equipo" };

export default function EquipoPage({ params }: PageProps<"/equipos/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/equipos">
        <EquipmentDetail params={params} />
      </ModuleGate>
    </Suspense>
  );
}

async function EquipmentDetail({ params }: Pick<PageProps<"/equipos/[id]">, "params">) {
  const { id } = await params;
  if (!isEquipmentKey(id)) notFound();
  const [item, limits] = await Promise.all([getEquipment(id), getInternationalLimits()]);
  if (!item) notFound();

  const readiness = equipmentReadiness(item.type, item.status, limits);
  const editable = isEditable(item.status);
  const parameters = parametersFor(item.type);

  return (
    <section className="flex max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/equipos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Equipos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{item.shortDescription}</h1>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {EQUIPMENT_TYPE_LABEL[item.type]} · Clave <span className="font-mono text-foreground">{item.id}</span>
          {item.statusReason && ` · ${EQUIPMENT_STATUS_LABEL[item.status]}: ${item.statusReason}`}
        </p>
      </header>

      <ReadinessNotice readiness={readiness} />

      <Section title="Parámetros y valores internacionales" description={`Los cinco factores que mide el ${EQUIPMENT_TYPE_LABEL[item.type].toLowerCase()}. Estos límites aplican a todos los equipos del mismo tipo y los usa cualquier cliente sin valores propios.`}>
        <p role="note" className="text-sm text-muted-foreground">Los rangos iniciales son datos de demostración. Confirma la norma y su aplicación al producto antes de utilizarlos como referencia oficial.</p>
        <div className="rounded-xl border px-4">
          {parameters.map((p) => (
            <LimitRow
              key={p.code}
              code={p.code}
              label={p.label}
              unit={p.unit}
              lower={limits[p.code]?.lower ?? null}
              upper={limits[p.code]?.upper ?? null}
              action={saveInternationalLimit.bind(null, p.code)}
              readOnly={!editable}
            />
          ))}
        </div>
      </Section>

      <Section title="Datos generales">
        <EquipmentForm
          action={updateEquipment.bind(null, item.id)}
          type={item.type}
          values={item}
          readOnly={!editable}
          submitLabel="Guardar cambios"
        />
      </Section>

      <Section title="Estado" description="Inactivo es temporal. Baja es definitiva y conserva el equipo solo como historial.">
        <StatusPanel status={item.status} action={changeEquipmentStatus.bind(null, item.id)} />
      </Section>

      <Section title="Historial de cambios">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando historial…</p>}>
          <History id={item.id} type={item.type} />
        </Suspense>
      </Section>
    </section>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Separator />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="max-w-2xl text-pretty text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ReadinessNotice({ readiness }: { readiness: ReturnType<typeof equipmentReadiness> }) {
  if (readiness.usable) {
    return (
      <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        Listo para certificar: activo y con valores de referencia en sus cinco parámetros.
      </p>
    );
  }
  if (readiness.reason === "status") {
    return (
      <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        No se puede usar para certificar mientras esté {EQUIPMENT_STATUS_LABEL[readiness.status].toLowerCase()}.
      </p>
    );
  }
  const labels = readiness.missing.map((code) => PARAMETERS.find((p) => p.code === code)?.label ?? code);
  return (
    <p role="status" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      No se puede usar para certificar: faltan valores de referencia para {labels.join(", ")}.
    </p>
  );
}

const ACTION_LABEL: Record<string, string> = {
  create: "Alta",
  update: "Modificación",
  deactivate: "Inactivación",
  reactivate: "Reactivación",
  retire: "Baja",
};

const dateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

async function History({ id, type }: { id: string; type: Parameters<typeof parametersFor>[0] }) {
  const rows = await getEquipmentHistory(id, type);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>;

  return (
    <ol className="flex flex-col">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-col gap-0.5 border-l py-2 pl-4">
          <p className="text-sm">
            <span className="font-medium">{historyTitle(row.entity, row.action, row.entityId)}</span>
            <span className="text-muted-foreground"> · {describe(row.entity, row.detail)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {dateTime.format(row.at)} · {row.userName ?? "Usuario"}
            {row.employeeId ? ` (${row.employeeId})` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

function historyTitle(entity: string, action: string, entityId: string) {
  if (entity === "international_limit") {
    const label = PARAMETERS.find((p) => p.code === entityId)?.label ?? entityId;
    return `Límites internacionales de ${label}`;
  }
  return ACTION_LABEL[action] ?? action;
}

function describe(entity: string, detail: unknown): string {
  const d = (detail ?? {}) as Record<string, unknown>;
  if (entity === "international_limit") {
    const after = d.after as [number, number] | undefined;
    const before = d.before as [number, number] | null | undefined;
    if (!after) return "";
    return before ? `de ${before[0]}–${before[1]} a ${after[0]}–${after[1]}` : `${after[0]}–${after[1]}`;
  }
  if (d.changes && typeof d.changes === "object") {
    const fields = Object.keys(d.changes as object).map((k) => EQUIPMENT_FIELD_LABEL[k] ?? k);
    return fields.length ? `cambió ${fields.join(", ").toLowerCase()}` : "";
  }
  if (typeof d.reason === "string") return d.reason;
  if (d.to) return EQUIPMENT_STATUS_LABEL[d.to as EquipmentStatus] ?? "";
  if (typeof d.shortDescription === "string") return d.shortDescription;
  return "";
}
