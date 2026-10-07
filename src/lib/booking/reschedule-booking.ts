import "server-only";
import { and, eq, gt, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Booking } from "@/db/schema";
import { getAvailabilityContext, getBookingSettings } from "@/db/queries/availability";
import { getBookingById } from "@/db/queries/bookings";
import { isExclusionViolation } from "./create-booking";
import { isSlotAvailable } from "./slots";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RescheduleBookingError =
  "errors.slotTaken" | "errors.slotUnavailable" | "errors.notFound";
export type RescheduleBookingResult =
  { ok: true; booking: Booking } | { ok: false; error: RescheduleBookingError };

class SlotTakenError extends Error {}

/**
 * PW-37 / OD-22: move a booking to a new start. Same defences as createBookingCore (regenerated
 * slot set, advisory lock, in-transaction re-check, exclusion constraint) but the booking's own
 * interval is ignored so it can move to an adjacent slot. Status is kept; the reminder flag is
 * cleared when the new start is more than 24 h away so the day-before reminder fires again.
 * Shared with slice #6 (owner reschedule).
 */
export async function rescheduleBookingCore(
  bookingId: string,
  newStart: Date,
  deps: { now?: Date } = {},
): Promise<RescheduleBookingResult> {
  const now = deps.now ?? new Date();
  const existing = await getBookingById(bookingId);
  if (!existing || existing.status === "cancelled") return { ok: false, error: "errors.notFound" };

  const settings = await getBookingSettings();
  const slotMs = settings.slotMinutes * 60_000;
  const bufferMs = settings.bufferMinutes * 60_000;
  const startsAt = new Date(newStart);
  const endsAt = new Date(startsAt.getTime() + slotMs);

  const context = await getAvailabilityContext(
    new Date(startsAt.getTime() - DAY_MS),
    new Date(endsAt.getTime() + 2 * DAY_MS),
  );
  const own = { startsAt: existing.startsAt.getTime(), endsAt: existing.endsAt.getTime() };
  const others = context.bookings.filter(
    (b) => !(b.startsAt.getTime() === own.startsAt && b.endsAt.getTime() === own.endsAt),
  );
  if (!isSlotAvailable(startsAt, { ...context, bookings: others, now })) {
    return { ok: false, error: "errors.slotUnavailable" };
  }

  const clearReminder = startsAt.getTime() - now.getTime() > DAY_MS;

  try {
    const booking = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('bookings'))`);
      const conflicts = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            ne(bookings.id, existing.id),
            ne(bookings.status, "cancelled"),
            lt(bookings.startsAt, new Date(endsAt.getTime() + bufferMs)),
            gt(bookings.endsAt, new Date(startsAt.getTime() - bufferMs)),
          ),
        )
        .limit(1);
      if (conflicts.length > 0) throw new SlotTakenError();
      const [row] = await tx
        .update(bookings)
        .set({
          startsAt,
          endsAt,
          ...(clearReminder ? { reminderSentAt: null } : {}),
        })
        .where(eq(bookings.id, existing.id))
        .returning();
      return row;
    });
    return { ok: true, booking };
  } catch (error) {
    if (error instanceof SlotTakenError || isExclusionViolation(error)) {
      return { ok: false, error: "errors.slotTaken" };
    }
    throw error;
  }
}
