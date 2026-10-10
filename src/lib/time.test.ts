import { describe, expect, it } from "vitest";
import { createT, getMessages } from "@/lib/i18n/t";
import { formatCivilDate, formatMelbourneFor, toBengaliDigits } from "./time";

describe("formatCivilDate", () => {
  it("renders a civil date as day, short month and year", () => {
    const t = createT(getMessages("en"));
    expect(formatCivilDate("2026-12-10", t)).toBe("10 Dec 2026");
    expect(formatCivilDate("2027-01-05", t)).toBe("5 Jan 2027");
  });

  it("uses the Bengali month names on a Bengali page", () => {
    const t = createT(getMessages("bn"));
    expect(formatCivilDate("2026-12-10", t)).toBe(`10 ${t("common.month.11")} 2026`);
  });

  it("returns anything that is not yyyy-mm-dd unchanged", () => {
    const t = createT(getMessages("en"));
    expect(formatCivilDate("soon", t)).toBe("soon");
  });
});

describe("formatMelbourneFor", () => {
  const instant = new Date("2026-07-15T01:05:00.000Z"); // Wed 15 July 2026, 11:05 am Melbourne

  it("keeps the English patterns from the booking slices", () => {
    expect(formatMelbourneFor("en", instant, "long")).toBe("Wednesday 15 July 2026");
    expect(formatMelbourneFor("en", instant, "weekday")).toBe("Wednesday 15 July");
    expect(formatMelbourneFor("en", instant, "short")).toBe("Wed 15 Jul");
    expect(formatMelbourneFor("en", instant, "date")).toBe("15 Jul 2026");
    expect(formatMelbourneFor("en", instant, "time")).toBe("11:05 am");
    expect(formatMelbourneFor("en", instant, "datetime")).toBe("15 Jul 2026, 11:05 am");
  });

  it("uses Bengali digits and month names in Melbourne time for bn", () => {
    const long = formatMelbourneFor("bn", instant, "long");
    expect(long).toContain("১৫");
    expect(long).toContain("২০২৬");
    expect(long).toMatch(/জুলাই/);
    expect(long).not.toMatch(/\d/);
    const time = formatMelbourneFor("bn", instant, "time");
    expect(time).toContain("১১:০৫");
    // Daylight saving: 1 Jan is 11:00 AEDT for 00:00 UTC.
    expect(formatMelbourneFor("bn", new Date("2026-01-01T00:00:00.000Z"), "time")).toContain(
      "১১:০০",
    );
    expect(formatMelbourneFor("bn", instant, "short")).toMatch(/বুধ/);
  });

  it("converts digits and civil dates", () => {
    expect(toBengaliDigits("From $25")).toBe("From $২৫");
    const bn = createT(getMessages("bn"));
    expect(formatCivilDate("2026-12-10", bn, "bn")).toBe(`১০ ${bn("common.month.11")} ২০২৬`);
    expect(formatCivilDate("2026-12-10", createT(getMessages("en")), "en")).toBe("10 Dec 2026");
  });
});
