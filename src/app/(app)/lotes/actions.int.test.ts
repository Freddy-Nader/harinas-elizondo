import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { saveInspectionResults } from "@/app/(app)/inspecciones/actions";
import { auditLog, inspections, lots } from "@/lib/db/schema";
import { holdUntilConcurrent, testDb, TEST_USERS } from "@/test/int/db";
import { formData, initialState, insertEquipment, insertLot, redirectOf, resultsForm } from "@/test/int/fixtures";
import { signInAs } from "@/test/int/session";
import { startLotInspection, updateLot } from "./actions";

const inspectionsOf = (lotId: string) =>
  testDb.select().from(inspections).where(eq(inspections.lotId, lotId)).orderBy(inspections.id);

async function startAndGetId(lotId: string, reason = "") {
  const target = await redirectOf(startLotInspection(lotId, initialState, formData({ reason })));
  return Number(target.replace("/inspecciones/", ""));
}

describe("Lotes and Inspecciones server actions against Postgres (UC-03, UC-04)", () => {
  let machines: { alveograph: string; farinograph: string };

  beforeAll(async () => {
    machines = await insertEquipment();
  });
  beforeEach(() => signInAs("transaction"));

  it("PC-04 BR-INS-02 / BR-INS-04 assigns A, then B only after A is complete and with a reason", async () => {
    const lotId = await insertLot("PC-LOT-SEQ");

    const first = await startAndGetId(lotId);
    expect((await inspectionsOf(lotId)).map((i) => i.sequence)).toEqual(["A"]);

    // BR-INS-04. A is still incomplete, so a second inspection is refused
    const early = await startLotInspection(lotId, initialState, formData({ reason: "Falla del equipo" }));
    expect(early).toMatchObject({ ok: false, message: "Completa la inspección A antes de crear otra." });

    const saved = await saveInspectionResults(first, initialState, resultsForm(machines));
    expect(saved).toMatchObject({ ok: true, message: "Resultados guardados. La inspección está completa." });

    // BR-INS-04 · D-15. A complete inspection needs the equipment-failure reason
    const noReason = await startLotInspection(lotId, initialState, formData({ reason: " " }));
    expect(noReason).toMatchObject({ ok: false });
    expect(await inspectionsOf(lotId)).toHaveLength(1);

    const second = await startAndGetId(lotId, "Falla del alveografo de prueba");
    const rows = await inspectionsOf(lotId);
    expect(rows.map((i) => i.sequence)).toEqual(["A", "B"]);
    expect(rows[1]).toMatchObject({ id: second, reinspectionReason: "Falla del alveografo de prueba" });

    // BR-AUD-01. One audit row per start, with who did it
    const audit = await testDb.select().from(auditLog).where(eq(auditLog.entity, "inspection"));
    expect(audit.find((row) => row.entityId === String(first))).toMatchObject({ action: "create", employeeId: "T0001" });
    expect(audit.find((row) => row.entityId === String(second))).toMatchObject({ action: "reinspect", employeeId: "T0001" });
  });

  it("PC-05 BR-INS-02 / BR-INS-04 lets only one of two simultaneous starts create the inspection", async () => {
    const lotId = await insertLot("PC-LOT-RACE");

    // Both users read "no inspections yet" before either insert reaches the database
    holdUntilConcurrent(/^insert into "inspections"/);
    const outcomes = await Promise.allSettled([
      startLotInspection(lotId, initialState, formData({})),
      startLotInspection(lotId, initialState, formData({})),
    ]);

    const redirected = outcomes.filter((o) => o.status === "rejected" && String(o.reason.message).startsWith("REDIRECT:/inspecciones/"));
    const refused = outcomes.filter((o) => o.status === "fulfilled");
    expect(redirected).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect((refused[0] as PromiseFulfilledResult<unknown>).value).toMatchObject({
      ok: false,
      message: "Otra persona ya inició una inspección. Actualiza el lote y revisa la inspección más reciente.",
    });
    // The unique index (lot, sequence) kept a single A and nobody got an unauthorized B
    expect((await inspectionsOf(lotId)).map((i) => i.sequence)).toEqual(["A"]);
  });

  it("PC-06 BR-AUD-01 rolls the change back when its audit row cannot be written", async () => {
    const lotId = await insertLot("PC-LOT-AUDIT");
    // audit_log.employee_id holds 10 characters, so this audit insert fails inside the batch
    signInAs({ ...TEST_USERS.transaction, employeeId: "EMPLOYEE-ID-TOO-LONG" });

    const form = formData({ product: "Harina cambiada", producedOn: "2026-01-10", expiresOn: "2026-12-31" });
    await expect(updateLot(lotId, initialState, form)).rejects.toThrow();

    const [lot] = await testDb.select().from(lots).where(eq(lots.id, lotId));
    expect(lot.product).toBe("Harina de prueba");
    expect(await testDb.select().from(auditLog).where(eq(auditLog.entityId, lotId))).toHaveLength(0);

    // Same change with a valid user: the lot and its audit row land together
    signInAs("transaction");
    expect(await updateLot(lotId, initialState, form)).toMatchObject({ ok: true, message: "Cambios guardados." });
    const [updated] = await testDb.select().from(lots).where(eq(lots.id, lotId));
    expect(updated.product).toBe("Harina cambiada");
    const audit = await testDb.select().from(auditLog).where(eq(auditLog.entityId, lotId));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: "update", entity: "lot", userName: "Analista Prueba" });
  });

  it("PC-07 RF-01 refuses a query user without writing anything", async () => {
    const lotId = await insertLot("PC-LOT-ROLE");
    signInAs("query");

    const result = await startLotInspection(lotId, initialState, formData({}));
    expect(result).toMatchObject({ ok: false, message: "No tienes permiso para realizar esta acción." });
    expect(await inspectionsOf(lotId)).toHaveLength(0);
    expect(await testDb.select().from(auditLog).where(eq(auditLog.userId, TEST_USERS.query.id))).toHaveLength(0);
  });
});
