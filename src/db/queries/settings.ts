import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import {
  aboutSettingsSchema,
  announcementSettingsSchema,
  contactSettingsSchema,
  defaultAboutSettings,
  defaultAnnouncementSettings,
  defaultContactSettings,
  defaultDeliverySettings,
  defaultGeneralSettings,
  defaultHomeContent,
  defaultHomeSettings,
  defaultLegalSettings,
  deliverySettingsSchema,
  defaultSeasonalBannerSettings,
  defaultSocialSettings,
  generalSettingsSchema,
  homeSettingsSchema,
  legalSettingsSchema,
  seasonalBannerSettingsSchema,
  socialSettingsSchema,
  type AboutSettings,
  type AnnouncementSettings,
  type ContactSettings,
  type DeliverySettings,
  type GeneralSettings,
  type HomeContent,
  type HomeSettings,
  type LegalSettings,
  type SeasonalBannerSettings,
  type SocialSettings,
} from "@/lib/validators/settings";

/** Studio name and taglines. Missing or malformed rows fall back to defaults. */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  const row = await db.query.siteSettings.findFirst({
    where: eq(siteSettings.key, "general"),
  });
  const stored = row && typeof row.value === "object" && row.value !== null ? row.value : {};
  const parsed = generalSettingsSchema.safeParse({ ...defaultGeneralSettings, ...stored });
  return parsed.success ? parsed.data : defaultGeneralSettings;
}

/** Studio WhatsApp number and email; empty strings when the owner has not set them. */
export async function getContactSettings(): Promise<ContactSettings> {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.key, "contact") });
  const stored = row && typeof row.value === "object" && row.value !== null ? row.value : {};
  const parsed = contactSettingsSchema.safeParse({ ...defaultContactSettings, ...stored });
  return parsed.success ? parsed.data : defaultContactSettings;
}

async function readSetting<T>(key: string, parse: (stored: unknown) => T, fallback: T): Promise<T> {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.key, key) });
  const stored = row && typeof row.value === "object" && row.value !== null ? row.value : {};
  try {
    return parse(stored);
  } catch {
    return fallback;
  }
}

/** The published home page photo choices (slice #9); a missing or malformed row gives the defaults. */
export async function getHomeSettings(): Promise<HomeContent> {
  return readSetting(
    "home",
    (stored) => {
      const parsed = homeSettingsSchema.safeParse(stored);
      return parsed.success ? parsed.data.published : defaultHomeContent;
    },
    defaultHomeContent,
  );
}

export async function getAnnouncementSettings(): Promise<AnnouncementSettings> {
  return readSetting(
    "announcement",
    (stored) => {
      const parsed = announcementSettingsSchema.safeParse(stored);
      return parsed.success ? parsed.data : defaultAnnouncementSettings;
    },
    defaultAnnouncementSettings,
  );
}

export async function getSeasonalBannerSettings(): Promise<SeasonalBannerSettings> {
  return readSetting(
    "seasonal_banner",
    (stored) => {
      const parsed = seasonalBannerSettingsSchema.safeParse(stored);
      return parsed.success ? parsed.data : defaultSeasonalBannerSettings;
    },
    defaultSeasonalBannerSettings,
  );
}

export async function getAboutSettings(): Promise<AboutSettings> {
  return readSetting(
    "about",
    (stored) => {
      const parsed = aboutSettingsSchema.safeParse(stored);
      return parsed.success ? parsed.data : defaultAboutSettings;
    },
    defaultAboutSettings,
  );
}

export async function getSocialSettings(): Promise<SocialSettings> {
  return readSetting(
    "social",
    (stored) => {
      const parsed = socialSettingsSchema.safeParse(stored);
      return parsed.success ? parsed.data : defaultSocialSettings;
    },
    defaultSocialSettings,
  );
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  return readSetting(
    "delivery",
    (stored) => {
      const parsed = deliverySettingsSchema.safeParse(stored);
      return parsed.success ? parsed.data : defaultDeliverySettings;
    },
    defaultDeliverySettings,
  );
}

export async function getLegalSettings(): Promise<LegalSettings> {
  return readSetting(
    "legal",
    (stored) => {
      const parsed = legalSettingsSchema.safeParse(stored);
      return parsed.success ? parsed.data : defaultLegalSettings;
    },
    defaultLegalSettings,
  );
}

/** Both copies of the home key, for the editor (slice #10). The public page uses getHomeSettings. */
export async function getHomeSettingsFull(): Promise<HomeSettings> {
  return readSetting(
    "home",
    (stored) => {
      const parsed = homeSettingsSchema.safeParse(stored);
      return parsed.success ? parsed.data : defaultHomeSettings;
    },
    defaultHomeSettings,
  );
}
