import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { InspectionStatus } from "@/components/inspection-status";
import { PARAMETERS } from "@/lib/domain/parameters";
import { formatDate, formatDateTime } from "@/lib/format";
import { saveInspectionResults } from "../actions";
import { ResultsForm } from "../_components/results-form";
import { getInspection } from "../data";

export const metadata = { title: "Inspección" };

export default function InspeccionPage({ params }: PageProps<"/inspecciones/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/inspecciones">
        <InspectionDetail params={params} />
      </ModuleGate>
    </Suspense>
  );
}

async function InspectionDetail({ params }: Pick<PageProps<"/inspecciones/[id]">, "params">) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) notFound();
  const inspection = await getInspection(numericId);
  if (!inspection) notFound();

  const resultCount = Object.keys(inspection.results).length;
  const complete = resultCount === PARAMETERS.length;
  const locked = inspection.lockedAt !== null;

  return (
    <section className="flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href={`/lotes/${encodeURIComponent(inspection.lot.id)}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Lote {inspection.lot.id}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Inspección <span className="font-mono">{inspection.sequence}</span>
          </h1>
          <InspectionStatus complete={complete} locked={locked} resultCount={resultCount} />
        </div>
        <p className="text-sm text-muted-foreground">
          Lote <span className="font-mono text-foreground">{inspection.lot.id}</span> · {inspection.lot.product} · Producido{" "}
          {formatDate(inspection.lot.producedOn)} · Iniciada {formatDateTime(inspection.inspectedAt)}
        </p>
        {inspection.reinspectionReason && (
          <p className="text-sm">
            <span className="font-medium">Re-inspección por falla del equipo:</span> {inspection.reinspectionReason}
          </p>
        )}
      </header>

      {locked ? (
        <Notice>Esta inspección ya se usó en un certificado. Sus resultados quedan como historial y no se pueden modificar.</Notice>
      ) : !inspection.isLatest ? (
        <Notice>Hay una inspección más reciente de este lote. El certificado deberá usar la inspección más reciente y esperar a que esté completa.</Notice>
      ) : null}

      <ResultsForm
        action={saveInspectionResults.bind(null, inspection.id)}
        results={inspection.results}
        limits={inspection.limits}
        equipment={inspection.equipment}
        readOnly={locked}
      />

      <p className="max-w-2xl text-pretty text-xs text-muted-foreground">
        La desviación se compara aquí con los valores internacionales. Al emitir el certificado se usan los valores del cliente
        cuando los tiene. Un valor fuera de rango no invalida la inspección: aparece en la columna de desviación del certificado.
      </p>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">{children}</p>;
}
