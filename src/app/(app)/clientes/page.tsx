import { DeliveryAddresses } from "./_components/delivery-addresses";
import { Suspense } from "react";
import Link from "next/link";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { listClients, listDeliveryAddresses, listClientLimits, listInternationalLimits, listParameters } from "./data";
import { changeClientStatus, removeClientLimit, saveClient, saveClientLimit } from "./actions";

type Props = { searchParams: Promise<{ editar?: string; error?: string }> };

const fieldClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const labelClass = "flex flex-col gap-1 text-xs font-medium";
const actionClass = "inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90";

export default function ClientsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/clientes">
        <ClientsSection searchParams={searchParams} />
      </ModuleGate>
    </Suspense>
  );
}

function ClientsSection({ searchParams }: Props) {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Alta, consulta, modificación e inactivación · RF-03 / UC-02
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando clientes…</p>}>
        <ClientsContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ClientsContent({ searchParams }: Props) {
  // RF-01: ModuleGate in the page already sent other roles to the standard restricted screen.
  const query = await searchParams;
  const [allClients, allParameters, international] = await Promise.all([
    listClients(), listParameters(), listInternationalLimits(),
  ]);
  const selected = allClients.find((client) => client.id === query.editar);
  const addresses = selected ? await listDeliveryAddresses(selected.id) : [];
  const limits = selected ? await listClientLimits(selected.id) : [];
  const internationalByCode = new Map(international.map((entry) => [entry.parameterCode, entry]));
  const limitsByCode = new Map(limits.map((entry) => [entry.parameterCode, entry]));

  return (
    <>
      {query.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{query.error}</p>}
      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Directorio de clientes ({allClients.length})</h2>
          <Link href="/clientes" className={actionClass}>Nuevo cliente</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Clave SAP</th><th className="p-3">Razón social</th>
                <th className="p-3">RFC</th><th className="p-3">Estado</th><th className="p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {allClients.map((client) => (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">{client.sapKey}</td>
                  <td className="p-3">{client.businessName}</td>
                  <td className="p-3">{client.rfc || "—"}</td>
                  <td className="p-3">{client.status === "active" ? "Activo" : "Inactivo"}</td>
                  <td className="p-3"><Link href={"/clientes?editar=" + client.id} className="underline underline-offset-4">Consultar / editar</Link></td>
                </tr>
              ))}
              {!allClients.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Todavía no hay clientes registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">{selected ? "Modificar cliente" : "Registrar cliente"}</h2>
        <form action={saveClient} className="grid gap-4 sm:grid-cols-2">
          {selected && <input type="hidden" name="id" value={selected.id} />}
          <label className={labelClass}>Clave SAP *
            <input className={fieldClass} name="sapKey" maxLength={10} required defaultValue={selected?.sapKey ?? ""} />
          </label>
          <label className={labelClass}>Razón social *
            <input className={fieldClass} name="businessName" maxLength={150} required defaultValue={selected?.businessName ?? ""} />
          </label>
          <label className={labelClass}>RFC *
            <input className={fieldClass} name="rfc" required maxLength={13} defaultValue={selected?.rfc ?? ""} />
          </label>
          <label className={labelClass}>Correo de contacto *
            <input className={fieldClass} type="email" required name="contactEmail" maxLength={100} defaultValue={selected?.contactEmail ?? ""} />
          </label>
          <label className={labelClass}>Nombre de contacto *
            <input className={fieldClass} name="contactName" required maxLength={100} defaultValue={selected?.contactName ?? ""} />
          </label>
          <label className={labelClass}>Dirección fiscal *
            <input className={fieldClass} name="fiscalAddress" required maxLength={250} defaultValue={selected?.fiscalAddress ?? ""} />
            {selected && !selected.fiscalAddress && <span className="text-destructive">Pendiente de completar para este cliente.</span>}
          </label>
          <DeliveryAddresses key={selected?.id ?? "new-client"}
            initialAddresses={addresses.length ? addresses.map((entry) => entry.address) : selected?.deliveryAddress ? [selected.deliveryAddress] : []} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input name="requiresCertificate" type="checkbox" defaultChecked={selected?.requiresCertificate ?? true} />
            Requiere certificado de calidad
          </label>
          <div className="sm:col-span-2">
            <button className={actionClass} type="submit">{selected ? "Guardar cambios" : "Registrar cliente"}</button>
          </div>
        </form>
      </div>
      {selected && (
        <>
          <div className="rounded-xl border p-5">
            <h2 className="mb-2 font-semibold">Estado del cliente</h2>
            <p className="mb-3 text-sm text-muted-foreground">No se eliminan clientes del historial (BR-CLI-03).</p>
            <form action={changeClientStatus} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={selected.id} />
              <input type="hidden" name="status" value={selected.status === "active" ? "inactive" : "active"} />
              {selected.status === "active" && (
                <label className={labelClass}>Motivo de inactivación *
                  <input className={fieldClass} name="reason" required maxLength={200} />
                </label>
              )}
              <button className={actionClass} type="submit">
                {selected.status === "active" ? "Inactivar cliente" : "Reactivar cliente"}
              </button>
            </form>
          </div>
          <div className="rounded-xl border p-5">
            <h2 className="font-semibold">Valores de referencia particulares</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Los límites particulares deben ser iguales o más exigentes que los internacionales. Los parámetros sin valores propios usan la referencia internacional.
            </p>
            <div className="space-y-3">
              {allParameters.map((parameter) => {
                const own = limitsByCode.get(parameter.code);
                const fallback = internationalByCode.get(parameter.code);
                return (
                  <form key={parameter.code} action={saveClientLimit} className="grid items-end gap-2 border-b pb-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
                    <input type="hidden" name="clientId" value={selected.id} />
                    <input type="hidden" name="parameterCode" value={parameter.code} />
                    <div className="text-sm">
                      <strong>{parameter.label}</strong>
                      <p className="text-xs text-muted-foreground">
                        {own ? "Límite particular" : "Límite internacional"} · {fallback ? fallback.lowerLimit + " a " + fallback.upperLimit : "Sin referencia internacional"}
                      </p>
                    </div>
                    <label className={labelClass}>Mínimo
                      <input className={fieldClass} type="number" step="any" required name="lowerLimit" defaultValue={own?.lowerLimit ?? fallback?.lowerLimit ?? ""} />
                    </label>
                    <label className={labelClass}>Máximo
                      <input className={fieldClass} type="number" step="any" required name="upperLimit" defaultValue={own?.upperLimit ?? fallback?.upperLimit ?? ""} />
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" className={actionClass}>Guardar</button>
                      {own && <button formAction={removeClientLimit} type="submit" formNoValidate className="rounded-md border px-2 text-xs">Restablecer</button>}
                    </div>
                  </form>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
