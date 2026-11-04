import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function ClientesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/clientes">
        <ModulePlaceholder href="/clientes" />
      </ModuleGate>
    </Suspense>
  );
}
