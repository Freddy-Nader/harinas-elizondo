import { describe, expect, it } from "vitest";
import {
  applyStatusChange,
  changedFields,
  equipmentInputSchema,
  equipmentReadiness,
  generateEquipmentKey,
  isEditable,
  isEquipmentKey,
  limitSchema,
} from "./equipment";

const emptyForm = {
  shortDescription: "Alveógrafo línea 1",
  longDescription: "",
  brand: "",
  model: "",
  serialNumber: "",
  supplier: "",
  acquiredOn: "",
  warrantyUntil: "",
  location: "",
  responsible: "",
};

describe("generateEquipmentKey", () => {
  it("BR-EQP-01 makes an 8-character key from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const key = generateEquipmentKey();
      expect(key).toHaveLength(8);
      expect(isEquipmentKey(key)).toBe(true);
      expect(key).not.toMatch(/[01ILO]/);
    }
  });

  it("BR-EQP-01 is random, so two keys in a row differ", () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateEquipmentKey()));
    expect(keys.size).toBe(50);
  });

  it("maps bytes to symbols deterministically", () => {
    expect(generateEquipmentKey(() => new Uint8Array(8))).toBe("AAAAAAAA");
  });

  it("drops biased bytes instead of folding them", () => {
    const batches = [new Uint8Array(8).fill(255), new Uint8Array(8).fill(1)];
    expect(generateEquipmentKey(() => batches.shift() ?? new Uint8Array(8))).toBe("BBBBBBBB");
  });
});

describe("equipmentInputSchema", () => {
  it("RF-02 needs only the short description and turns blanks into null", () => {
    const parsed = equipmentInputSchema.parse(emptyForm);
    expect(parsed.shortDescription).toBe("Alveógrafo línea 1");
    expect(parsed.brand).toBeNull();
    expect(parsed.acquiredOn).toBeNull();
  });

  it("rejects a missing short description", () => {
    expect(equipmentInputSchema.safeParse({ ...emptyForm, shortDescription: "  " }).success).toBe(false);
  });

  it("rejects a warranty that ends before the purchase date", () => {
    const result = equipmentInputSchema.safeParse({
      ...emptyForm,
      acquiredOn: "2026-05-01",
      warrantyUntil: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid date", () => {
    expect(equipmentInputSchema.safeParse({ ...emptyForm, acquiredOn: "2026-13-40" }).success).toBe(false);
  });
});

describe("limitSchema", () => {
  it("accepts an inclusive range", () => {
    expect(limitSchema.safeParse({ lowerLimit: 5, upperLimit: 5 }).success).toBe(true);
  });

  it("rejects reversed limits", () => {
    expect(limitSchema.safeParse({ lowerLimit: 9, upperLimit: 2 }).success).toBe(false);
  });

  it("rejects a non-number", () => {
    expect(limitSchema.safeParse({ lowerLimit: Number.NaN, upperLimit: 2 }).success).toBe(false);
  });
});

describe("applyStatusChange", () => {
  it("D-16 inactivates active equipment with a reason", () => {
    expect(applyStatusChange("active", "deactivate", " Mantenimiento ")).toEqual({
      ok: true,
      status: "inactive",
      reason: "Mantenimiento",
    });
  });

  it("D-16 requires a reason to inactivate or retire", () => {
    expect(applyStatusChange("active", "deactivate", "").ok).toBe(false);
    expect(applyStatusChange("inactive", "retire", "  ").ok).toBe(false);
  });

  it("D-16 reactivates inactive equipment without a reason", () => {
    expect(applyStatusChange("inactive", "reactivate", "")).toEqual({
      ok: true,
      status: "active",
      reason: null,
    });
  });

  it("D-16 makes retired final", () => {
    for (const change of ["deactivate", "reactivate", "retire"] as const) {
      expect(applyStatusChange("retired", change, "x").ok).toBe(false);
    }
    expect(isEditable("retired")).toBe(false);
    expect(isEditable("inactive")).toBe(true);
  });

  it("rejects changes that do not apply to the current status", () => {
    expect(applyStatusChange("active", "reactivate", "").ok).toBe(false);
  });
});

describe("equipmentReadiness", () => {
  const alveographLimits = {
    ALV_P: { lower: 60, upper: 90 },
    ALV_L: { lower: 80, upper: 120 },
    ALV_W: { lower: 250, upper: 350 },
    ALV_PL: { lower: 0.5, upper: 1 },
    ALV_IE: { lower: 45, upper: 65 },
  };

  it("BR-EQP-03 is usable when active and every parameter has limits", () => {
    expect(equipmentReadiness("alveograph", "active", alveographLimits)).toEqual({ usable: true });
  });

  it("BR-EQP-03 blocks equipment missing limits and lists the codes", () => {
    const partial: Partial<typeof alveographLimits> = { ...alveographLimits };
    delete partial.ALV_IE;
    expect(equipmentReadiness("alveograph", "active", partial as Record<string, { lower: number; upper: number }>)).toEqual({
      usable: false,
      reason: "limits",
      missing: ["ALV_IE"],
    });
  });

  it("BR-EQP-03 only looks at the parameters of its own type", () => {
    expect(equipmentReadiness("farinograph", "active", alveographLimits)).toMatchObject({
      usable: false,
      missing: ["FAR_ABS", "FAR_DEV", "FAR_STA", "FAR_SOF", "FAR_ARR"],
    });
  });

  it("blocks inactive or retired equipment even with full limits", () => {
    expect(equipmentReadiness("alveograph", "inactive", alveographLimits)).toMatchObject({
      usable: false,
      reason: "status",
    });
  });
});

describe("changedFields", () => {
  it("keeps only what changed, treating blank and null alike", () => {
    expect(
      changedFields(
        { brand: "Chopin", model: null, location: "Lab 1" },
        { brand: "Chopin", model: null, location: "Lab 2" },
      ),
    ).toEqual({ location: ["Lab 1", "Lab 2"] });
  });
});
