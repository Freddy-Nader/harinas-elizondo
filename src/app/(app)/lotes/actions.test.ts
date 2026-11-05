import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ getDb: vi.fn(), latestInspection: vi.fn(), recordAudit: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireRole: async () => ({ id: "u1", role: "transaction" }), ForbiddenError: class extends Error {} }));
vi.mock("@/lib/db", () => ({ getDb: mocked.getDb }));
vi.mock("@/lib/inspection-data", () => ({ latestInspection: mocked.latestInspection }));
vi.mock("@/lib/audit", () => ({ recordAudit: mocked.recordAudit, auditInsert: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import { startLotInspection } from "./actions";

describe("BR-INS-02 / BR-INS-04 concurrent inspection creation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("does not skip to a second inspection after losing a sequence conflict", async () => {
    mocked.latestInspection.mockResolvedValue(null);
    const returning = vi.fn().mockRejectedValue({ code: "23505" });
    const values = vi.fn(() => ({ returning }));
    const insert = vi.fn(() => ({ values }));
    mocked.getDb.mockReturnValue({ select: () => ({ from: () => ({ where: async () => [{ id: "LOT-1" }] }) }), insert });
    const result = await startLotInspection("LOT-1", { ok: false }, new FormData());
    expect(result).toMatchObject({ ok: false });
    expect(result.message).toContain("Otra persona");
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ sequence: "A", reinspectionReason: null }));
    expect(insert).toHaveBeenCalledTimes(1);
    expect(mocked.recordAudit).not.toHaveBeenCalled();
  });

  it("requires finishing an existing incomplete inspection before creating another", async () => {
    mocked.latestInspection.mockResolvedValue({ sequence: "A", complete: false, lockedAt: null });
    const insert = vi.fn();
    mocked.getDb.mockReturnValue({ select: () => ({ from: () => ({ where: async () => [{ id: "LOT-1" }] }) }), insert });
    expect(await startLotInspection("LOT-1", { ok: false }, new FormData())).toMatchObject({ ok: false });
    expect(insert).not.toHaveBeenCalled();
  });
});
