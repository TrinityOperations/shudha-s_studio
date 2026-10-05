import { addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { MELBOURNE_TZ } from "@/lib/time";

export type AvailabilityRule = {
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type BusyPeriod = { startsAt: Date; endsAt: Date };

export type SlotSettings = {
  slotMinutes: number;
  bufferMinutes: number;
  horizonDays: number;
  minNoticeHours: number;
};

export type BookingSlot = {
  startsAt: string;
  endsAt: string;
  localDate: string;
  localTime: string;
};

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function timeValue(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function addLocalDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function overlaps(start: Date, end: Date, period: BusyPeriod) {
  return start < period.endsAt && end > period.startsAt;
}

/** Pure Melbourne-wall-time slot generation. Invalid DST wall times are discarded by round-trip. */
export function generateSlots({
  now,
  settings,
  rules,
  blockedPeriods = [],
  bookings = [],
}: {
  now: Date;
  settings: SlotSettings;
  rules: AvailabilityRule[];
  blockedPeriods?: BusyPeriod[];
  bookings?: BusyPeriod[];
}): BookingSlot[] {
  const firstDate = formatInTimeZone(now, MELBOURNE_TZ, "yyyy-MM-dd");
  const noticeBoundary = addMinutes(now, settings.minNoticeHours * 60);
  const lastDate = addLocalDays(firstDate, settings.horizonDays);
  const slots: BookingSlot[] = [];

  for (let dayOffset = 0; dayOffset <= settings.horizonDays; dayOffset++) {
    const localDate = addLocalDays(firstDate, dayOffset);
    if (localDate > lastDate) break;
    const dayRules = rules.filter((rule) => rule.active && rule.weekday === weekday(localDate));

    for (const rule of dayRules) {
      const start = minutes(rule.startTime);
      const end = minutes(rule.endTime);
      const step = settings.slotMinutes + settings.bufferMinutes;
      for (let cursor = start; cursor + settings.slotMinutes <= end; cursor += step) {
        const localTime = timeValue(cursor);
        const wallClock = `${localDate}T${localTime}:00`;
        const startsAt = fromZonedTime(wallClock, MELBOURNE_TZ);
        if (formatInTimeZone(startsAt, MELBOURNE_TZ, "yyyy-MM-dd'T'HH:mm:ss") !== wallClock)
          continue;
        const endsAt = addMinutes(startsAt, settings.slotMinutes);
        if (startsAt < noticeBoundary) continue;
        if (blockedPeriods.some((period) => overlaps(startsAt, endsAt, period))) continue;
        if (
          bookings.some((period) =>
            overlaps(startsAt, endsAt, {
              startsAt: addMinutes(period.startsAt, -settings.bufferMinutes),
              endsAt: addMinutes(period.endsAt, settings.bufferMinutes),
            }),
          )
        )
          continue;
        slots.push({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          localDate,
          localTime,
        });
      }
    }
  }
  return slots;
}

export function findAvailableSlot(slots: BookingSlot[], startsAt: string) {
  return slots.find((slot) => slot.startsAt === startsAt);
}
