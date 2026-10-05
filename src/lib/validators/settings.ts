import { z } from "zod";

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
