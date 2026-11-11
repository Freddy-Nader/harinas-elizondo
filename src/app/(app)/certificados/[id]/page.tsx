import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { countDeviations, deliveryRecipients, isCertificateId } from "@/lib/domain/certificate";
import { PARAMETERS } from "@/lib/domain/parameters";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { isEmailSimulated, warehouseEmail } from "@/lib/services/mailer";
import { cancelCertificate, issueCertificate, sendCertificate, updateCertificate } from "../actions";
import { CancelPanel } from "../_components/cancel-panel";
import { CertificateForm } from "../_components/certificate-form";
import { IssuePanel, SendButton } from "../_components/issue-panel";
import { LinesTable } from "../_components/lines-table";
import { CertificateStatusBadge } from "../_components/status-badge";
import { certificateFormOptions, getCertificate, listDeliveries } from "../data";

export const metadata = { title: "Certificado" };

export default function CertificadoPage({ params }: PageProps<"/certificados/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/certificados">
        <CertificateDetail params={params} />
      </ModuleGate>
    </Suspense>
  );
}

async function CertificateDetail({ params }: Pick<PageProps<"/certificados/[id]">, "params">) {
  const { id } = await params;
  if (!isCertificateId(id)) notFound();
  const loaded = await getCertificate(id);
  if (!loaded) notFound();

  const { cert, client, lot, inspection, preview, blockers, integrity, pdf } = loaded;
  const isDraft = cert.status === "draft";
  const isCancelled = cert.status === "cancelled";
  const recipients = deliveryRecipients(client.contactEmail, warehouseEmail());
  const deviations = countDeviations(pdf.lines);

  return (
    <section className="flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/certificados" className="text-sm text-muted-foreground hover:text-foreground">
          ← Certificados
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{cert.id}</h1>
          <CertificateStatusBadge status={cert.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {client.businessName} · {client.sapKey} · Lote <span className="font-mono text-foreground">{lot.id}</span> ·
          OC {cert.purchaseOrder}
          {cert.issuedAt && ` · Emitido ${formatDateTime(cert.issuedAt)}`}
          {pdf.issuer && ` por ${pdf.issuer.name}${pdf.issuer.employeeId ? ` (${pdf.issuer.employeeId})` : ""}`}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a href={`/certificados/${cert.id}/pdf`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            {isDraft ? "Vista previa del PDF" : "Ver PDF"}
          </a>
          {!isDraft && (
            <a href={`/certificados/${cert.id}/pdf?descargar=1`} className={buttonVariants({ variant: "ghost" })}>
              Descargar
            </a>
          )}
        </div>
      </header>

      {pdf.cancellation && (
        <p role="status" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Cancelado el {formatDateTime(pdf.cancellation.at)}
          {pdf.cancellation.by ? ` por ${pdf.cancellation.by}` : ""}. Motivo: {pdf.cancellation.reason}
        </p>
      )}

      {integrity === "mismatch" && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          La huella digital no coincide con los datos guardados: el certificado fue modificado después de emitirse.
        </p>
      )}

      <Section
        title="Resultados"
        description={
          inspection
            ? `Inspección ${inspection.sequence} del ${formatDateTime(inspection.inspectedAt)}${isDraft ? ", la última del lote. Si se registra una nueva antes de emitir, el certificado la tomará (y deberá estar completa)." : "."}`
            : undefined
        }
      >
        <Results isDraft={isDraft} lines={pdf.lines} preview={preview} deviations={deviations} />
      </Section>

      {isDraft ? (
        <>
          <Section title="Emitir" description="Revisa los resultados y completa los datos de embarque.">
            <IssuePanel action={issueCertificate.bind(null, cert.id)} blockers={blockers} recipients={recipients} />
          </Section>
          <Section title="Datos del certificado">
            <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
              <EditForm
                id={cert.id}
                values={{
                  clientId: cert.clientId,
                  lotId: cert.lotId,
                  purchaseOrder: cert.purchaseOrder,
                  quantityRequested: cert.quantityRequested,
                  quantityDelivered: cert.quantityDelivered,
                  invoiceNumber: cert.invoiceNumber,
                  shippedOn: cert.shippedOn,
                  deliveryAddress: cert.deliveryAddress,
                  carrier: cert.carrier,
                  requiresSignature: cert.requiresSignature,
                }}
              />
            </Suspense>
          </Section>
        </>
      ) : (
        <>
          <Section title="Datos del certificado">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Item label="Cliente" value={`${client.businessName} (${client.sapKey})`} />
              <Item label="Atención" value={client.contactName ?? "—"} />
              <Item label="Factura" value={cert.invoiceNumber ?? "—"} />
              <Item label="Producto" value={lot.product} />
              <Item label="Producción" value={formatDate(lot.producedOn)} />
              <Item label="Caducidad" value={formatDate(lot.expiresOn)} />
              <Item label="Cantidad solicitada" value={cert.quantityRequested === null ? "—" : `${formatNumber(cert.quantityRequested)} kg`} />
              <Item label="Cantidad entregada" value={cert.quantityDelivered === null ? "—" : `${formatNumber(cert.quantityDelivered)} kg`} />
              <Item label="Fecha de envío" value={formatDate(cert.shippedOn)} />
              <Item label="Dirección de entrega" value={cert.deliveryAddress ?? "—"} />
              <Item label="Transportista" value={cert.carrier ?? "—"} />
              <Item label="Firma" value={cert.requiresSignature ? "Sí" : "No"} />
            </dl>
            {cert.signatureHash && (
              <div className="flex flex-col gap-1 text-sm">
                <p className="text-xs text-muted-foreground">
                  Huella digital (SHA-256){" "}
                  {integrity === "ok" && <span className="text-foreground">· verificada contra los datos guardados</span>}
                </p>
                <p className="break-all font-mono text-xs">{cert.signatureHash}</p>
              </div>
            )}
          </Section>
          <Section
            title="Envíos"
            description={
              isCancelled
                ? "El certificado está cancelado y ya no se puede enviar."
                : `Destinatarios: ${recipients.join(", ")}.${client.contactEmail ? "" : " El cliente no tiene correo de contacto, solo se envía a Almacén."}`
            }
          >
            {!isCancelled && isEmailSimulated() && (
              <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Modo simulado: el correo se registra como enviado, pero todavía no sale del servidor.
              </p>
            )}
            {!isCancelled && (
              <SendButton action={sendCertificate.bind(null, cert.id)} label={cert.status === "sent" ? "Reenviar" : "Enviar ahora"} />
            )}
            <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando envíos…</p>}>
              <Deliveries id={cert.id} />
            </Suspense>
          </Section>
          {!isCancelled && (
            <Section
              title="Cancelación"
              description="Si el certificado tiene un error, cancélalo con el motivo y emite uno nuevo. El cancelado se conserva en el historial."
            >
              <CancelPanel action={cancelCertificate.bind(null, cert.id)} />
            </Section>
          )}
        </>
      )}
    </section>
  );
}

function Results({
  isDraft,
  lines,
  preview,
  deviations,
}: {
  isDraft: boolean;
  lines: Parameters<typeof LinesTable>[0]["lines"];
  preview: NonNullable<Awaited<ReturnType<typeof getCertificate>>>["preview"];
  deviations: number;
}) {
  if (isDraft && preview && !preview.ok) {
    const names = (codes: string[]) => codes.map((c) => PARAMETERS.find((p) => p.code === c)?.label ?? c).join(", ");
    return (
      <p role="status" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {preview.missingResults.length > 0 && `Faltan resultados de ${names(preview.missingResults)}. `}
        {preview.missingLimits.length > 0 && `Faltan valores de referencia de ${names(preview.missingLimits)}.`}
      </p>
    );
  }
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">El lote no tiene una inspección completa.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        {deviations === 0 ? (
          <span className="text-muted-foreground">Todos los parámetros dentro de los valores de referencia.</span>
        ) : (
          <span className="text-destructive">
            {deviations === 1 ? "1 parámetro fuera" : `${deviations} parámetros fuera`} de los valores de referencia.
            No bloquea la emisión; aparece en la columna de desviación.
          </span>
        )}
      </p>
      <LinesTable lines={lines} showSource={isDraft} />
    </div>
  );
}

async function EditForm({ id, values }: { id: string; values: Parameters<typeof CertificateForm>[0]["values"] }) {
  const { clients, lots } = await certificateFormOptions();
  return (
    <CertificateForm
      action={updateCertificate.bind(null, id)}
      clients={clients}
      lots={lots}
      values={values}
      submitLabel="Guardar cambios"
    />
  );
}

async function Deliveries({ id }: { id: string }) {
  const rows = await listDeliveries(id);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Todavía no se ha enviado.</p>;
  return (
    <ol className="flex flex-col">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-col gap-0.5 border-l py-2 pl-4">
          <p className="text-sm">
            <span className={row.succeeded ? "font-medium" : "font-medium text-destructive"}>
              {row.succeeded ? "Enviado" : "Falló"}
            </span>
            <span className="text-muted-foreground"> · {row.recipients.join(", ")}</span>
            {row.error && <span className="text-destructive"> · {row.error}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(row.sentAt)} · {row.sentByName ?? "Usuario"}
            {row.sentByEmployeeId ? ` (${row.sentByEmployeeId})` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Separator />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="max-w-3xl text-pretty text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
