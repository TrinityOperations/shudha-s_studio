"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { availabilityRules, blockedPeriods, bookingSettings } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { fromMelbourne } from "@/lib/time";
import {
  blockedPeriodIdSchema,
  blockedPeriodSchema,
  bookingSettingsSchema,
  weeklyHoursSchema,
  type BlockedPeriodInput,
  type BookingSettingsInput,
  type WeeklyHoursInput,
} from "@/lib/validators/availability";

function revalidateAvailability() {
  revalidatePath("/book");
  revalidatePath("/admin/availability");
}

/** OD-21: replaces the weekly rules with one row per active weekday. */
export async function saveWeeklyHours(input: WeeklyHoursInput): Promise<ActionResult> {
  const parsed = weeklyHoursSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();

  await db.transaction(async (tx) => {
    await tx.delete(availabilityRules);
    const rows = parsed.data.days.map((day) => ({
      weekday: day.weekday,
      startTime: day.startTime,
      endTime: day.endTime,
      active: day.active,
    }));
    if (rows.length) await tx.insert(availabilityRules).values(rows);
  });

  revalidateAvailability();
  return ok();
}

export async function saveBookingSettings(
  input: BookingSettingsInput,
): Promise<ActionResult<BookingSettingsInput>> {
  const parsed = bookingSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();

  await db
    .insert(bookingSettings)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({
      target: bookingSettings.id,
      set: { ...parsed.data, updatedAt: new Date() },
    });

  revalidateAvailability();
  return ok(parsed.data);
}

/** datetime-local strings are Melbourne wall-clock; stored as UTC instants. */
export async function addBlockedPeriod(
  input: BlockedPeriodInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = blockedPeriodSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();

  const [row] = await db
    .insert(blockedPeriods)
    .values({
      startsAt: fromMelbourne(new Date(parsed.data.startsAt)),
      endsAt: fromMelbourne(new Date(parsed.data.endsAt)),
      reason: parsed.data.reason || null,
    })
    .returning({ id: blockedPeriods.id });

  revalidateAvailability();
  return ok({ id: row.id });
}

export async function deleteBlockedPeriod(id: string): Promise<ActionResult> {
  const parsedId = blockedPeriodIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();

  const rows = await db
    .delete(blockedPeriods)
    .where(eq(blockedPeriods.id, parsedId.data))
    .returning({ id: blockedPeriods.id });
  if (rows.length === 0) return fail("errors.notFound");

  revalidateAvailability();
  return ok();
}
