import { describe, expect, it } from "vitest";
import { createT, getMessages } from "@/lib/i18n/t";
import { formatCivilDate } from "./time";

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
