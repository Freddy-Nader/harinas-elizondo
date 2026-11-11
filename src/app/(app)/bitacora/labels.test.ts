import { describe, expect, it } from "vitest";
import {
  ACTION_OPTIONS,
  actionLabel,
  ENTITY_OPTIONS,
  entityCodes,
  entityHref,
  entityIdLabel,
  entityLabel,
} from "./labels";

describe("audit labels", () => {
  it("RF-08 shows entities and actions in Spanish, certificates included", () => {
    expect(entityLabel("certificate")).toBe("Certificado");
    expect(entityLabel("inspection")).toBe("Inspección");
    expect(entityLabel("user")).toBe("Usuario");
    expect(actionLabel("issue")).toBe("Emisión");
    expect(actionLabel("resend")).toBe("Reenvío");
    expect(actionLabel("cancel")).toBe("Cancelación");
  });

  it("RF-08 labels the codes the Clientes module writes", () => {
    expect(entityLabel("clients")).toBe("Cliente");
    expect(actionLabel("update_limit")).toBe("Cambio de límite particular");
    expect(actionLabel("remove_limit")).toBe("Eliminación de límite particular");
  });

  it("RF-08 falls back to the raw code for unknown entities and actions", () => {
    expect(entityLabel("supplier")).toBe("supplier");
    expect(actionLabel("archive")).toBe("archive");
    expect(entityLabel("constructor")).toBe("constructor");
    expect(actionLabel("toString")).toBe("toString");
    expect(entityHref("supplier", "1")).toBeNull();
  });

  it("RF-08 the client filter also finds rows stored with the plural code", () => {
    expect(entityCodes("client")).toEqual(["client", "clients"]);
    expect(entityCodes("clients")).toEqual(["client", "clients"]);
    expect(entityCodes("lot")).toEqual(["lot"]);
  });

  it("RF-08 offers every known entity and action as a filter option", () => {
    expect(ENTITY_OPTIONS.map((o) => o.value)).toContain("certificate");
    expect(ACTION_OPTIONS.map((o) => o.value)).toEqual(expect.arrayContaining(["create", "issue", "update_limit"]));
  });
});

describe("entityHref", () => {
  it("RF-08 links to the detail page of entities that have one", () => {
    expect(entityHref("equipment", "ALV00001")).toBe("/equipos/ALV00001");
    expect(entityHref("lot", "L 01/A")).toBe("/lotes/L%2001%2FA");
    expect(entityHref("inspection", "12")).toBe("/inspecciones/12");
    expect(entityHref("certificate", "CER-2026-0001")).toBe("/certificados/CER-2026-0001");
    expect(entityHref("clients", "abc")).toBe("/clientes?editar=abc");
  });

  it("RF-08 has no link for entities without a page of their own", () => {
    expect(entityHref("international_limit", "ALV_W")).toBeNull();
    expect(entityHref("user", "u1")).toBeNull();
  });

  it("RF-08 names the parameter of an international limit", () => {
    expect(entityIdLabel("international_limit", "ALV_W")).toBe("Fuerza panadera (W)");
    expect(entityIdLabel("lot", "L-01")).toBe("L-01");
  });
});
