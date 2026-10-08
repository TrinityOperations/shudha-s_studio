import { describe, expect, it } from "vitest";
import { addMonths, monthBounds, monthGrid, parseMonth } from "./month-grid";

describe("monthGrid", () => {
  it("starts on Monday and pads a month that begins on a Sunday (March 2026)", () => {
    const weeks = monthGrid("2026-03", "2026-03-15");
    expect(weeks[0].map((c) => c.date)).toEqual([
      "2026-02-23",
      "2026-02-24",
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
    expect(weeks[0].slice(0, 6).every((c) => !c.inMonth)).toBe(true);
    expect(weeks[0][6].inMonth).toBe(true);
    expect(weeks.at(-1)!.map((c) => c.date)).toEqual([
      "2026-03-30",
      "2026-03-31",
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-04",
      "2026-04-05",
    ]);
    expect(weeks).toHaveLength(6);
    expect(
      weeks
        .flat()
        .filter((c) => c.isToday)
        .map((c) => c.date),
    ).toEqual(["2026-03-15"]);
  });

  it("covers October 2026 (DST change on the 4th) with every date exactly once and 7 per week", () => {
    const weeks = monthGrid("2026-10", "2026-11-02");
    const dates = weeks.flat().map((c) => c.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(dates.filter((d) => d.startsWith("2026-10"))).toHaveLength(31);
    expect(dates).toContain("2026-10-04");
    expect(weeks[0][0].date).toBe("2026-09-28"); // 1 Oct 2026 is a Thursday
    expect(weeks.flat().some((c) => c.isToday)).toBe(false);
  });

  it("parses, bounds and steps months", () => {
    expect(parseMonth("2026-10", "2026-01-15")).toBe("2026-10");
    expect(parseMonth("2026-13", "2026-01-15")).toBe("2026-01");
    expect(parseMonth(undefined, "2026-01-15")).toBe("2026-01");
    expect(monthBounds("2026-02")).toEqual({ start: "2026-02-01", end: "2026-03-01" });
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});
