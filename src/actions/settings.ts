"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import {
  generalSettingsSchema,
  type GeneralSettings,
  type GeneralSettingsInput,
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
