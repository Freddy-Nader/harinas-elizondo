import Link from "next/link";
import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { requireUser } from "@/lib/session";
import { AuditFilterForm } from "./_components/audit-filters";
import { AuditPagination } from "./_components/audit-pagination";
import { AuditTable } from "./_components/audit-table";
import { listAuditLog } from "./data";
import { auditHref, hasFilters, pageCount, parseAuditFilters } from "./filters";

export const metadata = { title: "Bitácora" };

/** RF-08 · D-20. Read-only audit log for both roles, filtered and paginated from the URL. */
export default function BitacoraPage({ searchParams }: PageProps<"/bitacora">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/bitacora">
        <section className="flex max-w-6xl flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Bitácora</h1>
            <p className="text-pretty text-muted-foreground">
              Quién hizo qué y cuándo. Los movimientos se registran solos y no se pueden editar ni borrar.
            </p>
          </header>
          <AuditLog searchParams={searchParams} />
        </section>
      </ModuleGate>
    </Suspense>
  );
}

async function AuditLog({ searchParams }: Pick<PageProps<"/bitacora">, "searchParams">) {
  const filters = parseAuditFilters(await searchParams);
  const [user, { rows, total }] = await Promise.all([requireUser(), listAuditLog(filters)]);
  const filtered = hasFilters(filters);
  const pastEnd = total > 0 && rows.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <AuditFilterForm filters={filters} />
      {pastEnd ? (
        <p className="rounded-xl border px-4 py-10 text-center text-sm text-muted-foreground">
          Esta página no tiene movimientos.{" "}
          <Link href={auditHref(filters, pageCount(total))} className="text-foreground underline underline-offset-4">
            Ir a la última página
          </Link>
        </p>
      ) : (
        <AuditTable
          rows={rows}
          role={user.role}
          emptyMessage={
            filtered ? "Ningún movimiento coincide con los filtros." : "Todavía no hay movimientos registrados."
          }
        />
      )}
      <AuditPagination filters={filters} total={total} shown={rows.length} />
    </div>
  );
}
