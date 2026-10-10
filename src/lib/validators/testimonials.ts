import { z } from "zod";

/** PW-06, OD-31: one customer quote. The photo is uploaded separately into site-images. */
export const testimonialSchema = z.object({
  authorName: z.string().trim().min(1, "errors.required").max(80, "errors.tooLong"),
  quote: z.string().trim().min(1, "errors.required").max(600, "errors.tooLong"),
  quoteBn: z.string().trim().max(600, "errors.tooLong"),
  visible: z.boolean(),
});
export type TestimonialValues = z.infer<typeof testimonialSchema>;
export const emptyTestimonial: TestimonialValues = {
  authorName: "",
  quote: "",
  quoteBn: "",
  visible: true,
};

export const testimonialIdSchema = z.uuid("errors.invalidInput");
export const reorderTestimonialsSchema = z.object({
  ids: z.array(testimonialIdSchema).min(1, "errors.invalidInput"),
});
