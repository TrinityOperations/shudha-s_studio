import "server-only";
import { and, asc, gt, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { availabilityRules, blockedPeriods, bookings, type BlockedPeriod } from "@/db/schema";
import {
  DEFAULT_BOOKING_SETTINGS,
  type AvailabilityRuleValues,
  type BookingSettingsValues,
} from "@/lib/booking/defaults";
import { generateSlots, type Interval, type Slot } from "@/lib/booking/slots";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The singleton row, or the defaults when it has never been saved. */
export async function getBookingSettings(): Promise<BookingSettingsValues> {
  const row = await db.query.bookingSettings.findFirst();
  if (!row) return DEFAULT_BOOKING_SETTINGS;
  return {
    slotMinutes: row.slotMinutes,
    bufferMinutes: row.bufferMinutes,
    horizonDays: row.horizonDays,
    minNoticeHours: row.minNoticeHours,
    consultationTypes: row.consultationTypes,
  };
}

export type AvailabilityRuleRow = AvailabilityRuleValues & { id: string };

/** All rules, Sunday first. Times are "HH:mm". */
export async function listAvailabilityRules(): Promise<AvailabilityRuleRow[]> {
  const rows = await db
    .select()
    .from(availabilityRules)
    .orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime));
  return rows.map((row) => ({
    id: row.id,
    weekday: row.weekday,
    startTime: row.startTime.slice(0, 5),
    endTime: row.endTime.slice(0, 5),
    active: row.active,
  }));
}

/** Blocked periods that end after `from` (default: now), soonest first. */
export async function listBlockedPeriods(from = new Date()): Promise<BlockedPeriod[]> {
  return db
    .select()
    .from(blockedPeriods)
    .where(gt(blockedPeriods.endsAt, from))
    .orderBy(asc(blockedPeriods.startsAt));
}

/** Non-cancelled bookings overlapping [from, to), as plain intervals. */
export async function listBookedIntervals(from: Date, to: Date): Promise<Interval[]> {
  return db
    .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
    .from(bookings)
    .where(
      and(ne(bookings.status, "cancelled"), lt(bookings.startsAt, to), gt(bookings.endsAt, from)),
    );
}

export type AvailabilityContext = {
  settings: BookingSettingsValues;
  rules: AvailabilityRuleValues[];
  blockedPeriods: Interval[];
  bookings: Interval[];
};

/** Everything generateSlots needs for [from, to), bookings widened by the buffer. */
export async function getAvailabilityContext(from: Date, to: Date): Promise<AvailabilityContext> {
  const settings = await getBookingSettings();
  const bufferMs = settings.bufferMinutes * 60_000;
  const [rules, blocked, booked] = await Promise.all([
    listAvailabilityRules(),
    db
      .select({ startsAt: blockedPeriods.startsAt, endsAt: blockedPeriods.endsAt })
      .from(blockedPeriods)
      .where(and(lt(blockedPeriods.startsAt, to), gt(blockedPeriods.endsAt, from))),
    listBookedIntervals(new Date(from.getTime() - bufferMs), new Date(to.getTime() + bufferMs)),
  ]);
  return { settings, rules, blockedPeriods: blocked, bookings: booked };
}

/** PW-31: the slots a visitor may book right now, over the whole horizon. */
export async function listAvailableSlots(
  now = new Date(),
): Promise<{ settings: BookingSettingsValues; slots: Slot[] }> {
  const settings = await getBookingSettings();
  const to = new Date(now.getTime() + settings.horizonDays * DAY_MS);
  const context = await getAvailabilityContext(now, to);
  return { settings, slots: generateSlots({ ...context, from: now, to, now }) };
}
