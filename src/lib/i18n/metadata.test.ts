import { describe, expect, it } from "vitest";
import { localeAlternates, pageMetadata } from "./metadata";

describe("locale metadata", () => {
  it("points English at the clean URL and Bengali at ?lang=bn, canonical per request language", () => {
    expect(localeAlternates("/products", "en")).toEqual({
      canonical: "/products",
      languages: { en: "/products", bn: "/products?lang=bn", "x-default": "/products" },
    });
    expect(localeAlternates("/products", "bn").canonical).toBe("/products?lang=bn");
    expect(localeAlternates("/products?category=mugs", "bn").canonical).toBe(
      "/products?category=mugs&lang=bn",
    );
  });

  it("adds og:locale and keeps the page's own metadata", () => {
    const meta = pageMetadata("/about", "bn", { title: "শুধা সম্পর্কে", description: "d" });
    expect(meta.title).toBe("শুধা সম্পর্কে");
    expect(meta.openGraph).toMatchObject({ locale: "bn_BD", alternateLocale: ["en_AU"] });
    expect(meta.alternates?.canonical).toBe("/about?lang=bn");
  });
});
