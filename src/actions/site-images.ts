"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { createHeroVideoUploadTarget, storeSiteImage } from "@/lib/site-images.server";
import { StorageError } from "@/lib/storage.server";
import type { SiteImageSlot } from "@/lib/validators/settings";
import {
  SITE_IMAGE_MAX_BYTES,
  SITE_IMAGE_TYPES,
  siteImageUploadMetaSchema,
} from "@/lib/validators/site-images";

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  );
}

/**
 * multipart: file, purpose ("home" | "testimonial"), focusX, focusY. The photo goes through the
 * sharp pipeline into site-images; the caller stores the returned slot where it belongs.
 */
export async function uploadSiteImage(formData: FormData): Promise<ActionResult<SiteImageSlot>> {
  const meta = siteImageUploadMetaSchema.safeParse({
    purpose: formData.get("purpose"),
    focus: { x: Number(formData.get("focusX") ?? 0.5), y: Number(formData.get("focusY") ?? 0.5) },
  });
  if (!meta.success) return fail("errors.invalidInput", z.flattenError(meta.error).fieldErrors);
  const file = formData.get("file");
  if (!isFileLike(file) || file.size === 0) return fail("errors.imageCount");
  if (!(SITE_IMAGE_TYPES as readonly string[]).includes(file.type)) return fail("errors.imageType");
  if (file.size > SITE_IMAGE_MAX_BYTES) return fail("errors.imageTooLarge");
  await requireOwner();

  try {
    const prefix = meta.data.purpose === "home" ? "home" : "testimonials";
    return ok(await storeSiteImage(file, prefix, meta.data.focus));
  } catch (error) {
    if (error instanceof StorageError) return fail("errors.storageFailed");
    console.error("[site-images] upload failed", error);
    return fail("errors.uploadFailed");
  }
}

/** Step 1 of the hero video: a signed URL the browser uploads to; step 2 is recordHeroVideo. */
export async function createHeroVideoUpload(): Promise<
  ActionResult<{ path: string; token: string; signedUrl: string }>
> {
  await requireOwner();
  try {
    return ok(await createHeroVideoUploadTarget());
  } catch (error) {
    console.error("[site-images] signed upload url failed", error);
    return fail("errors.storageFailed");
  }
}
