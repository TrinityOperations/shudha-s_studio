import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  productImages,
  products,
  type ProductImage,
  type ProductStatus,
} from "@/db/schema";
import { productInputFromRow, type ProductFormValues } from "@/lib/validators/products";
import { detailWith, toProductDetail, type ProductDetail } from "./catalogue";

export type ProductListFilters = {
  status?: ProductStatus;
  categoryId?: string;
  q?: string;
};

export type ProductListRow = {
  id: string;
  slug: string;
  title: string;
  titleBn: string | null;
  status: ProductStatus;
  featured: boolean;
  /** ISO string so the row is serialisable to client components */
  updatedAt: string;
  category: { id: string; name: string; nameBn: string | null } | null;
  thumb: { thumbPath: string; alt: string } | null;
  bookingCount: number;
};

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Newest first. Filters combine; search matches English or Bengali title. */
export async function listProducts(filters: ProductListFilters = {}): Promise<ProductListRow[]> {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(products.status, filters.status));
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.q?.trim()) {
    const pattern = `%${escapeLike(filters.q.trim())}%`;
    conditions.push(or(ilike(products.title, pattern), ilike(products.titleBn, pattern))!);
  }

  const rows = await db.query.products.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(products.createdAt)],
    with: {
      category: { columns: { id: true, name: true, nameBn: true } },
      images: {
        columns: { thumbPath: true, alt: true },
        orderBy: [asc(productImages.sortOrder)],
        limit: 1,
      },
    },
  });

  const ids = rows.map((r) => r.id);
  const bookingCounts = ids.length
    ? await db
        .select({ productId: bookings.productId, n: count() })
        .from(bookings)
        .where(inArray(bookings.productId, ids))
        .groupBy(bookings.productId)
    : [];
  const countByProduct = new Map(bookingCounts.map((c) => [c.productId, c.n]));

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    titleBn: r.titleBn,
    status: r.status,
    featured: r.featured,
    updatedAt: r.updatedAt.toISOString(),
    category: r.category,
    thumb: r.images[0] ?? null,
    bookingCount: countByProduct.get(r.id) ?? 0,
  }));
}

export type ProductImageRow = Pick<
  ProductImage,
  "id" | "path" | "thumbPath" | "alt" | "altBn" | "width" | "height" | "sortOrder"
>;

export type ProductForEdit = {
  id: string;
  status: ProductStatus;
  publishedAt: string | null;
  values: ProductFormValues;
  images: ProductImageRow[];
  bookingCount: number;
};

export async function getProductForEdit(id: string): Promise<ProductForEdit | null> {
  const row = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      images: { orderBy: [asc(productImages.sortOrder), asc(productImages.createdAt)] },
      productOccasions: { columns: { occasionId: true } },
      productTags: { columns: { tagId: true } },
    },
  });
  if (!row) return null;

  const [{ n: bookingCount }] = await db
    .select({ n: count() })
    .from(bookings)
    .where(eq(bookings.productId, id));

  const { images, productOccasions, productTags, ...product } = row;
  return {
    id: row.id,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    values: productInputFromRow(
      product,
      productOccasions.map((o) => o.occasionId),
      productTags.map((t) => t.tagId),
    ),
    images: images.map(({ id, path, thumbPath, alt, altBn, width, height, sortOrder }) => ({
      id,
      path,
      thumbPath,
      alt,
      altBn,
      width,
      height,
      sortOrder,
    })),
    bookingCount,
  };
}

/** Total products regardless of filters, used to tell "no products yet" from "no matches". */
export async function countProducts(): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(products);
  return n;
}

/**
 * OD-16 live preview: the public product page view model for ANY status. Admin only; the public
 * route uses getPublishedProduct() from catalogue.ts, which filters on status.
 */
export async function getProductDetailForPreview(id: string): Promise<ProductDetail | null> {
  const row = await db.query.products.findFirst({ where: eq(products.id, id), with: detailWith() });
  return row ? toProductDetail(row) : null;
}
