"use client";

import { useId, useRef, useState } from "react";

/** UC-02: one independently editable field for each delivery destination. */
export function DeliveryAddresses({ initialAddresses }: { initialAddresses: string[] }) {
  const prefix = useId();
  const [addresses, setAddresses] = useState(() =>
    (initialAddresses.length ? initialAddresses : [""]).map((value, id) => ({ id, value })),
  );
  const nextId = useRef(addresses.length);

  return (
    <fieldset className="flex flex-col gap-3 sm:col-span-2">
      <legend className="mb-2 text-xs font-medium">Direcciones de entrega *</legend>
      {addresses.map((address, index) => (
        <div key={address.id} className="flex items-end gap-2">
          <label htmlFor={`${prefix}-${address.id}`} className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium">
            Dirección de entrega {index + 1}
            <input
              id={`${prefix}-${address.id}`}
              name="deliveryAddresses"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              maxLength={250}
              value={address.value}
              onChange={(event) => setAddresses((current) => current.map((entry) =>
                entry.id === address.id ? { ...entry, value: event.target.value } : entry,
              ))}
            />
          </label>
          {addresses.length > 1 && (
            <button type="button" className="h-9 rounded-md border px-3 text-sm hover:bg-muted"
              aria-label={`Quitar dirección de entrega ${index + 1}`}
              onClick={() => setAddresses((current) => current.filter((entry) => entry.id !== address.id))}>
              Quitar
            </button>
          )}
        </div>
      ))}
      <button type="button" className="h-9 self-start rounded-md border px-3 text-sm hover:bg-muted"
        onClick={() => { const id = nextId.current++; setAddresses((current) => [...current, { id, value: "" }]); }}>
        + Agregar dirección de entrega
      </button>
    </fieldset>
  );
}
