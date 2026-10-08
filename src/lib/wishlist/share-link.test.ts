import { describe, expect, it } from "vitest";
import { buildShareLink, parseShareItems } from "./share-link";
import { WISHLIST_MAX } from "./storage";

describe("share link", () => {
  it("round-trips a list through the URL", () => {
    const url = buildShareLink("https://example.com/", ["eid-mug", "frame"]);
    expect(url).toBe("https://example.com/wishlist?items=eid-mug,frame");
    const param = new URL(url).searchParams.get("items");
    expect(parseShareItems(param)).toEqual(["eid-mug", "frame"]);
  });

  it("drops junk and duplicates and caps at the maximum", () => {
    expect(parseShareItems("eid-mug,,Bad Slug,../x, frame ,eid-mug")).toEqual(["eid-mug", "frame"]);
    expect(parseShareItems(undefined)).toEqual([]);
    expect(parseShareItems(["a", "b"])).toEqual(["a", "b"]);
    const many = Array.from({ length: WISHLIST_MAX + 10 }, (_, i) => `p-${i}`).join(",");
    expect(parseShareItems(many)).toHaveLength(WISHLIST_MAX);
    expect(buildShareLink("https://example.com", [])).toBe("https://example.com/wishlist");
  });
});
