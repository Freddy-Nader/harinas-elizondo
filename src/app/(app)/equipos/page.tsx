import Link from "next/link";
import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { buttonVariants } from "@/components/ui/button";
import { EQUIPMENT_STATUS_LABEL, type EquipmentStatus } from "@/lib/domain/equipment";
import { EQUIPMENT_TYPE_LABEL } from "@/lib/domain/parameters";
import { cn } from "@/lib/utils";
import { ReadinessLabel, StatusBadge } from "./_components/status-badge";
import { countEquipmentByStatus, listEquipment } from "./data";

export const metadata = { title: "Equipos" };

const FILTERS: { value?: EquipmentStatus; label: string }[] = [
  { label: "Todos" },
  { value: "active", label: EQUIPMENT_STATUS_LABEL.active },
  { value: "inactive", label: EQUIPMENT_STATUS_LABEL.inactive },
  { value: "retired", label: EQUIPMENT_STATUS_LABEL.retired },
];

export default function EquiposPage({ searchParams }: PageProps<"/equipos">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/equipos">
        <section className="flex max-w-6xl flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">Equipos de laboratorio</h1>
              <p className="text-pretty text-muted-foreground">
                Alveógrafos y farinógrafos, los parámetros que miden y sus valores de referencia.
              </p>
            </div>
            <Link href="/equipos/nuevo" className={buttonVariants()}>
              Nuevo equipo
            </Link>
          </header>
          <EquipmentTable searchParams={searchParams} />
        </section>
      </ModuleGate>
    </Suspense>
  );
}

async function EquipmentTable({ searchParams }: Pick<PageProps<"/equipos">, "searchParams">) {
  const { estado } = await searchParams;
  const status = FILTERS.find((f) => f.value && f.value === estado)?.value;
  const [rows, counts] = await Promise.all([listEquipment(status), countEquipmentByStatus()]);
  const total = counts.active + counts.inactive + counts.retired;

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-1">
        {FILTERS.map((f) => {
          const active = f.value === status;
          const count = f.value ? counts[f.value] : total;
          return (
            <Link
              key={f.label}
              href={f.value ? `/equipos?estado=${f.value}` : "/equipos"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-muted font-medium text-foreground",
              )}
            >
              {f.label} <span className="tabular-nums">({count})</span>
            </Link>
          );
        })}
      </nav>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Clave</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Tipo</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Descripción</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Marca / modelo</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Estado</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Certificación</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                <td className="px-4 py-2.5">
                  <Link href={`/equipos/${row.id}`} className="font-mono text-xs font-medium underline-offset-4 hover:underline">
                    {row.id}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{EQUIPMENT_TYPE_LABEL[row.type]}</td>
                <td className="px-4 py-2.5">
                  <Link href={`/equipos/${row.id}`} className="hover:underline">
                    {row.shortDescription}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {[row.brand, row.model].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-2.5">
                  <ReadinessLabel readiness={row.readiness} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {status ? "No hay equipos con este estado." : "Todavía no hay equipos registrados."}{" "}
                  {!status && (
                    <Link href="/equipos/nuevo" className="text-foreground underline underline-offset-4">
                      Registrar el primero
                    </Link>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
