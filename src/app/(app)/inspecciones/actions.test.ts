import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ requireRole: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/session", () => ({
  requireRole: mocked.requireRole,
  ForbiddenError: class ForbiddenError extends Error {},
}));
vi.mock("@/lib/db", () => ({ getDb: mocked.getDb }));
vi.mock("@/lib/audit", () => ({ auditInsert: vi.fn() }));
vi.mock("@/lib/reference-data", () => ({ getInternationalLimits: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { ForbiddenError } from "@/lib/session";
import { saveInspectionResults } from "./actions";

describe("RF-01 / BR-AUD-03 inspection server authorization", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects query users before reading or writing the database", async () => {
    mocked.requireRole.mockRejectedValue(new ForbiddenError("Acceso restringido."));
    expect(await saveInspectionResults(1, { ok: false }, new FormData())).toMatchObject({ ok: false });
    expect(mocked.getDb).not.toHaveBeenCalled();
  });

  it("preserves the login redirect for unauthenticated requests", async () => {
    mocked.requireRole.mockRejectedValue(new Error("REDIRECT:/login"));
    await expect(saveInspectionResults(1, { ok: false }, new FormData())).rejects.toThrow("REDIRECT:/login");
    expect(mocked.getDb).not.toHaveBeenCalled();
  });

  it.each([
    [[], "Inspección no encontrada."],
    [[{ id: 1, lockedAt: new Date() }], "La inspección ya se usó en un certificado y no se puede modificar."],
  ])("blocks missing or certified inspections without mutations", async (rows, message) => {
    mocked.requireRole.mockResolvedValue({ id: "u1", role: "transaction" });
    const db = { select: vi.fn(() => ({ from: () => ({ where: async () => rows }) })), batch: vi.fn(), insert: vi.fn(), delete: vi.fn() };
    mocked.getDb.mockReturnValue(db);
    expect(await saveInspectionResults(1, { ok: false }, new FormData())).toMatchObject({ ok: false, message });
    expect(db.batch).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });
});
