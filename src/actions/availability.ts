"use server";

import { fromZonedTime } from "date-fns-tz";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { availabilityRules, blockedPeriods, bookingSettings } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { MELBOURNE_TZ } from "@/lib/time";
import {
  availabilitySettingsSchema,
  blockedPeriodIdSchema,
  blockedPeriodSchema,
  type AvailabilitySettings,
  type AvailabilitySettingsInput,
  type BlockedPeriodInput,
} from "@/lib/validators/availability";

function revalidateAvailability() {
  revalidatePath("/admin/availability");
  revalidatePath("/book");
}

export async function updateAvailability(
  input: AvailabilitySettingsInput,
): Promise<ActionResult<AvailabilitySettings>> {
  await requireOwner();
  const parsed = availabilitySettingsSchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);

  await db.transaction(async (tx) => {
    await tx
      .insert(bookingSettings)
      .values({
        id: 1,
        slotMinutes: parsed.data.slotMinutes,
        bufferMinutes: parsed.data.bufferMinutes,
        horizonDays: parsed.data.horizonDays,
        minNoticeHours: parsed.data.minNoticeHours,
        consultationTypes: parsed.data.consultationTypes,
      })
      .onConflictDoUpdate({
        target: bookingSettings.id,
        set: {
          slotMinutes: parsed.data.slotMinutes,
          bufferMinutes: parsed.data.bufferMinutes,
          horizonDays: parsed.data.horizonDays,
          minNoticeHours: parsed.data.minNoticeHours,
          consultationTypes: parsed.data.consultationTypes,
          updatedAt: new Date(),
        },
      });
    await tx.delete(availabilityRules);
    await tx.insert(availabilityRules).values(
      parsed.data.rules.map((rule) => ({
        weekday: rule.weekday,
        active: rule.active,
        startTime: rule.startTime,
        endTime: rule.endTime,
      })),
    );
  });
  revalidateAvailability();
  return ok(parsed.data);
}

export async function addBlockedPeriod(input: BlockedPeriodInput): Promise<ActionResult> {
  await requireOwner();
  const parsed = blockedPeriodSchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  const startsAt = fromZonedTime(parsed.data.startsAt, MELBOURNE_TZ);
  const endsAt = fromZonedTime(parsed.data.endsAt, MELBOURNE_TZ);
  if (startsAt >= endsAt) return fail("errors.invalidInput");
  await db.insert(blockedPeriods).values({
    startsAt,
    endsAt,
    reason: parsed.data.reason || null,
  });
  revalidateAvailability();
  return ok();
}

export async function deleteBlockedPeriod(id: string): Promise<ActionResult> {
  await requireOwner();
  const parsed = blockedPeriodIdSchema.safeParse(id);
  if (!parsed.success) return fail("errors.invalidInput");
  const rows = await db
    .delete(blockedPeriods)
    .where(eq(blockedPeriods.id, parsed.data))
    .returning({ id: blockedPeriods.id });
  if (!rows.length) return fail("errors.notFound");
  revalidateAvailability();
  return ok();
}
