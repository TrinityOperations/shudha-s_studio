"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { getGallerySubmission } from "@/db/queries/gallery";
import { gallerySubmissions } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/booking/client-ip";
import { checkRateLimit } from "@/lib/booking/rate-limit";
import { onGallerySubmitted } from "@/lib/gallery/hooks";
import {
  ensurePrivateCopy,
  GALLERY_PENDING_BUCKET,
  publishPhoto,
  removeAllFiles,
  removePublicFiles,
  storePendingPhoto,
} from "@/lib/gallery/storage";
import { removeStorageObjects, StorageError } from "@/lib/storage.server";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  GALLERY_IMAGE_MAX_BYTES,
  galleryFormSchema,
  gallerySubmissionIdSchema,
  isGalleryImageType,
} from "@/lib/validators/gallery";

function revalidateGallery() {
  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/admin/gallery");
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  );
}

/**
 * PW-71, PW-72: Turnstile → Zod → shared rate limiter (own bucket) → re-encode (EXIF gone) →
 * private bucket → pending row. Nothing touches the public bucket here. The owner is told in
 * after(); a failed insert removes the files.
 */
export async function submitGalleryPhoto(formData: FormData): Promise<ActionResult> {
  const ip = clientIpFromHeaders(await headers());
  if (
    !(await verifyTurnstile(field(formData, "turnstileToken"), ip === "unknown" ? undefined : ip))
  ) {
    return fail("errors.turnstile");
  }

  const parsed = galleryFormSchema.safeParse({
    firstName: field(formData, "firstName"),
    note: field(formData, "note"),
    consent: field(formData, "consent") === "true",
    turnstileToken: field(formData, "turnstileToken"),
  });
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  const file = formData.get("photo");
  if (!isFileLike(file) || file.size === 0) return fail("errors.photoRequired");
  if (!isGalleryImageType(file.type)) return fail("errors.imageType");
  if (file.size > GALLERY_IMAGE_MAX_BYTES) return fail("errors.imageTooLarge");

  if (!checkRateLimit(`gallery:${ip}`).allowed) return fail("errors.rateLimited");

  const id = randomUUID();
  let paths;
  try {
    paths = await storePendingPhoto(id, Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof StorageError) return fail("errors.storageFailed");
    console.error("[gallery] photo could not be processed", error);
    return fail("errors.imageType");
  }

  let row;
  try {
    [row] = await db
      .insert(gallerySubmissions)
      .values({
        id,
        imagePath: paths.full,
        thumbPath: paths.thumb,
        firstName: parsed.data.firstName || null,
        note: parsed.data.note || null,
        consentGiven: true,
        status: "pending",
      })
      .returning();
  } catch (error) {
    await removeStorageObjects(GALLERY_PENDING_BUCKET, [paths.full, paths.thumb]).catch(
      () => undefined,
    );
    console.error("[gallery] submission insert failed", error);
    return fail("errors.unknown");
  }

  const submission = row;
  after(() => onGallerySubmitted(submission));
  revalidatePath("/admin/gallery");
  return ok();
}

/** OD-32: pending or hidden → approved; the private pair is copied into a fresh public folder. */
export async function approveGallerySubmission(id: string): Promise<ActionResult> {
  const parsedId = gallerySubmissionIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();
  const row = await getGallerySubmission(parsedId.data);
  if (!row) return fail("errors.notFound");
  if (row.status !== "pending" && row.status !== "hidden") return fail("errors.invalidStatus");

  let publicPaths;
  try {
    publicPaths = await publishPhoto(row);
  } catch (error) {
    if (error instanceof StorageError) return fail("errors.storageFailed");
    throw error;
  }
  const updated = await db
    .update(gallerySubmissions)
    .set({
      publicImagePath: publicPaths.full,
      publicThumbPath: publicPaths.thumb,
      status: "approved",
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(gallerySubmissions.id, row.id),
        inArray(gallerySubmissions.status, ["pending", "hidden"]),
      ),
    )
    .returning({ id: gallerySubmissions.id });
  if (updated.length === 0) {
    await removePublicFiles({
      publicImagePath: publicPaths.full,
      publicThumbPath: publicPaths.thumb,
    });
    return fail("errors.invalidStatus");
  }
  // An earlier public copy (re-approval after hide never leaves one, but be safe).
  if (row.publicImagePath && row.publicImagePath !== publicPaths.full) await removePublicFiles(row);
  revalidateGallery();
  return ok();
}

/**
 * OD-32: pending or approved → hidden. Approved photos lose their public files (the bucket is
 * public), after making sure a private copy exists; pending ones just change status.
 */
export async function hideGallerySubmission(id: string): Promise<ActionResult> {
  const parsedId = gallerySubmissionIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();
  const row = await getGallerySubmission(parsedId.data);
  if (!row) return fail("errors.notFound");
  if (row.status !== "pending" && row.status !== "approved") return fail("errors.invalidStatus");

  let privatePaths = { full: row.imagePath, thumb: row.thumbPath };
  if (row.status === "approved") {
    try {
      privatePaths = await ensurePrivateCopy(row);
    } catch (error) {
      if (error instanceof StorageError) return fail("errors.storageFailed");
      throw error;
    }
  }
  const updated = await db
    .update(gallerySubmissions)
    .set({
      imagePath: privatePaths.full,
      thumbPath: privatePaths.thumb,
      publicImagePath: null,
      publicThumbPath: null,
      status: "hidden",
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(gallerySubmissions.id, row.id),
        inArray(gallerySubmissions.status, ["pending", "approved"]),
      ),
    )
    .returning({ id: gallerySubmissions.id });
  if (updated.length === 0) return fail("errors.invalidStatus");
  if (row.status === "approved") await removePublicFiles(row);
  revalidateGallery();
  return ok();
}

/** OD-32: any status → gone, files in both buckets included. */
export async function deleteGallerySubmission(id: string): Promise<ActionResult> {
  const parsedId = gallerySubmissionIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();
  const [row] = await db
    .delete(gallerySubmissions)
    .where(eq(gallerySubmissions.id, parsedId.data))
    .returning();
  if (!row) return fail("errors.notFound");
  await removeAllFiles(row);
  revalidateGallery();
  return ok();
}
