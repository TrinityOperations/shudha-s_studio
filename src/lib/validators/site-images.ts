import { z } from "zod";
import { cropFocusSchema } from "./settings";

export const SITE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SITE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const HERO_VIDEO_TYPE = "video/mp4";
export const HERO_VIDEO_MAX_BYTES = 10 * 1024 * 1024;

/** Where an upload is going: a home page slot (any id) or a testimonial photo. */
export const siteImagePurposeSchema = z.enum(["home", "testimonial"]);

/** Multipart fields of uploadSiteImage besides the file. */
export const siteImageUploadMetaSchema = z.object({
  purpose: siteImagePurposeSchema,
  focus: cropFocusSchema.default({ x: 0.5, y: 0.5 }),
});

/** Prefixes inside `site-images` that the editor writes; cleanup never looks outside them. */
export const SITE_IMAGE_PREFIXES = ["home/", "testimonials/", "hero/"] as const;

export function isEditorManagedPath(path: string): boolean {
  return SITE_IMAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** Recorded after the browser uploaded the video straight to Storage (Netlify body limit). */
export const heroVideoRecordSchema = z.object({
  path: z
    .string()
    .trim()
    .regex(/^hero\/[0-9a-f-]{36}\.mp4$/, "errors.invalidInput"),
});
