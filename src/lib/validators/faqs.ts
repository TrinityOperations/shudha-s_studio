import { z } from "zod";

/** PW-43, OD-30: one FAQ entry. */
export const faqSchema = z.object({
  question: z.string().trim().min(1, "errors.required").max(300, "errors.tooLong"),
  questionBn: z.string().trim().max(300, "errors.tooLong"),
  answer: z.string().trim().min(1, "errors.required").max(4000, "errors.tooLong"),
  answerBn: z.string().trim().max(4000, "errors.tooLong"),
  published: z.boolean(),
});
export type FaqValues = z.infer<typeof faqSchema>;
export const emptyFaq: FaqValues = {
  question: "",
  questionBn: "",
  answer: "",
  answerBn: "",
  published: true,
};

export const faqIdSchema = z.uuid("errors.invalidInput");
export const reorderFaqsSchema = z.object({
  ids: z.array(faqIdSchema).min(1, "errors.invalidInput"),
});
