import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Store UTC, display Australia/Melbourne. */
export const MELBOURNE_TZ = "Australia/Melbourne";

/** Australian-style default: 4 Oct 2026, 2:30 pm */
export function formatMelbourne(
  date: Date | string | number,
  pattern = "d MMM yyyy, h:mm aaa",
): string {
  return formatInTimeZone(date, MELBOURNE_TZ, pattern);
}

/** UTC instant → wall-clock Date in Melbourne (for calendar maths). */
export function toMelbourne(date: Date): Date {
  return toZonedTime(date, MELBOURNE_TZ);
}

/** Melbourne wall-clock Date → UTC instant (for storing). */
export function fromMelbourne(date: Date): Date {
  return fromZonedTime(date, MELBOURNE_TZ);
}
