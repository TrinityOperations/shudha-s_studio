"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, type Db } from "@/db";
import { productImages, productOccasions, products, productTags } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { ensureUniqueSlug, slugify } from "@/lib/slug";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/storage";
import { copyStorageObject, removeStorageObjects, StorageError } from "@/lib/storage.server";
import {
  bulkProductsSchema,
  productColumnsFromInput,
  productIdSchema,
  productSchema,
  type BulkProductsInput,
  type ProductInput,
} from "@/lib/validators/products";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function revalidateProducts() {
  // Product data appears on the admin list, the edit page and (later) the public catalogue.
  revalidatePath("/", "layout");
}

async function syncJoins(tx: Tx, productId: string, occasionIds: string[], tagIds: string[]) {
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

function slugBase(input: ProductInput) {
  return input.slug || slugify(input.title) || "product";
}

/** OD-10: saves the basics as a draft, then redirects to the edit page where images can be added. */
export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const data = parsed.data;

  const id = await db.transaction(async (tx) => {
    const slug = await ensureUniqueSlug(products, slugBase(data), undefined, tx);
    const [row] = await tx
      .insert(products)
      .values({ ...productColumnsFromInput(data), slug, status: "draft", publishedAt: null })
      .returning({ id: products.id });
    await syncJoins(tx, row.id, data.occasionIds, data.tagIds);
    return row.id;
  });

  revalidateProducts();
  redirect(`/admin/products/${id}`);
}

/** OD-10, OD-13: edit fields and draft/published status. Archived products must be unarchived first. */
export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsedId = productIdSchema.safeParse(id);
  const parsed = productSchema.safeParse(input);
  if (!parsedId.success) return fail("errors.invalidInput");
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const data = parsed.data;

  const existing = await db.query.products.findFirst({
    where: eq(products.id, parsedId.data),
    columns: { id: true, status: true, publishedAt: true },
  });
  if (!existing) return fail("errors.notFound");
  if (existing.status === "archived") return fail("errors.productArchived");

  const slug = await db.transaction(async (tx) => {
    const nextSlug = await ensureUniqueSlug(products, slugBase(data), existing.id, tx);
    const publishedAt = existing.publishedAt ?? (data.status === "published" ? new Date() : null);
    await tx
      .update(products)
      .set({ ...productColumnsFromInput(data), slug: nextSlug, status: data.status, publishedAt })
      .where(eq(products.id, existing.id));
    await syncJoins(tx, existing.id, data.occasionIds, data.tagIds);
    return nextSlug;
  });

  revalidateProducts();
  return ok({ id: existing.id, slug });
}

export async function archiveProduct(id: string): Promise<ActionResult> {
  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();

  const rows = await db
    .update(products)
    .set({ status: "archived" })
    .where(and(eq(products.id, parsedId.data), ne(products.status, "archived")))
    .returning({ id: products.id });
  if (rows.length === 0) return fail("errors.notFound");

  revalidateProducts();
  return ok();
}

/** Unarchiving always returns the product to draft; the owner republishes deliberately. */
export async function unarchiveProduct(id: string): Promise<ActionResult> {
  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();

  const rows = await db
    .update(products)
    .set({ status: "draft" })
    .where(and(eq(products.id, parsedId.data), eq(products.status, "archived")))
    .returning({ id: products.id });
  if (rows.length === 0) return fail("errors.notFound");

  revalidateProducts();
  return ok();
}

async function imagePathsFor(productIds: string[]): Promise<string[]> {
  if (productIds.length === 0) return [];
  const rows = await db
    .select({ path: productImages.path, thumbPath: productImages.thumbPath })
    .from(productImages)
    .where(inArray(productImages.productId, productIds));
  return rows.flatMap((r) => [r.path, r.thumbPath]);
}

/** Storage objects go first; if that fails nothing is deleted. Rows cascade to images and joins. */
export async function deleteProduct(id: string): Promise<ActionResult> {
  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();

  try {
    await removeStorageObjects(PRODUCT_IMAGES_BUCKET, await imagePathsFor([parsedId.data]));
  } catch (error) {
    if (error instanceof StorageError) return fail("errors.storageFailed");
    throw error;
  }

  const rows = await db
    .delete(products)
    .where(eq(products.id, parsedId.data))
    .returning({ id: products.id });
  if (rows.length === 0) return fail("errors.notFound");

  revalidateProducts();
  return ok();
}

/** OD-17: draft copy with its own slug and its own copies of the image files. */
export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();

  const source = await db.query.products.findFirst({
    where: eq(products.id, parsedId.data),
    with: {
      images: true,
      productOccasions: { columns: { occasionId: true } },
      productTags: { columns: { tagId: true } },
    },
  });
  if (!source) return fail("errors.notFound");

  let newId: string;
  try {
    newId = await db.transaction(async (tx) => {
      const slug = await ensureUniqueSlug(
        products,
        slugify(`${source.title} copy`) || "product",
        undefined,
        tx,
      );
      const [row] = await tx
        .insert(products)
        .values({
          title: `${source.title} (copy)`,
          titleBn: source.titleBn,
          description: source.description,
          descriptionBn: source.descriptionBn,
          materialNotes: source.materialNotes,
          materialNotesBn: source.materialNotesBn,
          personalisation: source.personalisation,
          turnaroundDays: source.turnaroundDays,
          categoryId: source.categoryId,
          featured: source.featured,
          status: "draft",
          publishedAt: null,
          slug,
        })
        .returning({ id: products.id });

      await syncJoins(
        tx,
        row.id,
        source.productOccasions.map((o) => o.occasionId),
        source.productTags.map((t) => t.tagId),
      );

      // Copy files so the two products never share storage objects.
      const copied: string[] = [];
      try {
        for (const image of source.images) {
          const key = randomUUID();
          const path = `${row.id}/${key}.webp`;
          const thumbPath = `${row.id}/${key}-thumb.webp`;
          await copyStorageObject(PRODUCT_IMAGES_BUCKET, image.path, path);
          copied.push(path);
          await copyStorageObject(PRODUCT_IMAGES_BUCKET, image.thumbPath, thumbPath);
          copied.push(thumbPath);
          await tx.insert(productImages).values({
            productId: row.id,
            path,
            thumbPath,
            alt: image.alt,
            altBn: image.altBn,
            width: image.width,
            height: image.height,
            sortOrder: image.sortOrder,
          });
        }
      } catch (error) {
        await removeStorageObjects(PRODUCT_IMAGES_BUCKET, copied).catch(() => undefined);
        throw error;
      }
      return row.id;
    });
  } catch (error) {
    if (error instanceof StorageError) return fail("errors.storageFailed");
    throw error;
  }

  revalidateProducts();
  redirect(`/admin/products/${newId}`);
}

/**
 * OD-15. publish → drafts only (sets publishedAt once); unpublish → published only;
 * archive → anything not archived; delete → everything selected, files first.
 */
export async function bulkUpdateProducts(
  input: BulkProductsInput,
): Promise<ActionResult<{ count: number }>> {
  const parsed = bulkProductsSchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();
  const { ids, action } = parsed.data;

  let count = 0;
  switch (action) {
    case "publish": {
      const rows = await db
        .update(products)
        .set({ status: "published", publishedAt: sql`coalesce(${products.publishedAt}, now())` })
        .where(and(inArray(products.id, ids), eq(products.status, "draft")))
        .returning({ id: products.id });
      count = rows.length;
      break;
    }
    case "unpublish": {
      const rows = await db
        .update(products)
        .set({ status: "draft" })
        .where(and(inArray(products.id, ids), eq(products.status, "published")))
        .returning({ id: products.id });
      count = rows.length;
      break;
    }
    case "archive": {
      const rows = await db
        .update(products)
        .set({ status: "archived" })
        .where(and(inArray(products.id, ids), ne(products.status, "archived")))
        .returning({ id: products.id });
      count = rows.length;
      break;
    }
    case "delete": {
      try {
        await removeStorageObjects(PRODUCT_IMAGES_BUCKET, await imagePathsFor(ids));
      } catch (error) {
        if (error instanceof StorageError) return fail("errors.storageFailed");
        throw error;
      }
      const rows = await db
        .delete(products)
        .where(inArray(products.id, ids))
        .returning({ id: products.id });
      count = rows.length;
      break;
    }
  }

  revalidateProducts();
  return ok({ count });
}
