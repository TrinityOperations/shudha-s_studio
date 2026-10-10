"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { testimonials, type Testimonial } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { SITE_IMAGES_BUCKET } from "@/lib/home";
import { storeSiteImage } from "@/lib/site-images.server";
import { removeStorageObjects, StorageError } from "@/lib/storage.server";
import { SITE_IMAGE_MAX_BYTES, SITE_IMAGE_TYPES } from "@/lib/validators/site-images";
import {
  reorderTestimonialsSchema,
  testimonialIdSchema,
  testimonialSchema,
  type TestimonialValues,
} from "@/lib/validators/testimonials";

function revalidateTestimonials() {
  revalidatePath("/");
  revalidatePath("/admin/settings/testimonials");
}

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  );
}

/** OD-31: a new quote goes to the end of the list. */
export async function createTestimonial(
  input: TestimonialValues,
): Promise<ActionResult<Testimonial>> {
  const parsed = testimonialSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${testimonials.sortOrder}), -1) + 1` })
    .from(testimonials);
  const [row] = await db
    .insert(testimonials)
    .values({ ...toColumns(parsed.data), sortOrder: Number(next) })
    .returning();
  revalidateTestimonials();
  return ok(row);
}

export async function updateTestimonial(
  id: string,
  input: TestimonialValues,
): Promise<ActionResult<Testimonial>> {
  const parsedId = testimonialIdSchema.safeParse(id);
  const parsed = testimonialSchema.safeParse(input);
  if (!parsedId.success) return fail("errors.invalidInput");
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const [row] = await db
    .update(testimonials)
    .set({ ...toColumns(parsed.data), updatedAt: new Date() })
    .where(eq(testimonials.id, parsedId.data))
    .returning();
  if (!row) return fail("errors.notFound");
  revalidateTestimonials();
  return ok(row);
}

/** Deletes the row and its photo files. */
export async function deleteTestimonial(id: string): Promise<ActionResult> {
  const parsedId = testimonialIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();
  const [row] = await db
    .delete(testimonials)
    .where(eq(testimonials.id, parsedId.data))
    .returning({ photoPath: testimonials.photoPath });
  if (row?.photoPath) await removePhotoFiles(row.photoPath);
  revalidateTestimonials();
  return ok();
}

export async function reorderTestimonials(input: { ids: string[] }): Promise<ActionResult> {
  const parsed = reorderTestimonialsSchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();
  await db.transaction(async (tx) => {
    for (const [index, id] of parsed.data.ids.entries()) {
      await tx.update(testimonials).set({ sortOrder: index }).where(eq(testimonials.id, id));
    }
  });
  revalidateTestimonials();
  return ok();
}

/** multipart: id, file. Stores the photo in site-images/testimonials/ and replaces the old one. */
export async function setTestimonialPhoto(
  formData: FormData,
): Promise<ActionResult<{ photoPath: string }>> {
  const parsedId = testimonialIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return fail("errors.invalidInput");
  const file = formData.get("file");
  if (!isFileLike(file) || file.size === 0) return fail("errors.imageCount");
  if (!(SITE_IMAGE_TYPES as readonly string[]).includes(file.type)) return fail("errors.imageType");
  if (file.size > SITE_IMAGE_MAX_BYTES) return fail("errors.imageTooLarge");
  await requireOwner();

  const existing = await db.query.testimonials.findFirst({
    where: eq(testimonials.id, parsedId.data),
    columns: { id: true, photoPath: true },
  });
  if (!existing) return fail("errors.notFound");

  try {
    const stored = await storeSiteImage(file, "testimonials", { x: 0.5, y: 0.5 });
    await db
      .update(testimonials)
      .set({ photoPath: stored.path, updatedAt: new Date() })
      .where(eq(testimonials.id, existing.id));
    if (existing.photoPath) await removePhotoFiles(existing.photoPath);
    revalidateTestimonials();
    return ok({ photoPath: stored.path });
  } catch (error) {
    if (error instanceof StorageError) return fail("errors.storageFailed");
    return fail("errors.uploadFailed");
  }
}

export async function removeTestimonialPhoto(id: string): Promise<ActionResult> {
  const parsedId = testimonialIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();
  const [row] = await db
    .update(testimonials)
    .set({ photoPath: null, updatedAt: new Date() })
    .where(eq(testimonials.id, parsedId.data))
    .returning({
      photoPath: sql<
        string | null
      >`(select photo_path from testimonials where id = ${parsedId.data})`,
    });
  void row;
  revalidateTestimonials();
  return ok();
}

async function removePhotoFiles(photoPath: string) {
  const thumb = photoPath.replace(/\.webp$/, "-thumb.webp");
  await removeStorageObjects(SITE_IMAGES_BUCKET, [photoPath, thumb]).catch(() => undefined);
}

function toColumns(values: TestimonialValues) {
  return {
    authorName: values.authorName,
    quote: values.quote,
    quoteBn: values.quoteBn || null,
    visible: values.visible,
  };
}
