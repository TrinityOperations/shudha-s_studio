"use server";
import { listPublishedProductsBySlugs, type CatalogueCard } from "@/db/queries/catalogue";
import { ok, type ActionResult } from "@/lib/action-result";
import { wishlistSlugsSchema } from "@/lib/validators/wishlist";

/**
 * PW-60: the published products behind the browser's saved slugs, in the same order. Read-only;
 * anything unknown, draft or archived is left out so the client can prune its list.
 */
export async function getWishlistProducts(
  slugs: unknown,
): Promise<ActionResult<{ products: CatalogueCard[] }>> {
  const parsed = wishlistSlugsSchema.safeParse(slugs);
  const clean = parsed.success ? parsed.data : [];
  const products = clean.length ? await listPublishedProductsBySlugs(clean) : [];
  return ok({ products });
}
