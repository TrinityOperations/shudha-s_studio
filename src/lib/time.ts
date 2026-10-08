import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import type { MessageKey, T } from "@/lib/i18n/t";

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

/**
 * A civil date ("yyyy-MM-dd", no time zone) as "10 Dec 2026". The month comes from
 * `common.month.N` so a Bengali page reads Bengali; the digits are left as typed.
 */
export function formatCivilDate(date: string, t: T): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return `${day} ${t(`common.month.${month - 1}` as MessageKey)} ${year}`;
}
