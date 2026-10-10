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

export const SITE_IMAGE_BUCKETS = ["site-images", "product-images"] as const;

/**
 * A photo for a home page slot: full 1600px path and optional 400px thumbnail, in the public
 * `site-images` bucket or, when the owner picked one of her product photos, `product-images`.
 */
export const siteImageSlotSchema = z.object({
  path: z.string().trim().min(1),
  thumbPath: z.string().trim().min(1).nullable().default(null),
  focus: cropFocusSchema.default({ x: 0.5, y: 0.5 }),
  bucket: z.enum(SITE_IMAGE_BUCKETS).default("site-images"),
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
  /** OD-33: the strip can be switched off without losing the messages. */
  enabled: z.boolean().default(true),
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
export const defaultAnnouncementSettings: AnnouncementSettings = { enabled: true, messages: [] };

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

/** `site_settings` key `delivery` (PW-48): the delivery note on How it works, the FAQ and product pages. */
export const DEFAULT_DELIVERY_NOTE =
  "Pickup or postal delivery across Australia, arranged during your consultation.";
export const deliverySettingsSchema = z.object({
  note: z.string().trim().max(600, "errors.tooLong").default(DEFAULT_DELIVERY_NOTE),
  noteBn: z.string().trim().max(600, "errors.tooLong").default(""),
});
export type DeliverySettings = z.infer<typeof deliverySettingsSchema>;
export const defaultDeliverySettings: DeliverySettings = deliverySettingsSchema.parse({});

/** `site_settings` key `legal` (PW-45): privacy policy and terms, starter text until she edits them. */
export const DEFAULT_PRIVACY_TEXT = `We collect only what we need to make and deliver your gift: your name, your WhatsApp number and email, the details you give us for a consultation or a custom order, and any photos you upload for a design. We use them to talk with you about your order, to make it, and to send it. We never sell or share them with anyone except the services that run this website and deliver our emails.

Photos and personal details for an order are kept only as long as we need them for that order and for our records. You can ask us to delete them at any time by messaging us on WhatsApp or by email.

This website uses privacy-friendly analytics that do not identify you, and a small amount of browser storage for your wishlist and language choice.`;
export const DEFAULT_TERMS_TEXT = `Every piece is made to order. The final price is quoted during your free consultation, after we have agreed what you want, and nothing is made until you confirm it.

Personalised items cannot be returned or exchanged unless they arrive damaged or do not match what we agreed. If that happens, message us within seven days of receiving them and we will make it right.

Turnaround times are estimates and depend on the design and the time of year. Pickup is in Melbourne; postal delivery across Australia is arranged during the consultation.`;
export const legalSettingsSchema = z.object({
  privacy: z.string().trim().max(20000, "errors.tooLong").default(DEFAULT_PRIVACY_TEXT),
  privacyBn: z.string().trim().max(20000, "errors.tooLong").default(""),
  terms: z.string().trim().max(20000, "errors.tooLong").default(DEFAULT_TERMS_TEXT),
  termsBn: z.string().trim().max(20000, "errors.tooLong").default(""),
});
export type LegalSettings = z.infer<typeof legalSettingsSchema>;
export const defaultLegalSettings: LegalSettings = legalSettingsSchema.parse({});

/** "" or a normalised WhatsApp number, with the number's own message (a union would say "Invalid input"). */
export const optionalWhatsappNumberSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return "";
    const result = whatsappNumberSchema.safeParse(value);
    if (!result.success) {
      ctx.addIssue({ code: "custom", message: "errors.whatsappNumber" });
      return z.NEVER;
    }
    return result.data;
  });

/** "" or an absolute http(s) URL. */
export const optionalUrlSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\/\S+$/.test(value), "errors.invalidInput");

/**
 * OD-30: the Content screen edits five keys (about, delivery, social, contact, legal) in one form;
 * the action splits the values back into their keys.
 */
export const contentSettingsSchema = z.object({
  story: z.string().trim().max(4000, "errors.tooLong"),
  storyBn: z.string().trim().max(4000, "errors.tooLong"),
  deliveryNote: z.string().trim().max(600, "errors.tooLong"),
  deliveryNoteBn: z.string().trim().max(600, "errors.tooLong"),
  instagram: optionalUrlSchema,
  facebook: optionalUrlSchema,
  whatsappNumber: optionalWhatsappNumberSchema,
  email: z.union([z.literal(""), z.email("errors.email")]),
  privacy: z.string().trim().max(20000, "errors.tooLong"),
  privacyBn: z.string().trim().max(20000, "errors.tooLong"),
  terms: z.string().trim().max(20000, "errors.tooLong"),
  termsBn: z.string().trim().max(20000, "errors.tooLong"),
});
export type ContentSettingsValues = z.input<typeof contentSettingsSchema>;
export type ContentSettingsInput = z.output<typeof contentSettingsSchema>;

/** OD-34: a new password, typed twice. */
export const PASSWORD_MIN = 8;
export const accountPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN, "errors.passwordShort").max(72, "errors.tooLong"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "errors.passwordMismatch",
    path: ["confirm"],
  });
export type AccountPasswordValues = z.infer<typeof accountPasswordSchema>;
