import { z } from "zod";
import { SLUG_PATTERN } from "./products";

// PW-60..PW-62: only product slugs ever cross the client/server boundary. Ids are resolved on the
// server against published products, so anything that isn't a slug is dropped here.

export const WISHLIST_SLUGS_MAX = 50;
/** How many wishlist products one booking may carry (PW-61). */
export const ATTACHED_WISHLIST_MAX = 20;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** A slug that is not an id: a uuid passes the slug pattern, so it is excluded by name. */
const slug = z
  .string()
  .trim()
  .regex(SLUG_PATTERN)
  .refine((value) => !UUID_PATTERN.test(value));

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

/** Slugs sent to the read-only lookup; invalid entries are dropped, not rejected. */
export const wishlistSlugsSchema = z
  .array(z.unknown())
  .max(WISHLIST_SLUGS_MAX * 2)
  .transform((items) =>
    dedupe(items.filter((item): item is string => slug.safeParse(item).success)).slice(
      0,
      WISHLIST_SLUGS_MAX,
    ),
  );

/** Slugs attached to a booking: deduped and capped at 20. */
export const attachedWishlistSchema = z
  .array(z.unknown())
  .max(WISHLIST_SLUGS_MAX * 2)
  .transform((items) =>
    dedupe(items.filter((item): item is string => slug.safeParse(item).success)).slice(
      0,
      ATTACHED_WISHLIST_MAX,
    ),
  );
