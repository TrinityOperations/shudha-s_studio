import { describe, expect, it } from "vitest";
import {
  announcementSettingsSchema,
  defaultHomeContent,
  homeContentSchema,
  homeSettingsSchema,
  seasonalBannerSettingsSchema,
  socialSettingsSchema,
} from "./settings";

describe("homeSettingsSchema", () => {
  it("gives every slot a default so an empty row renders", () => {
    expect(homeSettingsSchema.parse({})).toEqual({
      draft: defaultHomeContent,
      published: defaultHomeContent,
    });
    expect(defaultHomeContent).toEqual({
      heroVideoPath: null,
      heroPoster: null,
      signaturePanel: null,
      madeForYou: null,
      portrait: null,
      collage: [],
      occasionTiles: {},
      signaturePicks: [],
      newPicks: [],
    });
  });

  it("keeps a partial published copy and fills the rest", () => {
    const parsed = homeSettingsSchema.parse({
      published: {
        portrait: { path: "home/shudha.webp" },
        occasionTiles: {
          eid: { path: "home/eid.webp", focus: { x: 0.1, y: 0.9 } },
          wedding: { productId: "11111111-1111-4111-8111-111111111111" },
        },
      },
    });
    expect(parsed.published.portrait).toEqual({
      path: "home/shudha.webp",
      thumbPath: null,
      focus: { x: 0.5, y: 0.5 },
      bucket: "site-images",
    });
    expect(parsed.published.occasionTiles.eid).toMatchObject({ focus: { x: 0.1, y: 0.9 } });
    expect(parsed.published.newPicks).toEqual([]);
    expect(parsed.draft).toEqual(defaultHomeContent);
  });

  it("rejects bad focus values, ids that are not uuids and too many picks", () => {
    expect(
      homeContentSchema.safeParse({ portrait: { path: "x", focus: { x: 2, y: 0 } } }).success,
    ).toBe(false);
    expect(homeContentSchema.safeParse({ newPicks: ["not-an-id"] }).success).toBe(false);
    const ids = Array.from({ length: 5 }, () => "11111111-1111-4111-8111-111111111111");
    expect(homeContentSchema.safeParse({ signaturePicks: ids }).success).toBe(false);
    expect(homeContentSchema.safeParse({ collage: Array(11).fill(null) }).success).toBe(false);
  });
});

describe("content keys read by the home page", () => {
  it("announcement, banner and social default to empty or off", () => {
    expect(announcementSettingsSchema.parse({})).toEqual({ enabled: true, messages: [] });
    expect(announcementSettingsSchema.parse({ messages: [{ text: " Hi " }] }).messages[0]).toEqual({
      text: "Hi",
      textBn: "",
      linkLabel: "",
      linkLabelBn: "",
      href: "",
    });
    expect(seasonalBannerSettingsSchema.parse({})).toMatchObject({
      enabled: false,
      label: "Eid collection",
      href: "/book",
    });
    expect(socialSettingsSchema.parse({})).toEqual({ instagram: "", facebook: "" });
    expect(socialSettingsSchema.safeParse({ instagram: "not a url" }).success).toBe(false);
  });
});
