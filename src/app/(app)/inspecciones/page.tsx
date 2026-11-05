import Link from "next/link";
import { Suspense } from "react";
import { DeviationCount, InspectionStatus } from "@/components/inspection-status";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { listInspections } from "./data";

export const metadata = { title: "Inspecciones" };

export default function InspeccionesPage({ searchParams }: PageProps<"/inspecciones">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/inspecciones">
        <section className="flex max-w-6xl flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">Inspecciones</h1>
              <p className="text-pretty text-muted-foreground">
                Resultados del alveógrafo y el farinógrafo por lote. Una inspección nueva se inicia desde su lote.
              </p>
            </div>
            <Link href="/lotes" className={buttonVariants({ variant: "outline" })}>
              Ir a Lotes
            </Link>
          </header>
          <InspectionTable searchParams={searchParams} />
        </section>
      </ModuleGate>
    </Suspense>
  );
}

async function InspectionTable({ searchParams }: Pick<PageProps<"/inspecciones">, "searchParams">) {
  const { lote } = await searchParams;
  const query = typeof lote === "string" ? lote : "";
  const rows = await listInspections(query);

  return (
    <div className="flex flex-col gap-3">
      <form role="search" className="flex max-w-sm gap-2">
        <Input name="lote" defaultValue={query} placeholder="Filtrar por lote" aria-label="Filtrar por lote" />
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Filtrar
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Lote</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Secuencia</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Fecha</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Estado</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Desviaciones</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Capturó</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                <td className="px-4 py-2.5">
                  <Link href={`/lotes/${encodeURIComponent(i.lotId)}`} className="font-mono text-xs hover:underline">
                    {i.lotId}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/inspecciones/${i.id}`} className="font-mono font-medium underline-offset-4 hover:underline">
                    {i.sequence}
                  </Link>
                  {i.reinspectionReason && <span className="ml-2 text-xs text-muted-foreground">Re-inspección</span>}
                </td>
                <td className="px-4 py-2.5 tabular-nums">{formatDateTime(i.inspectedAt)}</td>
                <td className="px-4 py-2.5">
                  <InspectionStatus complete={i.complete} locked={i.lockedAt !== null} resultCount={i.resultCount} />
                </td>
                <td className="px-4 py-2.5">{i.resultCount ? <DeviationCount n={i.deviations} /> : "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{i.createdByName ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {query ? "No hay inspecciones de ese lote." : "Todavía no hay inspecciones."}{" "}
                  <Link href="/lotes" className="text-foreground underline underline-offset-4">
                    Inicia una desde un lote
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
