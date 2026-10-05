import { z } from "zod";
import { consultationTypeEnum } from "@/db/schema";

export const MAX_BOOKING_IMAGE_BYTES = 10 * 1024 * 1024;
export const BOOKING_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const bookingSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  customerName: z.string().trim().min(1, "errors.required").max(100, "errors.tooLong"),
  customerPhone: z.string().trim().min(6, "errors.required").max(40, "errors.tooLong"),
  customerEmail: z.email("errors.email").max(254, "errors.tooLong"),
  productId: z.union([z.uuid(), z.literal("")]),
  message: z.string().trim().max(2000, "errors.tooLong"),
  consultationType: z.enum(consultationTypeEnum.enumValues),
  turnstileToken: z.string().min(1, "errors.turnstile"),
});

export type BookingInput = z.input<typeof bookingSchema>;
export type ValidBookingInput = z.output<typeof bookingSchema>;
