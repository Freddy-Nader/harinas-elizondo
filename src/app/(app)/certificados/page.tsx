import Link from "next/link";
import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { buttonVariants } from "@/components/ui/button";
import { CERTIFICATE_STATUS_LABEL, type CertificateStatus } from "@/lib/domain/certificate";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CertificateStatusBadge } from "./_components/status-badge";
import { countCertificatesByStatus, listCertificates } from "./data";

export const metadata = { title: "Certificados" };

const FILTERS: { value?: CertificateStatus; label: string }[] = [
  { label: "Todos" },
  { value: "draft", label: CERTIFICATE_STATUS_LABEL.draft },
  { value: "issued", label: CERTIFICATE_STATUS_LABEL.issued },
  { value: "sent", label: CERTIFICATE_STATUS_LABEL.sent },
  { value: "cancelled", label: CERTIFICATE_STATUS_LABEL.cancelled },
];

export default function CertificadosPage({ searchParams }: PageProps<"/certificados">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/certificados">
        <section className="flex max-w-6xl flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">Certificados de calidad</h1>
              <p className="text-pretty text-muted-foreground">
                Se emiten con la última inspección del lote, completa, y los valores de referencia del cliente.
              </p>
            </div>
            <Link href="/certificados/nuevo" className={buttonVariants()}>
              Nuevo certificado
            </Link>
          </header>
          <CertificateTable searchParams={searchParams} />
        </section>
      </ModuleGate>
    </Suspense>
  );
}

async function CertificateTable({ searchParams }: Pick<PageProps<"/certificados">, "searchParams">) {
  const { estado } = await searchParams;
  const status = FILTERS.find((f) => f.value && f.value === estado)?.value;
  const [rows, counts] = await Promise.all([listCertificates(status), countCertificatesByStatus()]);
  const total = counts.draft + counts.issued + counts.sent + counts.cancelled;

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-1">
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <Link
              key={f.label}
              href={f.value ? `/certificados?estado=${f.value}` : "/certificados"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-muted font-medium text-foreground",
              )}
            >
              {f.label} <span className="tabular-nums">({f.value ? counts[f.value] : total})</span>
            </Link>
          );
        })}
      </nav>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Folio</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Cliente</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Lote</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Orden de compra</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Estado</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Desviaciones</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Emitido</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                <td className="px-4 py-2.5">
                  <Link href={`/certificados/${row.id}`} className="font-mono text-xs font-medium underline-offset-4 hover:underline">
                    {row.id}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  {row.clientName} <span className="text-muted-foreground">· {row.sapKey}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{row.lotId}</td>
                <td className="px-4 py-2.5">{row.purchaseOrder}</td>
                <td className="px-4 py-2.5">
                  <CertificateStatusBadge status={row.status} />
                </td>
                <td className="px-4 py-2.5">
                  {row.deviations === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : row.deviations === 0 ? (
                    <span className="text-muted-foreground">Ninguna</span>
                  ) : (
                    <span className="text-destructive">{row.deviations}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(row.issuedAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {status ? "No hay certificados con este estado." : "Todavía no hay certificados."}{" "}
                  {!status && (
                    <Link href="/certificados/nuevo" className="text-foreground underline underline-offset-4">
                      Crear el primero
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
