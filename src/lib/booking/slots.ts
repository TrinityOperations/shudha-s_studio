import { fromZonedTime } from "date-fns-tz";
import { formatMelbourne, MELBOURNE_TZ } from "@/lib/time";
import type { AvailabilityRuleValues, BookingSettingsValues } from "./defaults";

/** A bookable consultation window, as UTC instants. */
export type Slot = { startsAt: Date; endsAt: Date };
export type Interval = { startsAt: Date; endsAt: Date };

export type GenerateSlotsInput = {
  rules: AvailabilityRuleValues[];
  settings: Pick<
    BookingSettingsValues,
    "slotMinutes" | "bufferMinutes" | "horizonDays" | "minNoticeHours"
  >;
  blockedPeriods: Interval[];
  /** Non-cancelled bookings only; the caller filters status. */
  bookings: Interval[];
  from: Date;
  to: Date;
  now: Date;
  /** Owner reschedules skip the minimum notice; past slots are still hidden. */
  ignoreMinNotice?: boolean;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "yyyy-MM-dd" of the instant in Melbourne. */
export function melbourneDateOf(instant: Date): string {
  return formatMelbourne(instant, "yyyy-MM-dd");
}

/** Next civil date, independent of time zone. */
function nextDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a civil date. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Melbourne wall-clock ("yyyy-MM-dd" + "HH:mm") → UTC instant. */
export function melbourneWallClock(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time.slice(0, 5)}:00`, MELBOURNE_TZ);
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}

/**
 * Pure slot generation (PW-31, OD-21). Works in Melbourne wall-clock time: each rule's start and
 * end for a civil date are converted to instants, then the slots step `slotMinutes` in UTC, so
 * 10:00 stays 10:00 across a daylight-saving change and no slot stretches or shrinks on
 * changeover night. Drops slots before the minimum notice, past the horizon, inside a blocked
 * period, or within `bufferMinutes` of an existing booking.
 */
export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const {
    rules,
    settings,
    blockedPeriods,
    bookings,
    from,
    to,
    now,
    ignoreMinNotice = false,
  } = input;
  const noticeMs = ignoreMinNotice ? 0 : settings.minNoticeHours * HOUR;
  const earliest = new Date(Math.max(from.getTime(), now.getTime() + noticeMs));
  const latest = new Date(Math.min(to.getTime(), now.getTime() + settings.horizonDays * DAY));
  if (earliest >= latest) return [];

  const slotMs = settings.slotMinutes * MINUTE;
  const bufferMs = settings.bufferMinutes * MINUTE;
  const blocks: Interval[] = [
    ...blockedPeriods,
    ...bookings.map((b) => ({
      startsAt: new Date(b.startsAt.getTime() - bufferMs),
      endsAt: new Date(b.endsAt.getTime() + bufferMs),
    })),
  ];

  const found = new Map<number, Slot>();
  const lastDate = melbourneDateOf(latest);
  for (let date = melbourneDateOf(earliest); date <= lastDate; date = nextDate(date)) {
    const weekday = weekdayOf(date);
    for (const rule of rules) {
      if (!rule.active || rule.weekday !== weekday) continue;
      const ruleStart = melbourneWallClock(date, rule.startTime).getTime();
      const ruleEnd = melbourneWallClock(date, rule.endTime).getTime();
      for (let start = ruleStart; start + slotMs <= ruleEnd; start += slotMs) {
        const slot = { startsAt: new Date(start), endsAt: new Date(start + slotMs) };
        if (slot.startsAt < earliest || slot.endsAt > latest) continue;
        if (blocks.some((block) => overlaps(slot, block))) continue;
        found.set(start, slot);
      }
    }
  }

  return [...found.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Server-side re-check: is `startsAt` exactly one of the slots the rules currently generate? */
export function isSlotAvailable(
  startsAt: Date,
  input: Omit<GenerateSlotsInput, "from" | "to">,
): boolean {
  const from = new Date(startsAt.getTime() - DAY);
  const to = new Date(startsAt.getTime() + 2 * DAY);
  return generateSlots({ ...input, from, to }).some(
    (slot) => slot.startsAt.getTime() === startsAt.getTime(),
  );
}

export type SlotDay = { date: string; slots: Slot[] };

/** Groups slots by Melbourne civil date, in order. */
export function groupSlotsByMelbourneDate(slots: Slot[]): SlotDay[] {
  const days = new Map<string, Slot[]>();
  for (const slot of slots) {
    const date = melbourneDateOf(slot.startsAt);
    const list = days.get(date);
    if (list) list.push(slot);
    else days.set(date, [slot]);
  }
  return [...days.entries()].map(([date, daySlots]) => ({ date, slots: daySlots }));
}
