import Link from "next/link";
import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { createCertificate } from "../actions";
import { CertificateForm } from "../_components/certificate-form";
import { certificateFormOptions } from "../data";

export const metadata = { title: "Nuevo certificado" };

export default function NuevoCertificadoPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/certificados">
        <section className="flex max-w-3xl flex-col gap-6">
          <header className="flex flex-col gap-1">
            <Link href="/certificados" className="text-sm text-muted-foreground hover:text-foreground">
              ← Certificados
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Nuevo certificado</h1>
            <p className="text-pretty text-muted-foreground">
              Se guarda como borrador con su folio. Antes de emitirlo verás los resultados y las desviaciones.
            </p>
          </header>
          <NewCertificateForm />
        </section>
      </ModuleGate>
    </Suspense>
  );
}

async function NewCertificateForm() {
  const { clients, lots } = await certificateFormOptions();
  if (clients.length === 0 || lots.length === 0) {
    return (
      <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {clients.length === 0 ? (
          <>
            No hay clientes activos.{" "}
            <Link href="/clientes" className="text-foreground underline underline-offset-4">
              Registra uno en Clientes
            </Link>
            .
          </>
        ) : (
          <>
            Ningún lote tiene una inspección completa todavía.{" "}
            <Link href="/lotes" className="text-foreground underline underline-offset-4">
              Captura una en Lotes
            </Link>
            .
          </>
        )}
      </p>
    );
  }
  return <CertificateForm action={createCertificate} clients={clients} lots={lots} submitLabel="Crear borrador" />;
}
