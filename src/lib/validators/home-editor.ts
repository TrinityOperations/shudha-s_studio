import { z } from "zod";
import {
  HOME_COLLAGE_SLOTS,
  HOME_NEW_PICKS_MAX,
  HOME_SIGNATURE_PICKS_MAX,
  homeProductSlotSchema,
  siteImageSlotSchema,
  type HomeContent,
  type SiteImageSlot,
} from "./settings";
import { SLUG_PATTERN } from "./products";

// The home page editor (docs/design.md, "Home page editor"). Slot ids name every photo on the
// page; `applySlot` is the pure change to the draft copy and is unit-tested without a database.

export const IMAGE_SLOT_KEYS = ["heroPoster", "signaturePanel", "madeForYou", "portrait"] as const;
export type ImageSlotKey = (typeof IMAGE_SLOT_KEYS)[number];

export type SlotShape = "wide" | "tall" | "square";

export type ParsedSlot =
  | { kind: "heroVideo" }
  | { kind: "image"; key: ImageSlotKey }
  | { kind: "collage"; index: number }
  | { kind: "occasion"; slug: string }
  | { kind: "signature"; index: number }
  | { kind: "new"; index: number };

/** "portrait", "collage.3", "occasion.eid", "signature.0", "new.5", "heroVideo" → structure, or null. */
export function parseSlotId(id: string): ParsedSlot | null {
  if (id === "heroVideo") return { kind: "heroVideo" };
  if ((IMAGE_SLOT_KEYS as readonly string[]).includes(id))
    return { kind: "image", key: id as ImageSlotKey };
  const [kind, rest] = id.split(".", 2);
  if (rest === undefined) return null;
  if (kind === "occasion") return SLUG_PATTERN.test(rest) ? { kind, slug: rest } : null;
  const index = /^\d+$/.test(rest) ? Number(rest) : -1;
  if (index < 0) return null;
  if (kind === "collage" && index < HOME_COLLAGE_SLOTS) return { kind, index };
  if (kind === "signature" && index < HOME_SIGNATURE_PICKS_MAX) return { kind, index };
  if (kind === "new" && index < HOME_NEW_PICKS_MAX) return { kind, index };
  return null;
}

/** The crop frame each slot shows in the picker (docs/design.md, "Change photo panel"). */
export function slotShape(slot: ParsedSlot): SlotShape {
  switch (slot.kind) {
    case "image":
      return slot.key === "portrait" ? "tall" : "wide";
    case "occasion":
      return "tall";
    case "collage":
    case "heroVideo":
      return "wide";
    case "signature":
    case "new":
      return "square";
  }
}

/** Product slots hold a product; image slots hold a photo (optionally a product's photo). */
export function isProductSlot(slot: ParsedSlot): boolean {
  return slot.kind === "signature" || slot.kind === "new";
}

export const slotIdSchema = z
  .string()
  .refine((id) => parseSlotId(id) !== null, "errors.invalidInput");

export const slotValueSchema = z.union([siteImageSlotSchema, homeProductSlotSchema, z.null()]);
export type SlotValue = z.infer<typeof slotValueSchema>;

/** One change to the draft. `shownProductIds` freezes the fallback order the page was showing. */
export const setSlotSchema = z.object({
  slot: slotIdSchema,
  value: slotValueSchema,
  shownProductIds: z.array(z.uuid()).max(HOME_NEW_PICKS_MAX).default([]),
});
export type SetSlotInput = z.infer<typeof setSlotSchema>;

function setPick(list: string[], index: number, productId: string | null, max: number): string[] {
  const next = list.slice(0, max);
  if (productId === null) {
    next.splice(index, 1);
    return next;
  }
  while (next.length < index) next.push(next[next.length - 1] ?? productId);
  next[index] = productId;
  return next.slice(0, max);
}

/**
 * Pure: the draft after one slot change. For signature and "new" slots, when the draft has no
 * picks yet the products currently shown as fallback become the picks first, so the order the
 * owner sees is what gets saved.
 */
export function applySlot(draft: HomeContent, input: SetSlotInput): HomeContent {
  const slot = parseSlotId(input.slot);
  if (!slot) return draft;
  const { value } = input;
  const image = value && "path" in value ? (value as SiteImageSlot) : null;
  const productId = value && "productId" in value ? value.productId : null;

  switch (slot.kind) {
    case "heroVideo":
      return { ...draft, heroVideoPath: image ? image.path : null };
    case "image":
      return { ...draft, [slot.key]: image };
    case "collage": {
      const collage = [...draft.collage];
      while (collage.length <= slot.index) collage.push(null);
      collage[slot.index] = image;
      return { ...draft, collage };
    }
    case "occasion": {
      const occasionTiles = { ...draft.occasionTiles };
      if (image) occasionTiles[slot.slug] = image;
      else if (productId) occasionTiles[slot.slug] = { productId };
      else delete occasionTiles[slot.slug];
      return { ...draft, occasionTiles };
    }
    case "signature": {
      const base = draft.signaturePicks.length ? draft.signaturePicks : input.shownProductIds;
      return {
        ...draft,
        signaturePicks: setPick(base, slot.index, productId, HOME_SIGNATURE_PICKS_MAX),
      };
    }
    case "new": {
      const base = draft.newPicks.length ? draft.newPicks : input.shownProductIds;
      return { ...draft, newPicks: setPick(base, slot.index, productId, HOME_NEW_PICKS_MAX) };
    }
  }
}

/** Every site-images path a home copy references (for cleanup of replaced uploads). */
export function referencedSitePaths(content: HomeContent): Set<string> {
  const paths = new Set<string>();
  const add = (slot: SiteImageSlot | null | undefined) => {
    if (!slot || slot.bucket !== "site-images") return;
    paths.add(slot.path);
    if (slot.thumbPath) paths.add(slot.thumbPath);
  };
  for (const key of IMAGE_SLOT_KEYS) add(content[key]);
  for (const slot of content.collage) add(slot);
  for (const tile of Object.values(content.occasionTiles)) if ("path" in tile) add(tile);
  if (content.heroVideoPath) paths.add(content.heroVideoPath);
  return paths;
}
