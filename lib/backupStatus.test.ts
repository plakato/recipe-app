import { describe, expect, it } from "vitest";
import { backupProblem } from "./backupStatus";

const now = new Date("2026-10-11T12:00:00Z");
const at = (iso: string) => new Date(iso);

describe("backupProblem", () => {
  it("is quiet after a recent good run", () => {
    expect(backupProblem(at("2026-10-11T02:30:00Z"), null, now)).toBeNull();
    expect(backupProblem(at("2026-10-11T02:30:00Z"), at("2026-10-09T02:30:00Z"), now)).toBeNull();
  });

  it("warns when the last run failed", () => {
    expect(backupProblem(at("2026-10-10T02:30:00Z"), at("2026-10-11T02:30:00Z"), now)).toMatch(/zlyhala/);
    expect(backupProblem(null, at("2026-10-11T02:30:00Z"), now)).toMatch(/zlyhala/);
  });

  it("warns when nothing succeeded for 2 days, or ever", () => {
    expect(backupProblem(at("2026-10-09T02:30:00Z"), null, now)).toMatch(/viac ako 2 dni/);
    expect(backupProblem(null, null, now)).toMatch(/žiadna/);
  });
});
