"use client";

import { useState } from "react";
import { controlClass, fieldProps, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/action-state";

type Destination = { id: string; address: string };
type ClientOption = {
  id: string;
  sapKey: string;
  businessName: string;
  requiresCertificate: boolean;
  destinations: Destination[];
};
type LotOption = { id: string; product: string; inspection: string; deviations: number };

type Values = {
  clientId: string;
  lotId: string;
  purchaseOrder: string;
  quantityRequested: number | null;
  quantityDelivered: number | null;
  invoiceNumber: string | null;
  shippedOn: string | null;
  deliveryAddress: string | null;
  carrier: string | null;
  requiresSignature: boolean;
};

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  clients: ClientOption[];
  lots: LotOption[];
  values?: Values;
  submitLabel: string;
};

const num = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

/**
 * UC-05. Order data (client, lot, purchase order) plus the shipping data that BR-CER-05
 * requires before issuing: invoice, quantity, date, destination (D-22/D-24) and carrier.
 * Shipping data can be filled later, while it is a draft.
 */
export function CertificateForm({ action, clients, lots, values, submitLabel }: Props) {
  const { pending, onSubmit, errors } = useFormAction(action);
  const [clientId, setClientId] = useState(values?.clientId ?? "");
  const destinations = clients.find((c) => c.id === clientId)?.destinations ?? [];
  const savedDestination =
    values && clientId === values.clientId ? destinations.find((d) => d.address === values.deliveryAddress)?.id : undefined;
  const defaultDestination = savedDestination ?? (destinations.length === 1 ? destinations[0].id : "");

  // The saved client or lot may no longer be offered (inactive, or latest inspection incomplete)
  const clientMissing = values && !clients.some((c) => c.id === values.clientId);
  const lotMissing = values && !lots.some((l) => l.id === values.lotId);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Pedido</legend>
        <FormField id="clientId" label="Cliente" required error={errors.clientId}>
          <select
            {...fieldProps("clientId", errors.clientId)}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={`${controlClass} h-8`}
            required
          >
            <option value="" disabled>
              Elige un cliente
            </option>
            {clientMissing && <option value={values.clientId}>Cliente actual (no disponible)</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName} · {c.sapKey}
                {c.requiresCertificate ? "" : " (no pide certificado)"}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          id="lotId"
          label="Lote"
          required
          error={errors.lotId}
          hint="Solo lotes cuya última inspección está completa."
        >
          <select {...fieldProps("lotId", errors.lotId)} defaultValue={values?.lotId ?? ""} className={`${controlClass} h-8`} required>
            <option value="" disabled>
              Elige un lote
            </option>
            {lotMissing && <option value={values.lotId}>{values.lotId} (última inspección incompleta)</option>}
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} · {l.product} · inspección {l.inspection}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="purchaseOrder" label="Orden de compra" required error={errors.purchaseOrder}>
          <Input {...fieldProps("purchaseOrder", errors.purchaseOrder)} maxLength={20} required defaultValue={values?.purchaseOrder ?? ""} />
        </FormField>

        <FormField id="quantityRequested" label="Cantidad solicitada (kg)" error={errors.quantityRequested}>
          <Input
            {...fieldProps("quantityRequested", errors.quantityRequested)}
            inputMode="decimal"
            defaultValue={num(values?.quantityRequested)}
          />
        </FormField>
      </fieldset>

      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">Embarque</legend>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Obligatorios para emitir. Puedes capturarlos después, mientras el certificado sea borrador.
        </p>

        <FormField
          id="deliveryAddressId"
          label="Dirección de entrega"
          error={errors.deliveryAddressId}
          hint={clientId && destinations.length === 0 ? "Este cliente no tiene direcciones de entrega. Agrégalas en Clientes." : undefined}
          className="sm:col-span-2"
        >
          <select
            {...fieldProps("deliveryAddressId", errors.deliveryAddressId)}
            // Remount when the client changes so the default follows the new client
            key={clientId}
            defaultValue={defaultDestination}
            className={`${controlClass} h-8`}
            disabled={!clientId || destinations.length === 0}
          >
            <option value="">{clientId ? "Elige un destino" : "Primero elige un cliente"}</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.address}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="carrier" label="Transportista" error={errors.carrier}>
          <Input {...fieldProps("carrier", errors.carrier)} maxLength={100} defaultValue={values?.carrier ?? ""} />
        </FormField>
        <FormField id="invoiceNumber" label="Factura" error={errors.invoiceNumber}>
          <Input {...fieldProps("invoiceNumber", errors.invoiceNumber)} maxLength={20} defaultValue={values?.invoiceNumber ?? ""} />
        </FormField>
        <FormField id="quantityDelivered" label="Cantidad entregada (kg)" error={errors.quantityDelivered}>
          <Input
            {...fieldProps("quantityDelivered", errors.quantityDelivered)}
            inputMode="decimal"
            defaultValue={num(values?.quantityDelivered)}
          />
        </FormField>
        <FormField id="shippedOn" label="Fecha de envío" error={errors.shippedOn}>
          <Input {...fieldProps("shippedOn", errors.shippedOn)} type="date" defaultValue={values?.shippedOn ?? ""} />
        </FormField>

        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="requiresSignature"
            defaultChecked={values?.requiresSignature ?? false}
            className="mt-0.5 size-4 accent-foreground"
          />
          <span>
            Incluir firma
            <span className="block text-xs text-muted-foreground">Imprime tu nombre, número de empleado y la hora de emisión.</span>
          </span>
        </label>
      </fieldset>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
