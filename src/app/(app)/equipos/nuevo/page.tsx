import Link from "next/link";
import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { createEquipment } from "../actions";
import { EquipmentForm } from "../_components/equipment-form";

export const metadata = { title: "Nuevo equipo" };

export default function NuevoEquipoPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/equipos">
        <section className="flex max-w-3xl flex-col gap-6">
          <header className="flex flex-col gap-1">
            <Link href="/equipos" className="text-sm text-muted-foreground hover:text-foreground">
              ← Equipos
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Nuevo equipo</h1>
            <p className="text-pretty text-muted-foreground">
              La clave del equipo la genera el sistema al guardar.
            </p>
          </header>
          <EquipmentForm action={createEquipment} submitLabel="Registrar equipo" />
        </section>
      </ModuleGate>
    </Suspense>
  );
}
