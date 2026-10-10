"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { productImages, products, siteSettings, tags } from "@/db/schema";
import { getHomeSettingsFull } from "@/db/queries/settings";
import { SIGNATURE_TAG } from "@/db/queries/home";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { processProductImage } from "@/lib/images";
import { slugBase, syncJoins } from "@/lib/products";
import {
  isAcceptableHeroVideo,
  removeUnreferencedSiteImages,
  statSiteObject,
} from "@/lib/site-images.server";
import { ensureUniqueSlug } from "@/lib/slug";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/storage";
import { removeStorageObjects, StorageError, uploadStorageObject } from "@/lib/storage.server";
import {
  applySlot,
  referencedSitePaths,
  setSlotSchema,
  type SetSlotInput,
} from "@/lib/validators/home-editor";
import {
  productColumnsFromInput,
  productSchema,
  type ProductFormValues,
} from "@/lib/validators/products";
import { homeSettingsSchema, type HomeContent, type HomeSettings } from "@/lib/validators/settings";
import {
  heroVideoRecordSchema,
  SITE_IMAGE_MAX_BYTES,
  SITE_IMAGE_TYPES,
} from "@/lib/validators/site-images";

const EDITOR_PATH = "/admin/home-editor";
/** Prefixes the editor writes; cleanup never looks anywhere else (testimonials are a table's). */
const HOME_PREFIXES = ["home/", "hero/"] as const;

function sameContent(a: HomeContent, b: HomeContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function writeHome(value: HomeSettings) {
  await db
    .insert(siteSettings)
    .values({ key: "home", value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

async function cleanup(home: HomeSettings) {
  const referenced = new Set([
    ...referencedSitePaths(home.draft),
    ...referencedSitePaths(home.published),
  ]);
  await removeUnreferencedSiteImages(HOME_PREFIXES, referenced).catch((error) =>
    console.error("[home-editor] cleanup failed", error),
  );
}

export type HomeEditorState = { dirty: boolean };

/** One slot change into the draft copy. The page re-renders from the database afterwards. */
export async function setHomeSlot(input: SetSlotInput): Promise<ActionResult<HomeEditorState>> {
  const parsed = setSlotSchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();
  const home = await getHomeSettingsFull();
  const draft = applySlot(home.draft, parsed.data);
  const next = homeSettingsSchema.parse({ ...home, draft });
  await writeHome(next);
  await cleanup(next);
  revalidatePath(EDITOR_PATH);
  return ok({ dirty: !sameContent(next.draft, next.published) });
}

/** Save: the draft becomes what visitors see. */
export async function publishHome(): Promise<ActionResult<HomeEditorState>> {
  await requireOwner();
  const home = await getHomeSettingsFull();
  const next: HomeSettings = { draft: home.draft, published: home.draft };
  await writeHome(next);
  await cleanup(next);
  revalidatePath("/", "layout");
  return ok({ dirty: false });
}

/** Discard: the draft goes back to what is published. */
export async function discardHomeDraft(): Promise<ActionResult<HomeEditorState>> {
  await requireOwner();
  const home = await getHomeSettingsFull();
  const next: HomeSettings = { draft: home.published, published: home.published };
  await writeHome(next);
  await cleanup(next);
  revalidatePath(EDITOR_PATH);
  return ok({ dirty: false });
}

/**
 * Step 2 of the hero video: the browser uploaded to the signed URL; confirm the object exists,
 * is an mp4 within the limit, then point the draft at it. The old video is removed by cleanup
 * once nothing references it (after Save).
 */
export async function recordHeroVideo(input: {
  path: string;
}): Promise<ActionResult<HomeEditorState>> {
  const parsed = heroVideoRecordSchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();
  const info = await statSiteObject(parsed.data.path);
  if (!isAcceptableHeroVideo(info)) {
    await removeStorageObjects("site-images", [parsed.data.path]).catch(() => undefined);
    return fail("errors.videoInvalid");
  }
  return setHomeSlot({
    slot: "heroVideo",
    value: {
      path: parsed.data.path,
      thumbPath: null,
      focus: { x: 0.5, y: 0.5 },
      bucket: "site-images",
    },
    shownProductIds: [],
  });
}

export type ProductPhotoOption = {
  productId: string;
  title: string;
  status: "draft" | "published";
  path: string;
  thumbPath: string;
  alt: string;
};

const searchSchema = z.string().trim().max(80).default("");

/** The picker's "From products" tab: photos of published and draft products (owner only). */
export async function searchProductPhotos(
  query: unknown,
): Promise<ActionResult<ProductPhotoOption[]>> {
  await requireOwner();
  const q = searchSchema.parse(query ?? "");
  const rows = await db.query.products.findMany({
    where: and(
      inArray(products.status, ["draft", "published"]),
      ...(q ? [ilike(products.title, `%${q.replace(/[\\%_]/g, "\\$&")}%`)] : []),
    ),
    columns: { id: true, title: true, status: true },
    with: {
      images: {
        columns: { path: true, thumbPath: true, alt: true },
        orderBy: [asc(productImages.sortOrder)],
      },
    },
    orderBy: (p, { desc }) => [desc(p.updatedAt)],
    limit: 40,
  });
  const options: ProductPhotoOption[] = [];
  for (const row of rows) {
    for (const image of row.images) {
      options.push({
        productId: row.id,
        title: row.title,
        status: row.status as "draft" | "published",
        path: image.path,
        thumbPath: image.thumbPath,
        alt: image.alt,
      });
    }
  }
  return ok(options);
}

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  );
}

export type ProductFromEditorResult = { id: string; path: string; thumbPath: string };

/**
 * "Upload as a new product": multipart `values` (the product form as JSON), `publish` ("1" to
 * publish, else draft), `signature` ("1" adds the signature tag) and `file`. Same validation and
 * image pipeline as the Products page; the photo becomes the product's first image.
 */
export async function createProductFromEditor(
  formData: FormData,
): Promise<ActionResult<ProductFromEditorResult>> {
  let values: ProductFormValues;
  try {
    values = JSON.parse(String(formData.get("values") ?? "{}")) as ProductFormValues;
  } catch {
    return fail("errors.invalidInput");
  }
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  const file = formData.get("file");
  if (!isFileLike(file) || file.size === 0) return fail("errors.imageCount");
  if (!(SITE_IMAGE_TYPES as readonly string[]).includes(file.type)) return fail("errors.imageType");
  if (file.size > SITE_IMAGE_MAX_BYTES) return fail("errors.imageTooLarge");
  await requireOwner();

  const publish = formData.get("publish") === "1";
  const addSignature = formData.get("signature") === "1";
  const data = parsed.data;

  let tagIds = data.tagIds;
  if (addSignature) {
    const [tag] = await db
      .insert(tags)
      .values({ slug: SIGNATURE_TAG, name: "Signature" })
      .onConflictDoUpdate({ target: tags.slug, set: { slug: SIGNATURE_TAG } })
      .returning({ id: tags.id });
    if (tag && !tagIds.includes(tag.id)) tagIds = [...tagIds, tag.id];
  }

  const written: string[] = [];
  try {
    const result = await db.transaction(async (tx) => {
      const slug = await ensureUniqueSlug(products, slugBase(data), undefined, tx);
      const [row] = await tx
        .insert(products)
        .values({
          ...productColumnsFromInput(data),
          slug,
          status: publish ? "published" : "draft",
          publishedAt: publish ? new Date() : null,
        })
        .returning({ id: products.id });
      await syncJoins(tx, row.id, data.occasionIds, tagIds);

      const key = randomUUID();
      const path = `${row.id}/${key}.webp`;
      const thumbPath = `${row.id}/${key}-thumb.webp`;
      const processed = await processProductImage(Buffer.from(await file.arrayBuffer()));
      await uploadStorageObject(PRODUCT_IMAGES_BUCKET, path, processed.full, "image/webp");
      written.push(path);
      await uploadStorageObject(PRODUCT_IMAGES_BUCKET, thumbPath, processed.thumb, "image/webp");
      written.push(thumbPath);
      await tx.insert(productImages).values({
        productId: row.id,
        path,
        thumbPath,
        alt: data.title,
        altBn: data.titleBn || null,
        width: processed.width,
        height: processed.height,
        sortOrder: 0,
      });
      return { id: row.id, path, thumbPath };
    });
    revalidatePath("/", "layout");
    return ok(result);
  } catch (error) {
    await removeStorageObjects(PRODUCT_IMAGES_BUCKET, written).catch(() => undefined);
    if (error instanceof StorageError) return fail("errors.storageFailed");
    console.error("[home-editor] product from editor failed", error);
    return fail("errors.uploadFailed");
  }
}

/** Product title lookup for tiles showing a product the picker just placed. */
export async function getProductTitle(id: string): Promise<ActionResult<{ title: string }>> {
  await requireOwner();
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail("errors.invalidInput");
  const row = await db.query.products.findFirst({
    where: eq(products.id, parsed.data),
    columns: { title: true },
  });
  return row ? ok({ title: row.title }) : fail("errors.notFound");
}
