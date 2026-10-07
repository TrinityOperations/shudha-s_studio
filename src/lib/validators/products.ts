import { z } from "zod";
import type { Personalisation, Product } from "@/db/schema";

/** Checklist of what customers can personalise (OD-14). Keys are stored; labels come from i18n
 *  ("personalisation.<key>"). Edit this one array after the client meeting. */
export const PERSONALISATION_OPTIONS = [
  "name",
  "date",
  "message",
  "photo",
  "language",
  "colour",
  "size",
  "logo",
] as const;
export type PersonalisationOption = (typeof PERSONALISATION_OPTIONS)[number];

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productIdSchema = z.uuid("errors.invalidInput");

export const productFormStatusSchema = z.enum(["draft", "published"]);

/** Starting price in whole AUD dollars (OD-18, PW-14). Blank means "no price shown". */
export const PRICE_FROM_MAX = 100000;
export const priceFromSchema = z
  .union([z.literal(""), z.number(), z.null(), z.undefined()], "errors.priceRange")
  .transform((value) => (value === "" || value === undefined ? null : value))
  .pipe(
    z
      .number("errors.priceRange")
      .int("errors.priceRange")
      .min(1, "errors.priceRange")
      .max(PRICE_FROM_MAX, "errors.priceRange")
      .nullable(),
  );

/** Hosts a product video link may point at (OD-19, PW-27). The URL is stored as given, never fetched. */
export const VIDEO_HOSTS = [
  "facebook.com",
  "fb.watch",
  "instagram.com",
  "youtube.com",
  "youtu.be",
] as const;
export type VideoHost = (typeof VIDEO_HOSTS)[number];

/** The allowed host a URL belongs to ("www.", "m." and similar prefixes ignored), or null. */
export function videoHost(url: string): VideoHost | null {
  let hostname: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
  return VIDEO_HOSTS.find((host) => hostname === host || hostname.endsWith(`.${host}`)) ?? null;
}

export const videoUrlSchema = z
  .union([z.string(), z.null(), z.undefined()], "errors.videoHost")
  .transform((value) => (value ?? "").trim() || null)
  .pipe(
    z.union(
      [
        z.null(),
        z
          .string()
          .max(500, "errors.tooLong")
          .refine((value) => videoHost(value) !== null, "errors.videoHost"),
      ],
      "errors.videoHost",
    ),
  );

/** Shared by the product form and the create/update actions. Status is ignored on create. */
export const productSchema = z.object({
  title: z.string().trim().min(1, "errors.required").max(120, "errors.tooLong"),
  titleBn: z.string().trim().max(120, "errors.tooLong"),
  /** Empty means "generate from the English title". */
  slug: z
    .string()
    .trim()
    .max(80, "errors.tooLong")
    .refine((v) => v === "" || SLUG_PATTERN.test(v), "errors.slugFormat"),
  description: z.string().trim().max(5000, "errors.tooLong"),
  descriptionBn: z.string().trim().max(5000, "errors.tooLong"),
  materialNotes: z.string().trim().max(1000, "errors.tooLong"),
  materialNotesBn: z.string().trim().max(1000, "errors.tooLong"),
  turnaroundDays: z
    .number("errors.wholeNumber")
    .int("errors.wholeNumber")
    .min(0, "errors.wholeNumber")
    .max(365, "errors.wholeNumber")
    .nullable(),
  priceFrom: priceFromSchema,
  videoUrl: videoUrlSchema,
  categoryId: z.uuid("errors.invalidInput").nullable(),
  occasionIds: z.array(z.uuid("errors.invalidInput")),
  tagIds: z.array(z.uuid("errors.invalidInput")),
  personalisationOptions: z.array(z.enum(PERSONALISATION_OPTIONS)),
  personalisationNotes: z.string().trim().max(1000, "errors.tooLong"),
  personalisationNotesBn: z.string().trim().max(1000, "errors.tooLong"),
  featured: z.boolean(),
  status: productFormStatusSchema,
});

/** What the form holds and the actions accept (price may be "", video may be null). */
export type ProductFormValues = z.input<typeof productSchema>;
/** Parsed values: price is number | null, video is a validated URL | null. */
export type ProductInput = z.output<typeof productSchema>;

export const bulkProductActionSchema = z.enum(["publish", "unpublish", "archive", "delete"]);
export type BulkProductAction = z.infer<typeof bulkProductActionSchema>;

export const bulkProductsSchema = z.object({
  ids: z.array(productIdSchema).min(1, "errors.invalidInput").max(500, "errors.invalidInput"),
  action: bulkProductActionSchema,
});
export type BulkProductsInput = z.infer<typeof bulkProductsSchema>;

export const emptyProductInput: ProductFormValues = {
  title: "",
  titleBn: "",
  slug: "",
  description: "",
  descriptionBn: "",
  materialNotes: "",
  materialNotesBn: "",
  turnaroundDays: null,
  priceFrom: null,
  videoUrl: "",
  categoryId: null,
  occasionIds: [],
  tagIds: [],
  personalisationOptions: [],
  personalisationNotes: "",
  personalisationNotesBn: "",
  featured: false,
  status: "draft",
};

/** Row → form values. Keeps unknown stored option keys out of the checklist. */
export function productInputFromRow(
  row: Product,
  occasionIds: string[],
  tagIds: string[],
): ProductFormValues {
  const known = new Set<string>(PERSONALISATION_OPTIONS);
  return {
    title: row.title,
    titleBn: row.titleBn ?? "",
    slug: row.slug,
    description: row.description,
    descriptionBn: row.descriptionBn ?? "",
    materialNotes: row.materialNotes ?? "",
    materialNotesBn: row.materialNotesBn ?? "",
    turnaroundDays: row.turnaroundDays ?? null,
    priceFrom: row.priceFrom ?? null,
    videoUrl: row.videoUrl ?? "",
    categoryId: row.categoryId,
    occasionIds,
    tagIds,
    personalisationOptions: row.personalisation.options.filter((o): o is PersonalisationOption =>
      known.has(o),
    ),
    personalisationNotes: row.personalisation.notes,
    personalisationNotesBn: row.personalisation.notesBn ?? "",
    featured: row.featured,
    status: row.status === "published" ? "published" : "draft",
  };
}

/** Form values → the column values shared by insert and update (slug/status/publishedAt set by the action). */
export function productColumnsFromInput(input: ProductInput) {
  const personalisation: Personalisation = {
    options: input.personalisationOptions,
    notes: input.personalisationNotes,
    ...(input.personalisationNotesBn ? { notesBn: input.personalisationNotesBn } : {}),
  };
  return {
    title: input.title,
    titleBn: input.titleBn || null,
    description: input.description,
    descriptionBn: input.descriptionBn || null,
    materialNotes: input.materialNotes || null,
    materialNotesBn: input.materialNotesBn || null,
    turnaroundDays: input.turnaroundDays,
    priceFrom: input.priceFrom,
    videoUrl: input.videoUrl,
    categoryId: input.categoryId,
    personalisation,
    featured: input.featured,
  };
}
