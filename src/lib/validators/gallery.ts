import { z } from "zod";
import { turnstileTokenSchema } from "./common";

// PW-71: the customer photo submission. The photo itself is checked in the action.

export const GALLERY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const GALLERY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const GALLERY_PAGE_SIZE = 24;
export const GALLERY_FIRST_NAME_MAX = 40;
export const GALLERY_NOTE_MAX = 200;

/** Trimmed, newlines collapsed to spaces, then length-checked. */
const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, "errors.tooLong"));

export const galleryFormSchema = z.object({
  firstName: singleLine(GALLERY_FIRST_NAME_MAX),
  note: singleLine(GALLERY_NOTE_MAX),
  consent: z.boolean().refine((value) => value === true, "errors.consentRequired"),
  turnstileToken: turnstileTokenSchema,
});
export type GalleryFormValues = z.input<typeof galleryFormSchema>;
export type GalleryFormInput = z.output<typeof galleryFormSchema>;
export const emptyGalleryForm: GalleryFormValues = {
  firstName: "",
  note: "",
  consent: false,
  turnstileToken: "",
};

export const gallerySubmissionIdSchema = z.uuid("errors.invalidInput");

export function isGalleryImageType(type: string): boolean {
  return (GALLERY_IMAGE_TYPES as readonly string[]).includes(type);
}
