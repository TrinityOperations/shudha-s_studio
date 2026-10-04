import { z } from "zod";

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_UPLOAD = 10;

export const productImageIdSchema = z.uuid("errors.invalidInput");

export const imageAltSchema = z.object({
  alt: z.string().trim().min(1, "errors.altRequired").max(200, "errors.tooLong"),
  altBn: z.string().trim().max(200, "errors.tooLong"),
});
export type ImageAltInput = z.infer<typeof imageAltSchema>;

/** Metadata part of the multipart upload; the files themselves are checked in the action. */
export const uploadImagesMetaSchema = z.object({
  productId: z.uuid("errors.invalidInput"),
  alts: z
    .array(imageAltSchema)
    .min(1, "errors.imageCount")
    .max(MAX_IMAGES_PER_UPLOAD, "errors.imageCount"),
});

export const reorderImagesSchema = z.object({
  productId: z.uuid("errors.invalidInput"),
  ids: z.array(productImageIdSchema).min(1, "errors.invalidInput"),
});
export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;

export function isAllowedImageType(type: string): type is (typeof IMAGE_MIME_TYPES)[number] {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(type);
}
