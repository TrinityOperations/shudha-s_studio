"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import type { Tx } from "@/lib/products";
import {
  announcementSettingsSchema,
  contentSettingsSchema,
  generalSettingsSchema,
  seasonalBannerSettingsSchema,
  type AnnouncementSettings,
  type ContentSettingsInput,
  type ContentSettingsValues,
  type GeneralSettings,
  type GeneralSettingsInput,
  type SeasonalBannerSettings,
} from "@/lib/validators/settings";

/**
 * Reference admin action: validate → requireOwner → write → revalidatePath.
 * Thinnest slice of OD-30; the full content editor comes in its own issue.
 */
export async function updateGeneralSettings(
  input: GeneralSettingsInput,
): Promise<ActionResult<GeneralSettings>> {
  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }

  await requireOwner();

  await db
    .insert(siteSettings)
    .values({ key: "general", value: parsed.data })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: parsed.data, updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
  return ok(parsed.data);
}

type SettingValue = Record<string, unknown>;

async function upsertSetting(tx: Tx | typeof db, key: string, value: SettingValue) {
  await tx
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

/**
 * OD-30: the Content screen. One form, five keys (about, delivery, social, contact, legal),
 * written together so a half-saved screen never happens.
 */
export async function updateContentSettings(
  input: ContentSettingsValues,
): Promise<ActionResult<ContentSettingsInput>> {
  const parsed = contentSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const v = parsed.data;

  await db.transaction(async (tx) => {
    await upsertSetting(tx, "about", { story: v.story, storyBn: v.storyBn });
    await upsertSetting(tx, "delivery", { note: v.deliveryNote, noteBn: v.deliveryNoteBn });
    await upsertSetting(tx, "social", { instagram: v.instagram, facebook: v.facebook });
    await upsertSetting(tx, "contact", { whatsappNumber: v.whatsappNumber, email: v.email });
    await upsertSetting(tx, "legal", {
      privacy: v.privacy,
      privacyBn: v.privacyBn,
      terms: v.terms,
      termsBn: v.termsBn,
    });
  });

  revalidatePath("/", "layout");
  return ok(v);
}

/** OD-33: the announcement strip, on/off plus its messages. */
export async function updateAnnouncementSettings(
  input: unknown,
): Promise<ActionResult<AnnouncementSettings>> {
  const parsed = announcementSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  await upsertSetting(db, "announcement", parsed.data);
  revalidatePath("/", "layout");
  return ok(parsed.data);
}

/** The seasonal banner on the home page: on/off and its copy (the colour is slice #13's). */
export async function updateSeasonalBannerSettings(
  input: unknown,
): Promise<ActionResult<SeasonalBannerSettings>> {
  const parsed = seasonalBannerSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  await upsertSetting(db, "seasonal_banner", parsed.data);
  revalidatePath("/");
  return ok(parsed.data);
}
