import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import {
  contactSettingsSchema,
  defaultContactSettings,
  defaultGeneralSettings,
  generalSettingsSchema,
  type ContactSettings,
  type GeneralSettings,
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
