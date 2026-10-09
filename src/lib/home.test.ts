import { describe, expect, it } from "vitest";
import type { CatalogueCard } from "@/db/queries/catalogue";
import { collageSlots, focusPosition, pickProducts, resolveOccasionTile } from "./home";

const card = (id: string): CatalogueCard => ({
  id,
  slug: id,
  title: id,
  titleBn: null,
  priceFrom: null,
  category: null,
  thumb: null,
  hoverThumb: null,
});
const slot = { path: "home/a.webp", thumbPath: null, focus: { x: 0.2, y: 0.8 } };
const photo = { path: "p/1.webp", alt: "one", altBn: null };

describe("pickProducts", () => {
  it("prefers the owner's picks and falls back to the newest, capped", () => {
    const picks = [card("a"), card("b")];
    const newest = Array.from({ length: 10 }, (_, i) => card(`n${i}`));
    expect(pickProducts(picks, newest, 8)).toEqual(picks);
    expect(pickProducts([], newest, 8)).toHaveLength(8);
    expect(pickProducts(picks, newest, 1)).toEqual([card("a")]);
  });
});

describe("resolveOccasionTile", () => {
  it("uses the chosen photo, then the chosen product, then the newest product, then nothing", () => {
    expect(resolveOccasionTile(slot, photo, photo)).toEqual({ kind: "site", slot });
    expect(resolveOccasionTile({ productId: "x" }, photo, undefined)).toEqual({
      kind: "product",
      ...photo,
    });
    const fallback = { path: "p/2.webp", alt: "two", altBn: "দুই" };
    expect(resolveOccasionTile({ productId: "x" }, undefined, fallback)).toEqual({
      kind: "product",
      ...fallback,
    });
    expect(resolveOccasionTile(undefined, undefined, fallback)).toEqual({
      kind: "product",
      ...fallback,
    });
    expect(resolveOccasionTile(undefined, undefined, undefined)).toEqual({ kind: "empty" });
  });
});

describe("focusPosition / collageSlots", () => {
  it("turns the crop focus into object-position and pads the collage", () => {
    expect(focusPosition(slot)).toBe("20% 80%");
    expect(focusPosition(null)).toBe("50% 50%");
    expect(collageSlots([slot], 3)).toEqual([slot, null, null]);
    expect(collageSlots([null, slot, slot, slot], 2)).toEqual([null, slot]);
  });
});
