/** Display helpers. Dates from `date` columns are 'YYYY-MM-DD' strings, shown without a timezone shift. */
const dateFmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return dateFmt.format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDateTime(value: Date | null | undefined) {
  return value ? dateTimeFmt.format(value) : "—";
}

/** Numbers as typed in the lab, without trailing zeros. */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(value);
}
