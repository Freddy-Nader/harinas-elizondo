import { describe, expect, it } from "vitest";
import { clientInputSchema, isWithinInternational, limitInputSchema } from "./client-validation";

const validClient = {
  sapKey: "SAP001", businessName: "Panificadora Ejemplo", rfc: "ABC260101AB1",
  fiscalAddress: "Domicilio fiscal de prueba", deliveryAddresses: ["Entrega de prueba"], contactName: "Contacto de prueba", contactEmail: "contacto@example.test", requiresCertificate: true,
};

describe("RF-03 · UC-02 · BR-CLI-01/02", () => {
  it("accepts a valid client", () => {
    expect(clientInputSchema.safeParse(validClient).success).toBe(true);
  });
  it("rejects a missing or oversized SAP key", () => {
    expect(clientInputSchema.safeParse({ ...validClient, sapKey: "" }).success).toBe(false);
    expect(clientInputSchema.safeParse({ ...validClient, sapKey: "ABCDEFGHIJK" }).success).toBe(false);
  });
  it("rejects an invalid RFC", () => {
    expect(clientInputSchema.safeParse({ ...validClient, rfc: "INVALID" }).success).toBe(false);
  });
  it("requires RFC and contact email according to the client data dictionary", () => {
    expect(clientInputSchema.safeParse({ ...validClient, rfc: "", contactEmail: "" }).success).toBe(false);
  });
});

describe("RF-03 · BR-REF-01", () => {
  it("accepts inclusive client limits", () => {
    expect(limitInputSchema.safeParse({ parameterCode: "ALV_P", lowerLimit: 3, upperLimit: 3 }).success).toBe(true);
  });
  it("rejects reversed limits", () => {
    expect(limitInputSchema.safeParse({ parameterCode: "ALV_P", lowerLimit: 7, upperLimit: 2 }).success).toBe(false);
  });
});

describe("RF-03 professor review: fiscal and delivery addresses", () => {
  it("requires a fiscal address independently of delivery destinations", () => {
    expect(clientInputSchema.safeParse({ ...validClient, fiscalAddress: "  " }).success).toBe(false);
  });
  it("supports multiple delivery destinations", () => {
    expect(clientInputSchema.safeParse({ ...validClient, deliveryAddresses: ["Sucursal A", "Sucursal B"] }).success).toBe(true);
  });
  it("rejects no delivery destinations and oversized addresses", () => {
    expect(clientInputSchema.safeParse({ ...validClient, deliveryAddresses: [] }).success).toBe(false);
    expect(clientInputSchema.safeParse({ ...validClient, deliveryAddresses: ["A".repeat(251)] }).success).toBe(false);
  });
});

describe("BR-REF-01 stricter client limits", () => {
  const reference = { lowerLimit: 60, upperLimit: 90 };
  it("accepts narrower or equal bounds", () => {
    expect(isWithinInternational({ lowerLimit: 65, upperLimit: 85 }, reference)).toBe(true);
    expect(isWithinInternational(reference, reference)).toBe(true);
  });
  it("rejects either bound widening the accepted range", () => {
    expect(isWithinInternational({ lowerLimit: 59, upperLimit: 85 }, reference)).toBe(false);
    expect(isWithinInternational({ lowerLimit: 65, upperLimit: 91 }, reference)).toBe(false);
  });
});
