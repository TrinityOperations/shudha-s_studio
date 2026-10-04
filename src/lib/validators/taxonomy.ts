import { z } from "zod";

export const taxonomyKindSchema = z.enum(["category", "occasion", "tag"]);
export type TaxonomyKind = z.infer<typeof taxonomyKindSchema>;

/** Categories and occasions have a sort order; tags are alphabetical. */
export const sortableTaxonomyKindSchema = z.enum(["category", "occasion"]);
export type SortableTaxonomyKind = z.infer<typeof sortableTaxonomyKindSchema>;

export const taxonomyItemSchema = z.object({
  name: z.string().trim().min(1, "errors.required").max(60, "errors.tooLong"),
  nameBn: z.string().trim().max(60, "errors.tooLong"),
});
export type TaxonomyItemInput = z.infer<typeof taxonomyItemSchema>;

export const taxonomyIdSchema = z.uuid("errors.invalidInput");

export const reorderTaxonomySchema = z.object({
  kind: sortableTaxonomyKindSchema,
  ids: z.array(taxonomyIdSchema).min(1, "errors.invalidInput"),
});
export type ReorderTaxonomyInput = z.infer<typeof reorderTaxonomySchema>;
