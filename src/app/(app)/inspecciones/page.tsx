import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function InspeccionesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/inspecciones">
        <ModulePlaceholder href="/inspecciones" />
      </ModuleGate>
    </Suspense>
  );
}
