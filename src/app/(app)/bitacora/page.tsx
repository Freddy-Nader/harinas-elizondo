import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function BitacoraPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/bitacora">
        <ModulePlaceholder href="/bitacora" />
      </ModuleGate>
    </Suspense>
  );
}
