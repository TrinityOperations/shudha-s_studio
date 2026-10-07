import { describe, expect, it } from "vitest";
import { createT, getMessages } from "@/lib/i18n/t";
import { formatAud, formatPriceFrom } from "./format-price";

const t = createT(getMessages("en"));

describe("formatPriceFrom", () => {
  it("formats whole AUD dollars with thousands separators", () => {
    expect(formatAud(25)).toBe("$25");
    expect(formatAud(1500)).toBe("$1,500");
    expect(formatAud(100000)).toBe("$100,000");
  });

  it("wraps the amount in the 'From' label", () => {
    expect(formatPriceFrom(25, "en", t)).toBe("From $25");
    expect(formatPriceFrom(1500, "bn", t)).toBe("From $1,500");
  });

  it("returns null when there is no price so nothing is rendered", () => {
    expect(formatPriceFrom(null, "en", t)).toBeNull();
    expect(formatPriceFrom(Number.NaN, "en", t)).toBeNull();
  });
});
