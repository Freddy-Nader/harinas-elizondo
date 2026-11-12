import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { auditHref, pageCount, PAGE_SIZE, type AuditFilters } from "../filters";

const count = new Intl.NumberFormat("es-MX");

/** RF-08. Previous and next links that keep the filters. */
export function AuditPagination({ filters, total, shown }: { filters: AuditFilters; total: number; shown: number }) {
  const pages = pageCount(total);
  const first = (filters.page - 1) * PAGE_SIZE + 1;
  const summary =
    shown > 0
      ? `${count.format(first)}–${count.format(first + shown - 1)} de ${count.format(total)} ${total === 1 ? "movimiento" : "movimientos"}`
      : `${count.format(total)} ${total === 1 ? "movimiento" : "movimientos"}`;

  return (
    <nav aria-label="Paginación de la bitácora" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="tabular-nums text-muted-foreground">
        {summary} · Página {count.format(filters.page)} de {count.format(pages)}
      </p>
      <div className="flex gap-2">
        <PageLink href={auditHref(filters, filters.page - 1)} disabled={filters.page <= 1}>
          Anterior
        </PageLink>
        <PageLink href={auditHref(filters, filters.page + 1)} disabled={filters.page >= pages}>
          Siguiente
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  if (disabled) {
    return (
      <span aria-disabled className={cn(className, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
