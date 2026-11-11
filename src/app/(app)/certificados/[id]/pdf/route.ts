import { loadCertificate } from "@/lib/certificate-data";
import { isCertificateId } from "@/lib/domain/certificate";
import { renderCertificatePdf } from "@/lib/services/certificate-pdf";
import { ForbiddenError, requireRole } from "@/lib/session";

/**
 * UC-05 / UC-07. The certificate PDF. Issued certificates print their snapshot (D-10);
 * drafts print a preview marked BORRADOR. Both roles can download: query users need the
 * archive (RF-07). `?descargar=1` saves the file instead of opening it.
 */
export async function GET(request: Request, { params }: RouteContext<"/certificados/[id]/pdf">) {
  try {
    await requireRole("transaction", "query");
  } catch (error) {
    if (error instanceof ForbiddenError) return new Response(error.message, { status: 403 });
    throw error;
  }

  const { id } = await params;
  if (!isCertificateId(id)) return new Response("Certificado no encontrado.", { status: 404 });
  const loaded = await loadCertificate(id);
  if (!loaded) return new Response("Certificado no encontrado.", { status: 404 });

  const pdf = await renderCertificatePdf(loaded.pdf);
  const download = new URL(request.url).searchParams.has("descargar");
  const filename = loaded.cert.status === "draft" ? `${id}-borrador.pdf` : `${id}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
