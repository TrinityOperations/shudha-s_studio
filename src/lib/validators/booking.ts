import { z } from "zod";
import { SLUG_PATTERN } from "./products";
import { turnstileTokenSchema, whatsappNumberSchema } from "./common";

export const consultationTypeSchema = z.enum(
  ["in_person", "phone", "video"],
  "errors.typeRequired",
);

/** The public booking form (PW-30, PW-33, PW-38). Files and the slot are re-checked in the action. */
export const bookingFormSchema = z.object({
  customerName: z.string().trim().min(1, "errors.required").max(120, "errors.tooLong"),
  /** Labelled "WhatsApp number"; stored normalised in customer_phone. */
  customerPhone: whatsappNumberSchema,
  customerEmail: z.email("errors.email").max(200, "errors.tooLong"),
  consultationType: consultationTypeSchema,
  /** "" means "not sure yet". */
  productSlug: z
    .string()
    .trim()
    .max(80, "errors.tooLong")
    .refine((v) => v === "" || SLUG_PATTERN.test(v), "errors.invalidInput"),
  /** ISO instant of the chosen slot start; the server recomputes availability. */
  slotStart: z
    .string()
    .min(1, "errors.slotRequired")
    .refine((v) => !Number.isNaN(Date.parse(v)), "errors.slotUnavailable"),
  message: z.string().trim().max(2000, "errors.tooLong"),
  turnstileToken: turnstileTokenSchema,
});

export type BookingFormValues = z.input<typeof bookingFormSchema>;
export type BookingFormInput = z.output<typeof bookingFormSchema>;

export const emptyBookingForm: BookingFormValues = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  consultationType: "in_person",
  productSlug: "",
  slotStart: "",
  message: "",
  turnstileToken: "",
};

export const REFERENCE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const REFERENCE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
