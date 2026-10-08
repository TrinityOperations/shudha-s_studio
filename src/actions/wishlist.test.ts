import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listPublishedProductsBySlugs: vi.fn() }));
vi.mock("@/db/queries/catalogue", () => ({
  listPublishedProductsBySlugs: mocks.listPublishedProductsBySlugs,
}));

import { getWishlistProducts } from "./wishlist";

const card = (slug: string) => ({
  id: `id-${slug}`,
  slug,
  title: slug,
  titleBn: null,
  priceFrom: null,
  category: null,
  thumb: null,
});

beforeEach(() => {
  mocks.listPublishedProductsBySlugs.mockImplementation(async (slugs: string[]) =>
    slugs.filter((s) => s !== "draft-thing" && s !== "unknown").map(card),
  );
});

describe("getWishlistProducts", () => {
  it("returns published products in the requested order and drops the rest", async () => {
    const result = await getWishlistProducts(["eid-mug", "draft-thing", "frame", "unknown"]);
    expect(result).toEqual({
      ok: true,
      data: { products: [card("eid-mug"), card("frame")] },
    });
    expect(mocks.listPublishedProductsBySlugs).toHaveBeenCalledWith([
      "eid-mug",
      "draft-thing",
      "frame",
      "unknown",
    ]);
  });

  it("ignores ids, junk and duplicates and caps at 50 without touching the database for junk", async () => {
    const many = Array.from({ length: 60 }, (_, i) => `product-${i}`);
    await getWishlistProducts([
      "11111111-1111-4111-8111-111111111111",
      "../etc",
      42,
      "eid-mug",
      "eid-mug",
      ...many,
    ]);
    const asked = mocks.listPublishedProductsBySlugs.mock.calls[0]?.[0] as string[];
    expect(asked[0]).toBe("eid-mug");
    expect(asked).toHaveLength(50);
    expect(asked).not.toContain("11111111-1111-4111-8111-111111111111");

    mocks.listPublishedProductsBySlugs.mockClear();
    expect(await getWishlistProducts("not-an-array")).toEqual({
      ok: true,
      data: { products: [] },
    });
    expect(await getWishlistProducts([])).toEqual({ ok: true, data: { products: [] } });
    expect(mocks.listPublishedProductsBySlugs).not.toHaveBeenCalled();
  });
});
