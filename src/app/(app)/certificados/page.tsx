import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function CertificadosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/certificados">
        <ModulePlaceholder href="/certificados" />
      </ModuleGate>
    </Suspense>
  );
}
