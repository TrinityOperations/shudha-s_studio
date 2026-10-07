import { describe, expect, it } from "vitest";
import { catalogueHref, defaultCatalogueParams, parseCatalogueParams } from "./catalogue";

describe("parseCatalogueParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseCatalogueParams({})).toEqual(defaultCatalogueParams);
  });

  it("accepts single and repeated slugs, de-duplicates and drops bad ones", () => {
    const params = parseCatalogueParams({
      category: "mugs",
      occasion: ["eid", "eid", "Bad Slug!", "wedding"],
      tag: "../etc",
    });
    expect(params.category).toEqual(["mugs"]);
    expect(params.occasion).toEqual(["eid", "wedding"]);
    expect(params.tag).toEqual([]);
  });

  it("trims and caps the search text, taking the first of repeated q values", () => {
    expect(parseCatalogueParams({ q: "  মগ  " }).q).toBe("মগ");
    expect(parseCatalogueParams({ q: ["first", "second"] }).q).toBe("first");
    expect(parseCatalogueParams({ q: "x".repeat(500) }).q).toHaveLength(100);
  });

  it("falls back on sort and page instead of erroring", () => {
    expect(parseCatalogueParams({ sort: "price" }).sort).toBe("newest");
    expect(parseCatalogueParams({ sort: "featured" }).sort).toBe("featured");
    expect(parseCatalogueParams({ page: "0" }).page).toBe(1);
    expect(parseCatalogueParams({ page: "abc" }).page).toBe(1);
    expect(parseCatalogueParams({ page: "3" }).page).toBe(3);
    expect(parseCatalogueParams({ page: "2.5" }).page).toBe(1);
  });
});

describe("catalogueHref", () => {
  it("round-trips params and omits defaults", () => {
    const params = parseCatalogueParams({
      category: ["mugs", "cards"],
      q: "eid",
      sort: "featured",
      page: "2",
    });
    expect(catalogueHref(params)).toBe(
      "/products?category=mugs&category=cards&q=eid&sort=featured&page=2",
    );
    expect(catalogueHref(defaultCatalogueParams)).toBe("/products");
  });

  it("applies overrides, e.g. resetting the page when a filter changes", () => {
    const params = parseCatalogueParams({ category: "mugs", page: "4" });
    expect(catalogueHref(params, { page: 1, tag: ["gold"] })).toBe(
      "/products?category=mugs&tag=gold",
    );
  });
});
