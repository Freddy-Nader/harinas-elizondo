import { describe, expect, it } from "vitest";
import { assessQuality } from "./quality";

describe("UC-04 / UC-05 reference provenance", () => {
  it("distinguishes international compliance from stricter client noncompliance", () => {
    const [row] = assessQuality({ ALV_P: 62 }, { ALV_P: { lower: 60, upper: 90 } }, { ALV_P: { lower: 65, upper: 85 } });
    expect(row.source).toBe("client");
    expect(row.assessment?.status).toBe("below");
    expect(row.internationalAssessment?.status).toBe("within");
  });
  it("falls back per parameter and flags missing references", () => {
    const rows = assessQuality({ ALV_P: 55, ALV_L: 100 }, { ALV_P: { lower: 60, upper: 90 } }, null);
    expect(rows[0].internationalAssessment?.status).toBe("below");
    expect(rows[0].source).toBe("international");
    expect(rows[1].assessment).toBeNull();
    expect(rows[1].limits).toBeNull();
  });
});
