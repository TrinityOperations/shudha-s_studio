import { describe, expect, it } from "vitest";
import { defaultHomeContent, type HomeContent } from "./settings";
import {
  applySlot,
  isProductSlot,
  parseSlotId,
  referencedSitePaths,
  setSlotSchema,
  slotShape,
} from "./home-editor";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const image = (path: string) => ({
  path,
  thumbPath: `${path}-thumb`,
  focus: { x: 0.5, y: 0.5 },
  bucket: "site-images" as const,
});

describe("parseSlotId / slotShape", () => {
  it("accepts every slot the page renders and nothing else", () => {
    expect(parseSlotId("heroVideo")).toEqual({ kind: "heroVideo" });
    expect(parseSlotId("portrait")).toEqual({ kind: "image", key: "portrait" });
    expect(parseSlotId("collage.9")).toEqual({ kind: "collage", index: 9 });
    expect(parseSlotId("collage.10")).toBeNull();
    expect(parseSlotId("occasion.eid")).toEqual({ kind: "occasion", slug: "eid" });
    expect(parseSlotId("occasion.Bad Slug")).toBeNull();
    expect(parseSlotId("signature.3")).toEqual({ kind: "signature", index: 3 });
    expect(parseSlotId("signature.4")).toBeNull();
    expect(parseSlotId("new.7")).toEqual({ kind: "new", index: 7 });
    expect(parseSlotId("new.x")).toBeNull();
    expect(parseSlotId("hero")).toBeNull();
    expect(slotShape({ kind: "image", key: "portrait" })).toBe("tall");
    expect(slotShape({ kind: "image", key: "heroPoster" })).toBe("wide");
    expect(slotShape({ kind: "occasion", slug: "eid" })).toBe("tall");
    expect(slotShape({ kind: "new", index: 0 })).toBe("square");
    expect(isProductSlot({ kind: "signature", index: 0 })).toBe(true);
    expect(isProductSlot({ kind: "collage", index: 0 })).toBe(false);
  });
});

describe("applySlot", () => {
  const draft: HomeContent = defaultHomeContent;

  it("sets and clears image slots, collage slots and the hero video", () => {
    const withPortrait = applySlot(draft, {
      slot: "portrait",
      value: image("home/p.webp"),
      shownProductIds: [],
    });
    expect(withPortrait.portrait?.path).toBe("home/p.webp");
    expect(
      applySlot(withPortrait, { slot: "portrait", value: null, shownProductIds: [] }).portrait,
    ).toBeNull();

    const collage = applySlot(draft, {
      slot: "collage.2",
      value: image("home/c.webp"),
      shownProductIds: [],
    });
    expect(collage.collage).toEqual([null, null, image("home/c.webp")]);

    const video = applySlot(draft, {
      slot: "heroVideo",
      value: { ...image("hero/v.mp4"), thumbPath: null },
      shownProductIds: [],
    });
    expect(video.heroVideoPath).toBe("hero/v.mp4");
    expect(
      applySlot(video, { slot: "heroVideo", value: null, shownProductIds: [] }).heroVideoPath,
    ).toBeNull();
  });

  it("stores an occasion tile as a photo or a product and removes it on null", () => {
    const asPhoto = applySlot(draft, {
      slot: "occasion.eid",
      value: image("home/e.webp"),
      shownProductIds: [],
    });
    expect(asPhoto.occasionTiles.eid).toMatchObject({ path: "home/e.webp" });
    const asProduct = applySlot(asPhoto, {
      slot: "occasion.eid",
      value: { productId: A },
      shownProductIds: [],
    });
    expect(asProduct.occasionTiles.eid).toEqual({ productId: A });
    expect(
      applySlot(asProduct, { slot: "occasion.eid", value: null, shownProductIds: [] })
        .occasionTiles,
    ).toEqual({});
  });

  it("freezes the shown fallback order before changing one signature or new tile", () => {
    const changed = applySlot(draft, {
      slot: "signature.1",
      value: { productId: C },
      shownProductIds: [A, B],
    });
    expect(changed.signaturePicks).toEqual([A, C]);
    // Picks already set: the shown list is ignored.
    const again = applySlot(changed, {
      slot: "signature.0",
      value: { productId: B },
      shownProductIds: [C, C],
    });
    expect(again.signaturePicks).toEqual([B, C]);
    // Removing a tile drops it from the picks.
    expect(
      applySlot(again, { slot: "signature.0", value: null, shownProductIds: [] }).signaturePicks,
    ).toEqual([C]);
    // A gap is filled by repeating the last pick so the index exists.
    const gap = applySlot(draft, { slot: "new.2", value: { productId: A }, shownProductIds: [] });
    expect(gap.newPicks).toEqual([A, A, A]);
    expect(
      applySlot(draft, { slot: "new.0", value: { productId: A }, shownProductIds: [B] }).newPicks,
    ).toEqual([A]);
  });

  it("lists every site-images path a copy references, never product photos", () => {
    const content = applySlot(
      applySlot(draft, { slot: "portrait", value: image("home/p.webp"), shownProductIds: [] }),
      {
        slot: "collage.0",
        value: { ...image("x/1.webp"), bucket: "product-images" },
        shownProductIds: [],
      },
    );
    const withVideo = { ...content, heroVideoPath: "hero/v.mp4" };
    expect([...referencedSitePaths(withVideo)].sort()).toEqual([
      "hero/v.mp4",
      "home/p.webp",
      "home/p.webp-thumb",
    ]);
  });

  it("setSlotSchema rejects unknown slots and non-uuid shown ids", () => {
    expect(setSlotSchema.safeParse({ slot: "nope", value: null }).success).toBe(false);
    expect(
      setSlotSchema.safeParse({ slot: "new.0", value: { productId: A }, shownProductIds: ["x"] })
        .success,
    ).toBe(false);
    expect(setSlotSchema.parse({ slot: "new.0", value: null })).toEqual({
      slot: "new.0",
      value: null,
      shownProductIds: [],
    });
  });
});
