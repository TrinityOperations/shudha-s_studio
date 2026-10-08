import { describe, expect, it } from "vitest";
import { createT, getMessages } from "@/lib/i18n/t";
import { briefRows } from "./brief-section";

const t = createT(getMessages("en"));

describe("briefRows", () => {
  it("returns nothing for an empty brief", () => {
    expect(briefRows(null, t)).toEqual([]);
    expect(briefRows({}, t)).toEqual([]);
  });

  it("labels every present field, including the #7 business fields, and skips blanks", () => {
    const rows = briefRows(
      {
        orderFor: "business",
        businessName: "Acme",
        productType: "mug",
        occasion: "corporate",
        details: { names: "", quantity: undefined } as never,
        quantity: 50,
        neededBy: "2026-12-01",
      },
      t,
    );
    expect(rows).toEqual([
      { label: "Order for", value: "Business" },
      { label: "Business name", value: "Acme" },
      { label: "Product type", value: "mug" },
      { label: "Occasion", value: "corporate" },
      { label: "Quantity", value: "50" },
      { label: "Needed by", value: "1 Dec 2026" },
    ]);
    expect(rows.some((r) => r.label.includes("admin."))).toBe(false);
  });

  it("formats the needed-by date with the page's month names", () => {
    const bn = createT(getMessages("bn"));
    expect(briefRows({ neededBy: "2026-12-10" }, bn)).toEqual([
      { label: bn("admin.bookings.brief.neededBy"), value: `10 ${bn("common.month.11")} 2026` },
    ]);
  });
});
