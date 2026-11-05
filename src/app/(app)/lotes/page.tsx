import Link from "next/link";
import { Suspense } from "react";
import { DeviationCount, InspectionStatus } from "@/components/inspection-status";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { listLots } from "./data";

export const metadata = { title: "Lotes" };

export default function LotesPage({ searchParams }: PageProps<"/lotes">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/lotes">
        <section className="flex max-w-6xl flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">Lotes de producción</h1>
              <p className="text-pretty text-muted-foreground">
                Cada lote guarda sus inspecciones. La última inspección completa es la que se certifica.
              </p>
            </div>
            <Link href="/lotes/nuevo" className={buttonVariants()}>
              Nuevo lote
            </Link>
          </header>
          <LotTable searchParams={searchParams} />
        </section>
      </ModuleGate>
    </Suspense>
  );
}

async function LotTable({ searchParams }: Pick<PageProps<"/lotes">, "searchParams">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const rows = await listLots(query);

  return (
    <div className="flex flex-col gap-3">
      <form role="search" className="flex max-w-sm gap-2">
        <Input name="q" defaultValue={query} placeholder="Buscar por lote o producto" aria-label="Buscar lote" />
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Buscar
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Lote</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Producto</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Producción</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Caducidad</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Inspecciones</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Última inspección</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                <td className="px-4 py-2.5">
                  <Link href={`/lotes/${encodeURIComponent(row.id)}`} className="font-mono text-xs font-medium underline-offset-4 hover:underline">
                    {row.id}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{row.product}</td>
                <td className="px-4 py-2.5 tabular-nums">{formatDate(row.producedOn)}</td>
                <td className="px-4 py-2.5 tabular-nums">{formatDate(row.expiresOn)}</td>
                <td className="px-4 py-2.5 tabular-nums">{row.inspectionCount}</td>
                <td className="px-4 py-2.5">
                  {row.latest ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/inspecciones/${row.latest.id}`} className="font-mono font-medium hover:underline">
                        {row.latest.sequence}
                      </Link>
                      <InspectionStatus complete={row.latest.complete} locked={row.latest.lockedAt !== null} resultCount={row.latest.resultCount} />
                      {row.latest.resultCount > 0 && <DeviationCount n={row.latest.deviations} />}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sin inspecciones</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {query ? "Ningún lote coincide con la búsqueda." : "Todavía no hay lotes registrados."}{" "}
                  {!query && (
                    <Link href="/lotes/nuevo" className="text-foreground underline underline-offset-4">
                      Registrar el primero
                    </Link>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
