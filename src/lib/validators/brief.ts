import { z } from "zod";
import type { CustomOrderBrief } from "@/db/schema";
import { bookingFormSchema } from "./booking";
import { SLUG_PATTERN } from "./products";

// PW-50..PW-52: one schema per wizard step (the client gates "Next" with them) plus the combined
// schema the server re-validates. Every message is an i18n key.

export const BRIEF_LANGUAGES = ["en", "bn", "both"] as const;
export const ORDER_FOR = ["personal", "business"] as const;
export const MAX_WIZARD_PHOTOS = 3;
/** Per photo, after the browser-side resize, so three photos stay well under the 6 MB request cap. */
export const WIZARD_PHOTO_MAX_BYTES = 1.5 * 1024 * 1024;
export const WIZARD_STEP_COUNT = 7;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const shortText = (max: number) =>
  z.string().trim().min(1, "errors.required").max(max, "errors.tooLong");

/** Step 1: a category name, the preselected product's title, or free text. */
export const productTypeStepSchema = z.object({
  productType: shortText(80),
  /** "" unless the wizard started from a product page (PW-51). */
  productSlug: z
    .string()
    .trim()
    .max(80, "errors.tooLong")
    .refine((v) => v === "" || SLUG_PATTERN.test(v), "errors.invalidInput"),
});

/** Step 2 */
export const occasionStepSchema = z.object({ occasion: shortText(80) });

/** Step 3: the business name is required only for business orders and dropped otherwise. */
export const orderForStepSchema = z
  .object({
    orderFor: z.enum(ORDER_FOR, "errors.typeRequired"),
    businessName: z.string().trim().max(120, "errors.tooLong"),
  })
  .check((ctx) => {
    if (ctx.value.orderFor === "business" && ctx.value.businessName.length < 2) {
      ctx.issues.push({
        code: "custom",
        message: ctx.value.businessName.length === 0 ? "errors.required" : "errors.tooShort",
        path: ["businessName"],
        input: ctx.value.businessName,
      });
    }
  })
  .transform((v) => ({
    orderFor: v.orderFor,
    businessName: v.orderFor === "business" ? v.businessName : "",
  }));

/** Step 4: everything optional, so the step is always passable. */
export const detailsStepSchema = z.object({
  names: z.string().trim().max(500, "errors.tooLong"),
  dates: z.string().trim().max(200, "errors.tooLong"),
  message: z.string().trim().max(2000, "errors.tooLong"),
  language: z.enum(BRIEF_LANGUAGES, "errors.typeRequired"),
});

function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Step 6: `today` is the Melbourne civil date ("yyyy-MM-dd") so "today or later" is local. */
export function quantityStepSchema(today: string) {
  return z.object({
    quantity: z.coerce
      .number("errors.range")
      .int("errors.range")
      .min(1, "errors.range")
      .max(1000, "errors.range"),
    neededBy: z
      .string()
      .trim()
      .refine((v) => v === "" || isRealIsoDate(v), "errors.date")
      .refine((v) => v === "" || v >= today, "errors.datePast"),
  });
}

/** Step 7: the contact and slot fields of the booking form, unchanged (PW-30). */
export const bookStepSchema = bookingFormSchema.pick({
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  consultationType: true,
  slotStart: true,
  turnstileToken: true,
});
export type BookStepValues = z.input<typeof bookStepSchema>;
export type BookStepInput = z.output<typeof bookStepSchema>;

/** Steps 1–4 and 6 together: what becomes `bookings.brief` (photos are added after upload). */
export function briefSchema(today: string) {
  return z
    .object({
      ...productTypeStepSchema.shape,
      ...occasionStepSchema.shape,
      ...orderForStepSchema.in.shape,
      ...detailsStepSchema.shape,
      ...quantityStepSchema(today).shape,
    })
    .check((ctx) => {
      if (ctx.value.orderFor === "business" && ctx.value.businessName.length < 2) {
        ctx.issues.push({
          code: "custom",
          message: ctx.value.businessName.length === 0 ? "errors.required" : "errors.tooShort",
          path: ["businessName"],
          input: ctx.value.businessName,
        });
      }
    });
}
export type BriefInput = z.output<ReturnType<typeof briefSchema>>;

/** The whole wizard as the action receives it (flat FormData fields; photos are files). */
export function customOrderFormSchema(today: string) {
  return briefSchema(today).extend(bookStepSchema.shape);
}
export type CustomOrderFormInput = z.output<ReturnType<typeof customOrderFormSchema>>;

/** Pure: the structured brief for the database, blanks left out (PW-52). */
export function toBrief(input: BriefInput): CustomOrderBrief {
  const brief: CustomOrderBrief = {
    productType: input.productType,
    occasion: input.occasion,
    orderFor: input.orderFor,
    details: { language: input.language },
    quantity: input.quantity,
  };
  if (input.orderFor === "business") brief.businessName = input.businessName;
  if (input.names) brief.details!.names = input.names;
  if (input.dates) brief.details!.dates = input.dates;
  if (input.message) brief.details!.message = input.message;
  if (input.neededBy) brief.neededBy = input.neededBy;
  return brief;
}
