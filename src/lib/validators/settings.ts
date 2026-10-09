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

// ---------------------------------------------------------------------------
// Home page and site content keys (slice #9 reads them; slice #10 builds the editors).
// Every field has a default, so a missing or partial row still renders the page.
// ---------------------------------------------------------------------------

/** Where the interesting part of a photo is, as fractions; becomes `object-position`. */
export const cropFocusSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

/** A photo in the public `site-images` bucket (full 1600px path, optional 400px thumbnail). */
export const siteImageSlotSchema = z.object({
  path: z.string().trim().min(1),
  thumbPath: z.string().trim().min(1).nullable().default(null),
  focus: cropFocusSchema.default({ x: 0.5, y: 0.5 }),
});
export type SiteImageSlot = z.infer<typeof siteImageSlotSchema>;

export const homeProductSlotSchema = z.object({ productId: z.uuid() });

export const HOME_COLLAGE_SLOTS = 10;
export const HOME_SIGNATURE_PICKS_MAX = 4;
export const HOME_NEW_PICKS_MAX = 8;

/** One copy of the home page's photo choices (docs/design.md, "Data each section reads"). */
export const homeContentSchema = z.object({
  /** Path inside `site-images`; no video until the owner uploads one. */
  heroVideoPath: z.string().trim().min(1).nullable().default(null),
  heroPoster: siteImageSlotSchema.nullable().default(null),
  signaturePanel: siteImageSlotSchema.nullable().default(null),
  madeForYou: siteImageSlotSchema.nullable().default(null),
  portrait: siteImageSlotSchema.nullable().default(null),
  /** Index = collage slot (10 on desktop, the first 7 on phones) */
  collage: z.array(siteImageSlotSchema.nullable()).max(HOME_COLLAGE_SLOTS).default([]),
  /** Occasion slug → the tile's photo, or a product whose first photo to use */
  occasionTiles: z
    .record(z.string(), z.union([siteImageSlotSchema, homeProductSlotSchema]))
    .default({}),
  signaturePicks: z.array(z.uuid()).max(HOME_SIGNATURE_PICKS_MAX).default([]),
  newPicks: z.array(z.uuid()).max(HOME_NEW_PICKS_MAX).default([]),
});
export type HomeContent = z.infer<typeof homeContentSchema>;

/** `site_settings` key `home`: the editor works on `draft`; the page shows `published`. */
export const homeSettingsSchema = z.object({
  draft: homeContentSchema.prefault({}),
  published: homeContentSchema.prefault({}),
});
export type HomeSettings = z.infer<typeof homeSettingsSchema>;

export const defaultHomeContent: HomeContent = homeContentSchema.parse({});
export const defaultHomeSettings: HomeSettings = homeSettingsSchema.parse({});

/** `site_settings` key `announcement` (OD-33): messages cross-fade in the strip above the header. */
export const announcementSettingsSchema = z.object({
  messages: z
    .array(
      z.object({
        text: z.string().trim().max(200, "errors.tooLong"),
        textBn: z.string().trim().max(200, "errors.tooLong").default(""),
        linkLabel: z.string().trim().max(60, "errors.tooLong").default(""),
        linkLabelBn: z.string().trim().max(60, "errors.tooLong").default(""),
        href: z.string().trim().max(500, "errors.tooLong").default(""),
      }),
    )
    .max(5)
    .default([]),
});
export type AnnouncementSettings = z.infer<typeof announcementSettingsSchema>;
export const defaultAnnouncementSettings: AnnouncementSettings = { messages: [] };

/** `site_settings` key `seasonal_banner`: the big tag on the home page; off until the owner turns it on. */
export const seasonalBannerSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  label: z.string().trim().max(60, "errors.tooLong").default("Eid collection"),
  labelBn: z.string().trim().max(60, "errors.tooLong").default(""),
  headline: z
    .string()
    .trim()
    .max(160, "errors.tooLong")
    .default("Order early for Eid gifts. Consultations fill up in the last two weeks."),
  headlineBn: z.string().trim().max(160, "errors.tooLong").default(""),
  buttonLabel: z.string().trim().max(40, "errors.tooLong").default("Book a consultation"),
  buttonLabelBn: z.string().trim().max(40, "errors.tooLong").default(""),
  href: z.string().trim().max(500, "errors.tooLong").default("/book"),
});
export type SeasonalBannerSettings = z.infer<typeof seasonalBannerSettingsSchema>;
export const defaultSeasonalBannerSettings: SeasonalBannerSettings =
  seasonalBannerSettingsSchema.parse({});

/** `site_settings` key `about` (PW-05): her story; empty until she sends it. */
export const aboutSettingsSchema = z.object({
  story: z.string().trim().max(4000, "errors.tooLong").default(""),
  storyBn: z.string().trim().max(4000, "errors.tooLong").default(""),
});
export type AboutSettings = z.infer<typeof aboutSettingsSchema>;
export const defaultAboutSettings: AboutSettings = { story: "", storyBn: "" };

/** `site_settings` key `social` (PW-07): full profile URLs, or "" when not set. */
export const socialSettingsSchema = z.object({
  instagram: z.union([z.literal(""), z.url("errors.invalidInput")]).default(""),
  facebook: z.union([z.literal(""), z.url("errors.invalidInput")]).default(""),
});
export type SocialSettings = z.infer<typeof socialSettingsSchema>;
export const defaultSocialSettings: SocialSettings = { instagram: "", facebook: "" };
