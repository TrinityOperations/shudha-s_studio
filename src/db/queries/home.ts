import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { productImages, products } from "@/db/schema";
import { defaultCatalogueParams } from "@/lib/validators/catalogue";
import {
  catalogueOrderBy,
  catalogueWhere,
  listCatalogueCards,
  type CatalogueCard,
} from "./catalogue";

// Home page reads (slice #9: PW-02, PW-03, PW-09). Published products only, like catalogue.ts.

export const SIGNATURE_TAG = "signature";

/** Published products carrying the `signature` tag, newest first (PW-09). */
export async function listSignatureProducts(limit = 4): Promise<CatalogueCard[]> {
  return listCatalogueCards(
    catalogueWhere({ ...defaultCatalogueParams, tag: [SIGNATURE_TAG] }),
    catalogueOrderBy("newest"),
    limit,
  );
}

/** The newest published products (PW-02, when the owner has not picked any). */
export async function listNewestProducts(limit = 8): Promise<CatalogueCard[]> {
  return listCatalogueCards(
    catalogueWhere(defaultCatalogueParams),
    catalogueOrderBy("newest"),
    limit,
  );
}

export type ProductPhoto = { path: string; alt: string; altBn: string | null };

/**
 * PW-03 fallback tile photos: the first photo of the newest published product in each occasion,
 * in one query (DISTINCT ON per occasion). Keyed by occasion id.
 */
export async function listOccasionFallbackImages(): Promise<Map<string, ProductPhoto>> {
  const result = await db.execute<{
    occasion_id: string;
    path: string;
    alt: string;
    alt_bn: string | null;
  }>(sql`
    select distinct on (po.occasion_id)
      po.occasion_id, pi.path, pi.alt, pi.alt_bn
    from product_occasions po
    join products p on p.id = po.product_id and p.status = 'published'
    join product_images pi on pi.product_id = p.id
    order by po.occasion_id, p.published_at desc nulls last, p.created_at desc, pi.sort_order asc
  `);
  return new Map(
    result.rows.map((row) => [
      row.occasion_id,
      { path: row.path, alt: row.alt, altBn: row.alt_bn },
    ]),
  );
}

/** First photo of specific published products (occasion tiles the owner pointed at a product). */
export async function listProductFirstPhotos(ids: string[]): Promise<Map<string, ProductPhoto>> {
  if (ids.length === 0) return new Map();
  const rows = await db.query.products.findMany({
    where: and(eq(products.status, "published"), inArray(products.id, ids)),
    columns: { id: true },
    with: {
      images: {
        columns: { path: true, alt: true, altBn: true },
        orderBy: [productImages.sortOrder],
        limit: 1,
      },
    },
  });
  return new Map(rows.flatMap((row) => (row.images[0] ? [[row.id, row.images[0]] as const] : [])));
}
