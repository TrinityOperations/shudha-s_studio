import { z } from "zod";
import { whatsappNumberSchema } from "./common";

// One schema per site_settings key. The row's jsonb value must satisfy its schema.

export const generalSettingsSchema = z.object({
  studioName: z.string().trim().min(1, "errors.required").max(80, "errors.tooLong"),
  tagline: z.string().trim().max(160, "errors.tooLong"),
  taglineBn: z.string().trim().max(160, "errors.tooLong"),
});

export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
export type GeneralSettingsInput = z.input<typeof generalSettingsSchema>;

export const defaultGeneralSettings: GeneralSettings = {
  studioName: "Shudha's Studio",
  tagline: "Be a reason for someone's happiness & more",
  taglineBn: "",
};

/** Studio contact details (PW-34, PW-47, OD-24). Slice #10 extends this key. */
export const contactSettingsSchema = z.object({
  /** Normalised WhatsApp number (digits, international) or "" when not set. */
  whatsappNumber: z.union([z.literal(""), whatsappNumberSchema]),
  email: z.union([z.literal(""), z.email("errors.email")]),
});

export type ContactSettings = z.infer<typeof contactSettingsSchema>;

export const defaultContactSettings: ContactSettings = { whatsappNumber: "", email: "" };
