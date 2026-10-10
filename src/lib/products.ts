import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { productOccasions, productTags } from "@/db/schema";
import { slugify } from "@/lib/slug";
import type { ProductInput } from "@/lib/validators/products";

// Shared by the product actions (#2) and the home page editor (#10). Not a "use server" file,
// so nothing here is an endpoint.

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Replaces a product's occasion and tag joins with the given ids. */
export async function syncJoins(
  tx: Tx,
  productId: string,
  occasionIds: string[],
  tagIds: string[],
) {
  await tx.delete(productOccasions).where(eq(productOccasions.productId, productId));
  await tx.delete(productTags).where(eq(productTags.productId, productId));
  if (occasionIds.length) {
    await tx
      .insert(productOccasions)
      .values(occasionIds.map((occasionId) => ({ productId, occasionId })))
      .onConflictDoNothing();
  }
  if (tagIds.length) {
    await tx
      .insert(productTags)
      .values(tagIds.map((tagId) => ({ productId, tagId })))
      .onConflictDoNothing();
  }
}

/** The slug to make unique: the typed one, else the title, else "product". */
export function slugBase(input: ProductInput): string {
  return input.slug || slugify(input.title) || "product";
}
