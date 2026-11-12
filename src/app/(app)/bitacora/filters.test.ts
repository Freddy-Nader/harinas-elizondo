import { describe, expect, it } from "vitest";
import { auditHref, dateBounds, hasFilters, likePattern, pageCount, PAGE_SIZE, parseAuditFilters } from "./filters";

describe("parseAuditFilters", () => {
  it("RF-08 reads every filter from the Spanish query keys", () => {
    expect(
      parseAuditFilters({
        entidad: "certificate",
        accion: "issue",
        empleado: "  E0001 ",
        desde: "2026-11-01",
        hasta: "2026-11-10",
        id: "L-PRUEBA-001",
        pagina: "3",
      }),
    ).toEqual({
      entity: "certificate",
      action: "issue",
      employee: "E0001",
      from: "2026-11-01",
      to: "2026-11-10",
      entityId: "L-PRUEBA-001",
      page: 3,
    });
  });

  it("RF-08 with no query shows the whole log from page 1", () => {
    const filters = parseAuditFilters({});
    expect(filters.page).toBe(1);
    expect(hasFilters(filters)).toBe(false);
  });

  it("RF-08 drops invalid values instead of failing on a hand-edited URL", () => {
    const filters = parseAuditFilters({
      entidad: "Robert'); DROP TABLE",
      accion: "",
      desde: "2026-02-31",
      hasta: "ayer",
      pagina: "-2",
    });
    expect(filters).toMatchObject({ entity: undefined, action: undefined, from: undefined, to: undefined, page: 1 });
  });

  it("RF-08 keeps an entity or action code it does not know, such as one added by a later module", () => {
    expect(parseAuditFilters({ entidad: "supplier", accion: "archive" })).toMatchObject({
      entity: "supplier",
      action: "archive",
    });
  });

  it("RF-08 takes the first value when a key is repeated", () => {
    expect(parseAuditFilters({ entidad: ["lot", "client"] }).entity).toBe("lot");
  });
});

describe("dateBounds", () => {
  it("RF-08 covers both days in full, in Mexico City time", () => {
    const { from, to } = dateBounds({ from: "2026-11-01", to: "2026-11-01" });
    expect(from?.toISOString()).toBe("2026-11-01T06:00:00.000Z");
    // Exclusive upper bound: the start of the next day
    expect(to?.toISOString()).toBe("2026-11-02T06:00:00.000Z");
  });

  it("RF-08 leaves an open side unbounded", () => {
    expect(dateBounds({ from: "2026-11-01" })).toMatchObject({ to: null });
    expect(dateBounds({})).toEqual({ from: null, to: null });
  });
});

describe("likePattern", () => {
  it("RF-08 matches the employee text literally", () => {
    expect(likePattern("E_001%")).toBe("%E\\_001\\%%");
  });
});

describe("auditHref and pageCount", () => {
  it("RF-08 keeps the filters when moving between pages", () => {
    const filters = parseAuditFilters({ entidad: "lot", empleado: "Ana López", pagina: "2" });
    expect(auditHref(filters, 3)).toBe("/bitacora?entidad=lot&empleado=Ana+L%C3%B3pez&pagina=3");
    expect(auditHref(filters, 1)).toBe("/bitacora?entidad=lot&empleado=Ana+L%C3%B3pez");
    expect(auditHref(parseAuditFilters({}))).toBe("/bitacora");
  });

  it(`RF-08 pages hold ${PAGE_SIZE} rows`, () => {
    expect(PAGE_SIZE).toBe(50);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(50)).toBe(1);
    expect(pageCount(51)).toBe(2);
  });
});
