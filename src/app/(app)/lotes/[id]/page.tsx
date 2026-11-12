import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeviationCount, InspectionStatus } from "@/components/inspection-status";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { Separator } from "@/components/ui/separator";
import { nextSequence } from "@/lib/domain/inspection-sequence";
import { formatDate, formatDateTime } from "@/lib/format";
import { startLotInspection, updateLot } from "../actions";
import { LotForm } from "../_components/lot-form";
import { NewInspection } from "../_components/new-inspection";
import { getLot, productSuggestions } from "../data";

export const metadata = { title: "Lote" };

export default function LotePage({ params }: PageProps<"/lotes/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/lotes">
        <LotDetail params={params} />
      </ModuleGate>
    </Suspense>
  );
}

async function LotDetail({ params }: Pick<PageProps<"/lotes/[id]">, "params">) {
  const id = decodeURIComponent((await params).id);
  const [lot, suggestions] = await Promise.all([getLot(id), productSuggestions()]);
  if (!lot) notFound();

  const certified = lot.inspections.some((i) => i.lockedAt !== null);
  const next = nextSequence(lot.latest?.sequence ?? null);

  return (
    <section className="flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/lotes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Lotes
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">{lot.id}</h1>
        <p className="text-sm text-muted-foreground">
          {lot.product} · Producido {formatDate(lot.producedOn)} · Caduca {formatDate(lot.expiresOn)}
        </p>
      </header>

      <Section title="Inspecciones" description="La secuencia la asigna el sistema (A, B, … Z, AA). Para certificar se usa la última inspección completa.">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Secuencia</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Fecha</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Estado</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Desviaciones</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Capturó</th>
              </tr>
            </thead>
            <tbody>
              {lot.inspections.map((i) => (
                <tr key={i.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <Link href={`/inspecciones/${i.id}`} className="font-mono font-medium underline-offset-4 hover:underline">
                      {i.sequence}
                    </Link>
                    {i.reinspectionReason && <p className="text-xs text-muted-foreground">Re-inspección: {i.reinspectionReason}</p>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{formatDateTime(i.inspectedAt)}</td>
                  <td className="px-4 py-2.5">
                    <InspectionStatus complete={i.complete} locked={i.lockedAt !== null} resultCount={i.resultCount} />
                  </td>
                  <td className="px-4 py-2.5">{i.resultCount ? <DeviationCount n={i.deviations} /> : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{i.createdByName ?? "—"}</td>
                </tr>
              ))}
              {lot.inspections.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Sin inspecciones todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <NewInspection
          action={startLotInspection.bind(null, lot.id)}
          next={next}
          latest={lot.latest && { id: lot.latest.id, sequence: lot.latest.sequence, complete: lot.latest.complete }}
        />
      </Section>

      <Section
        title="Datos del lote"
        description={certified ? "El lote ya tiene un certificado emitido, así que sus datos quedan como historial." : undefined}
      >
        <LotForm
          action={updateLot.bind(null, lot.id)}
          values={lot}
          suggestions={suggestions}
          readOnly={certified}
          submitLabel="Guardar cambios"
        />
      </Section>
    </section>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Separator />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="max-w-2xl text-pretty text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
