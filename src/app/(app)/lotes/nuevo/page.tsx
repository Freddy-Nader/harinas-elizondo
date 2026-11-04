import Link from "next/link";
import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { createLot } from "../actions";
import { LotForm } from "../_components/lot-form";
import { productSuggestions } from "../data";

export const metadata = { title: "Nuevo lote" };

export default function NuevoLotePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/lotes">
        <section className="flex max-w-3xl flex-col gap-6">
          <header className="flex flex-col gap-1">
            <Link href="/lotes" className="text-sm text-muted-foreground hover:text-foreground">
              ← Lotes
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Nuevo lote</h1>
            <p className="text-pretty text-muted-foreground">
              Después de registrarlo podrás iniciar su primera inspección.
            </p>
          </header>
          <NewLotForm />
        </section>
      </ModuleGate>
    </Suspense>
  );
}

async function NewLotForm() {
  const suggestions = await productSuggestions();
  return <LotForm action={createLot} suggestions={suggestions} submitLabel="Registrar lote" />;
}
