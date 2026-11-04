import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function EquiposPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/equipos">
        <ModulePlaceholder href="/equipos" />
      </ModuleGate>
    </Suspense>
  );
}
