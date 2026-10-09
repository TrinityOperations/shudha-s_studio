import type { CatalogueCard } from "@/db/queries/catalogue";
import type { HomeContent, SiteImageSlot } from "@/lib/validators/settings";

// Pure helpers behind the home page (slice #9), unit-tested without a database.

export const SITE_IMAGES_BUCKET = "site-images";
export const GALLERY_IMAGES_BUCKET = "gallery-images";

/** The owner's picks when any of them resolved, otherwise the fallback list; both capped. */
export function pickProducts(
  picks: CatalogueCard[],
  fallback: CatalogueCard[],
  max: number,
): CatalogueCard[] {
  return (picks.length ? picks : fallback).slice(0, max);
}

export type TilePhoto =
  | { kind: "site"; slot: SiteImageSlot }
  | { kind: "product"; path: string; alt: string; altBn: string | null }
  | { kind: "empty" };

/**
 * PW-03: an occasion tile shows the owner's chosen photo, else the photo of the product she
 * pointed at, else the newest published product in that occasion, else a mist block.
 */
export function resolveOccasionTile(
  override: HomeContent["occasionTiles"][string] | undefined,
  productPhoto: { path: string; alt: string; altBn: string | null } | undefined,
  fallback: { path: string; alt: string; altBn: string | null } | undefined,
): TilePhoto {
  if (override && "path" in override) return { kind: "site", slot: override };
  if (override && productPhoto) return { kind: "product", ...productPhoto };
  if (fallback) return { kind: "product", ...fallback };
  return { kind: "empty" };
}

/** `object-position` for a crop focus. */
export function focusPosition(slot: SiteImageSlot | null | undefined): string {
  if (!slot) return "50% 50%";
  return `${Math.round(slot.focus.x * 100)}% ${Math.round(slot.focus.y * 100)}%`;
}

/** Collage slots padded to the layout's size, so empty slots still render as mist. */
export function collageSlots(
  collage: HomeContent["collage"],
  count: number,
): (SiteImageSlot | null)[] {
  return Array.from({ length: count }, (_, i) => collage[i] ?? null);
}
