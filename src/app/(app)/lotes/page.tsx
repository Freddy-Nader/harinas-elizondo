import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function LotesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/lotes">
        <ModulePlaceholder href="/lotes" />
      </ModuleGate>
    </Suspense>
  );
}
