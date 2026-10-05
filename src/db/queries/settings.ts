import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import {
  defaultGeneralSettings,
  generalSettingsSchema,
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
