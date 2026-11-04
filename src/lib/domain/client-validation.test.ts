import { describe, expect, it } from "vitest";
import { clientInputSchema, limitInputSchema } from "./client-validation";

const validClient = {
  sapKey: "SAP001", businessName: "Panificadora Ejemplo", rfc: "ABC260101AB1",
  deliveryAddress: "", contactName: "", contactEmail: "", requiresCertificate: true,
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
  it("allows clients without an RFC or email", () => {
    expect(clientInputSchema.safeParse({ ...validClient, rfc: "", contactEmail: "" }).success).toBe(true);
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
