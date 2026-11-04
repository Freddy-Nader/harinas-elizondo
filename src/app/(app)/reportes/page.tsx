import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function ReportesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/reportes">
        <ModulePlaceholder href="/reportes" />
      </ModuleGate>
    </Suspense>
  );
}
