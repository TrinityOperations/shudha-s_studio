import { describe, expect, it } from "vitest";
import { parseCatalogueSearchParams } from "./catalogue";

describe("parseCatalogueSearchParams", () => {
  it("normalises valid URL values", () => {
    expect(
      parseCatalogueSearchParams({
        category: "mugs",
        occasion: "birthday",
        tag: "photo-gifts",
        q: "  বাংলা mug  ",
        sort: "featured",
        page: "3",
      }),
    ).toEqual({
      category: "mugs",
      occasion: "birthday",
      tag: "photo-gifts",
      q: "বাংলা mug",
      sort: "featured",
      page: 3,
    });
  });

  it("drops unsafe filters and restores defaults", () => {
    expect(
      parseCatalogueSearchParams({
        category: "../../admin",
        sort: "price-low",
        page: "-4",
      }),
    ).toEqual({
      category: undefined,
      occasion: undefined,
      tag: undefined,
      q: undefined,
      sort: "newest",
      page: 1,
    });
  });
});
