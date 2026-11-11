import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import {
  CERTIFICATE_STATUS_LABEL,
  countDeviations,
  pdfSafeText,
  type CertificateLine,
  type CertificateStatus,
} from "@/lib/domain/certificate";
import { EQUIPMENT_TYPE_LABEL, type EquipmentType } from "@/lib/domain/parameters";

/**
 * RF-05 · UC-05 / UC-07 · D-13. The certificate PDF the client and the warehouse receive.
 * Built from the stored snapshot (D-10), so re-downloading an old certificate always prints
 * the same numbers. A draft prints a BORRADOR mark and is never sent.
 */

export type CertificatePdfData = {
  id: string;
  status: CertificateStatus;
  client: {
    sapKey: string;
    businessName: string;
    rfc: string | null;
    fiscalAddress: string | null;
    contactName: string | null;
  };
  /** D-24. The destination chosen for this delivery */
  deliveryAddress: string | null;
  carrier: string | null;
  /** D-26 */
  signatureHash: string | null;
  /** D-25 */
  cancellation: { at: Date; reason: string; by: string | null } | null;
  lot: { id: string; product: string; producedOn: string; expiresOn: string };
  inspection: { sequence: string; inspectedAt: Date } | null;
  purchaseOrder: string;
  invoiceNumber: string | null;
  quantityRequested: number | null;
  quantityDelivered: number | null;
  shippedOn: string | null;
  issuedAt: Date | null;
  issuer: { name: string; employeeId: string | null } | null;
  requiresSignature: boolean;
  lines: CertificateLine[];
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  muted: { color: "#666" },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  id: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  draft: { fontSize: 10, color: "#b91c1c", fontFamily: "Helvetica-Bold", textAlign: "right" },
  grid: { flexDirection: "row", flexWrap: "wrap", borderTop: "1pt solid #ddd", borderLeft: "1pt solid #ddd", marginBottom: 14 },
  cell: { width: "33.33%", padding: 5, borderRight: "1pt solid #ddd", borderBottom: "1pt solid #ddd" },
  label: { fontSize: 7, color: "#666", marginBottom: 1, textTransform: "uppercase" },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 4 },
  table: { borderTop: "1pt solid #999", marginBottom: 8 },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #ddd", paddingVertical: 3 },
  headRow: { flexDirection: "row", borderBottom: "1pt solid #999", paddingVertical: 3, backgroundColor: "#f3f3f3" },
  cParam: { width: "34%", paddingHorizontal: 4 },
  cUnit: { width: "12%", paddingHorizontal: 4 },
  cNum: { width: "13.5%", paddingHorizontal: 4, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  out: { color: "#b91c1c", fontFamily: "Helvetica-Bold" },
  note: { fontSize: 8, color: "#444", marginTop: 4 },
  signature: { marginTop: 24, borderTop: "1pt solid #111", width: 220, paddingTop: 4 },
  hashBox: { marginTop: 14 },
  hash: { fontFamily: "Courier", fontSize: 7.5 },
  cancelBox: { border: "1pt solid #b91c1c", color: "#b91c1c", padding: 6, marginBottom: 12 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#888", textAlign: "center" },
});

const dateFmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});
const numberFmt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 });

function day(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return dateFmt.format(new Date(Date.UTC(y, m - 1, d)));
}
const num = (v: number | null) => (v === null ? "—" : numberFmt.format(v));
const signed = (v: number) => (v > 0 ? `+${numberFmt.format(v)}` : numberFmt.format(v));
const t = pdfSafeText;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.cell}>
      <Text style={s.label}>{label}</Text>
      <Text>{t(value)}</Text>
    </View>
  );
}

function LinesTable({ type, lines }: { type: EquipmentType; lines: CertificateLine[] }) {
  const own = lines.filter((l) => l.equipmentType === type);
  if (own.length === 0) return null;
  return (
    <View wrap={false}>
      <Text style={s.sectionTitle}>{EQUIPMENT_TYPE_LABEL[type]}</Text>
      <View style={s.table}>
        <View style={s.headRow}>
          <Text style={[s.cParam, s.bold]}>Parámetro</Text>
          <Text style={[s.cUnit, s.bold]}>Unidad</Text>
          <Text style={[s.cNum, s.bold]}>Resultado</Text>
          <Text style={[s.cNum, s.bold]}>Mínimo</Text>
          <Text style={[s.cNum, s.bold]}>Máximo</Text>
          <Text style={[s.cNum, s.bold]}>Desviación</Text>
        </View>
        {own.map((l) => (
          <View key={l.parameterCode} style={s.row}>
            <Text style={s.cParam}>{t(l.label)}</Text>
            <Text style={s.cUnit}>{t(l.unit) || "—"}</Text>
            <Text style={[s.cNum, l.status !== "within" ? s.out : {}]}>{num(l.value)}</Text>
            <Text style={s.cNum}>{num(l.lowerLimit)}</Text>
            <Text style={s.cNum}>{num(l.upperLimit)}</Text>
            <Text style={[s.cNum, l.status !== "within" ? s.out : {}]}>
              {l.deviation === 0 ? "0" : signed(l.deviation)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function CertificateDocument({ data }: { data: CertificatePdfData }) {
  const deviations = countDeviations(data.lines);
  return (
    <Document title={`Certificado de calidad ${data.id}`} author="Harinas Elizondo · Control de laboratorio" language="es-MX">
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Harinas Elizondo</Text>
            <Text style={s.muted}>Laboratorio de Control de Calidad</Text>
          </View>
          <View>
            <Text style={s.title}>Certificado de calidad</Text>
            <Text style={s.id}>{data.id}</Text>
            {data.status === "draft" && <Text style={s.draft}>BORRADOR · sin validez</Text>}
            {data.status === "cancelled" && <Text style={s.draft}>CANCELADO · sin validez</Text>}
          </View>
        </View>

        {data.cancellation && (
          <View style={s.cancelBox} wrap={false}>
            <Text style={s.bold}>Certificado cancelado el {dateTimeFmt.format(data.cancellation.at)}</Text>
            <Text>
              {t(`Motivo: ${data.cancellation.reason}`)}
              {data.cancellation.by ? t(` · Canceló: ${data.cancellation.by}`) : ""}
            </Text>
          </View>
        )}

        <View style={s.grid}>
          <Field label="Cliente" value={`${data.client.businessName} (${data.client.sapKey})`} />
          <Field label="RFC" value={data.client.rfc ?? "—"} />
          <Field label="Atención" value={data.client.contactName ?? "—"} />
          <Field label="Domicilio fiscal" value={data.client.fiscalAddress ?? "—"} />
          <Field label="Domicilio de entrega" value={data.deliveryAddress ?? "—"} />
          <Field label="Transportista" value={data.carrier ?? "—"} />
          <Field label="Orden de compra" value={data.purchaseOrder} />
          <Field label="Factura" value={data.invoiceNumber ?? "—"} />
          <Field label="Lote" value={data.lot.id} />
          <Field label="Producto" value={data.lot.product} />
          <Field
            label="Inspección"
            value={data.inspection ? `${data.inspection.sequence} · ${dateTimeFmt.format(data.inspection.inspectedAt)}` : "—"}
          />
          <Field label="Fecha de producción" value={day(data.lot.producedOn)} />
          <Field label="Fecha de caducidad" value={day(data.lot.expiresOn)} />
          <Field label="Fecha de envío" value={day(data.shippedOn)} />
          <Field label="Cantidad solicitada (kg)" value={num(data.quantityRequested)} />
          <Field label="Cantidad entregada (kg)" value={num(data.quantityDelivered)} />
          <Field label="Emitido" value={data.issuedAt ? dateTimeFmt.format(data.issuedAt) : "—"} />
        </View>

        <LinesTable type="alveograph" lines={data.lines} />
        <LinesTable type="farinograph" lines={data.lines} />

        <Text style={s.note}>
          {deviations === 0
            ? "Todos los parámetros están dentro de los valores de referencia."
            : `${deviations} parámetro(s) fuera de los valores de referencia, indicados en rojo. La desviación es la distancia al límite más cercano.`}
        </Text>
        <Text style={s.note}>
          Valores de referencia: los particulares del cliente cuando existen y los internacionales para el resto.
        </Text>

        {data.requiresSignature && data.issuer && data.issuedAt && (
          <View style={s.signature} wrap={false}>
            <Text style={s.bold}>{t(data.issuer.name)}</Text>
            <Text style={s.muted}>
              {data.issuer.employeeId ? `No. de empleado ${data.issuer.employeeId} · ` : ""}
              Firmado el {dateTimeFmt.format(data.issuedAt)}
            </Text>
          </View>
        )}

        {data.signatureHash && (
          <View style={s.hashBox} wrap={false}>
            <Text style={s.label}>Huella digital del certificado (SHA-256)</Text>
            <Text style={s.hash}>{data.signatureHash}</Text>
          </View>
        )}

        <Text style={s.footer} fixed>
          {`${data.id} · ${CERTIFICATE_STATUS_LABEL[data.status]} · Proyecto escolar, documento sin validez oficial`}
        </Text>
      </Page>
    </Document>
  );
}

export function renderCertificatePdf(data: CertificatePdfData): Promise<Buffer> {
  return renderToBuffer(<CertificateDocument data={data} />);
}
