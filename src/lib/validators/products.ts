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
  categoryId: z.uuid("errors.invalidInput").nullable(),
  occasionIds: z.array(z.uuid("errors.invalidInput")),
  tagIds: z.array(z.uuid("errors.invalidInput")),
  personalisationOptions: z.array(z.enum(PERSONALISATION_OPTIONS)),
  personalisationNotes: z.string().trim().max(1000, "errors.tooLong"),
  personalisationNotesBn: z.string().trim().max(1000, "errors.tooLong"),
  featured: z.boolean(),
  status: productFormStatusSchema,
});

export type ProductInput = z.infer<typeof productSchema>;

export const bulkProductActionSchema = z.enum(["publish", "unpublish", "archive", "delete"]);
export type BulkProductAction = z.infer<typeof bulkProductActionSchema>;

export const bulkProductsSchema = z.object({
  ids: z.array(productIdSchema).min(1, "errors.invalidInput").max(500, "errors.invalidInput"),
  action: bulkProductActionSchema,
});
export type BulkProductsInput = z.infer<typeof bulkProductsSchema>;

export const emptyProductInput: ProductInput = {
  title: "",
  titleBn: "",
  slug: "",
  description: "",
  descriptionBn: "",
  materialNotes: "",
  materialNotesBn: "",
  turnaroundDays: null,
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
): ProductInput {
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
    categoryId: input.categoryId,
    personalisation,
    featured: input.featured,
  };
}
