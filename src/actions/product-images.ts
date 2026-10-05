"use server";

import { randomUUID } from "node:crypto";
import { eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { productImages, products } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { processProductImage } from "@/lib/images";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/storage";
import { removeStorageObjects, StorageError, uploadStorageObject } from "@/lib/storage.server";
import {
  imageAltSchema,
  isAllowedImageType,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_UPLOAD,
  productImageIdSchema,
  reorderImagesSchema,
  uploadImagesMetaSchema,
  type ImageAltInput,
  type ReorderImagesInput,
} from "@/lib/validators/product-images";

function revalidateProducts() {
  revalidatePath("/", "layout");
}

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number" &&
    typeof (value as File).type === "string"
  );
}

/**
 * OD-11. multipart fields: productId, files (repeated), alt (repeated), altBn (repeated), aligned
 * by index. Each file → webp full (≤1600px) + thumb (≤400px) in product-images/<productId>/.
 */
export async function uploadProductImages(
  formData: FormData,
): Promise<ActionResult<{ uploaded: number }>> {
  const files = formData.getAll("files");
  const alts = formData.getAll("alt").map(String);
  const altsBn = formData.getAll("altBn").map(String);

  const meta = uploadImagesMetaSchema.safeParse({
    productId: formData.get("productId"),
    alts: alts.map((alt, i) => ({ alt, altBn: altsBn[i] ?? "" })),
  });
  if (!meta.success) {
    const flat = z.flattenError(meta.error);
    const altError = flat.fieldErrors.alts?.[0];
    return fail(altError === "errors.imageCount" ? "errors.imageCount" : "errors.altRequired");
  }
  if (files.length === 0 || files.length > MAX_IMAGES_PER_UPLOAD) return fail("errors.imageCount");
  if (files.length !== meta.data.alts.length) return fail("errors.altRequired");
  for (const file of files) {
    if (!isFileLike(file) || !isAllowedImageType(file.type)) return fail("errors.imageType");
    if (file.size > MAX_IMAGE_BYTES) return fail("errors.imageTooLarge");
  }

  await requireOwner();
  const { productId } = meta.data;

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { id: true },
  });
  if (!product) return fail("errors.notFound");

  const [{ maxSort }] = await db
    .select({ maxSort: max(productImages.sortOrder) })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  let sortOrder = (maxSort ?? -1) + 1;

  let uploaded = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i] as File;
    const { alt, altBn } = meta.data.alts[i];
    const key = randomUUID();
    const path = `${productId}/${key}.webp`;
    const thumbPath = `${productId}/${key}-thumb.webp`;
    const written: string[] = [];
    try {
      const processed = await processProductImage(Buffer.from(await file.arrayBuffer()));
      await uploadStorageObject(PRODUCT_IMAGES_BUCKET, path, processed.full, "image/webp");
      written.push(path);
      await uploadStorageObject(PRODUCT_IMAGES_BUCKET, thumbPath, processed.thumb, "image/webp");
      written.push(thumbPath);
      await db.insert(productImages).values({
        productId,
        path,
        thumbPath,
        alt,
        altBn: altBn || null,
        width: processed.width,
        height: processed.height,
        sortOrder: sortOrder++,
      });
      uploaded++;
    } catch (error) {
      await removeStorageObjects(PRODUCT_IMAGES_BUCKET, written).catch(() => undefined);
      if (uploaded > 0) revalidateProducts();
      if (error instanceof StorageError) return fail("errors.storageFailed");
      return fail("errors.uploadFailed");
    }
  }

  revalidateProducts();
  return ok({ uploaded });
}

export async function updateProductImageAlt(
  id: string,
  input: ImageAltInput,
): Promise<ActionResult<ImageAltInput>> {
  const parsedId = productImageIdSchema.safeParse(id);
  const parsed = imageAltSchema.safeParse(input);
  if (!parsedId.success) return fail("errors.invalidInput");
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();

  const rows = await db
    .update(productImages)
    .set({ alt: parsed.data.alt, altBn: parsed.data.altBn || null })
    .where(eq(productImages.id, parsedId.data))
    .returning({ id: productImages.id });
  if (rows.length === 0) return fail("errors.notFound");

  revalidateProducts();
  return ok(parsed.data);
}

/** Removes both storage objects, then the row. */
export async function deleteProductImage(id: string): Promise<ActionResult> {
  const parsedId = productImageIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();

  const image = await db.query.productImages.findFirst({
    where: eq(productImages.id, parsedId.data),
    columns: { id: true, path: true, thumbPath: true },
  });
  if (!image) return fail("errors.notFound");

  try {
    await removeStorageObjects(PRODUCT_IMAGES_BUCKET, [image.path, image.thumbPath]);
  } catch (error) {
    if (error instanceof StorageError) return fail("errors.storageFailed");
    throw error;
  }
  await db.delete(productImages).where(eq(productImages.id, image.id));

  revalidateProducts();
  return ok();
}

/** `ids` must be exactly the product's images in the new order. */
export async function reorderProductImages(input: ReorderImagesInput): Promise<ActionResult> {
  const parsed = reorderImagesSchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();
  const { productId, ids } = parsed.data;

  const existing = await db
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  const existingIds = new Set(existing.map((r) => r.id));
  if (ids.length !== existingIds.size || !ids.every((id) => existingIds.has(id))) {
    return fail("errors.invalidInput");
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(productImages).set({ sortOrder: index }).where(eq(productImages.id, id));
    }
  });

  revalidateProducts();
  return ok();
}
