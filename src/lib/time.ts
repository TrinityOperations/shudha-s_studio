import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Locale } from "@/lib/i18n/locale";
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

// ---------------------------------------------------------------------------
// Visitor-facing dates in the visitor's language (slice #11). English keeps the date-fns
// patterns used since #4; Bengali uses Intl with bn-BD (Bengali digits and month names) in the
// Melbourne zone. Prices never come through here: they keep Latin digits.
// ---------------------------------------------------------------------------

export type DateStyle =
  /** "Wednesday 15 July 2026" */
  | "long"
  /** "Wednesday 15 July" (no year) */
  | "weekday"
  /** "Wed 15 Jul" */
  | "short"
  /** "15 Jul 2026" */
  | "date"
  /** "11:00 am" */
  | "time"
  /** "15 Jul 2026, 11:00 am" */
  | "datetime";

const EN_PATTERNS: Record<DateStyle, string> = {
  long: "EEEE d MMMM yyyy",
  weekday: "EEEE d MMMM",
  short: "EEE d MMM",
  date: "d MMM yyyy",
  time: "h:mm aaa",
  datetime: "d MMM yyyy, h:mm aaa",
};

const BN_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  weekday: { weekday: "long", day: "numeric", month: "long" },
  short: { weekday: "short", day: "numeric", month: "short" },
  date: { day: "numeric", month: "short", year: "numeric" },
  time: { hour: "numeric", minute: "2-digit" },
  datetime: { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" },
};

const formatters = new Map<DateStyle, Intl.DateTimeFormat>();
function bnFormatter(style: DateStyle): Intl.DateTimeFormat {
  let formatter = formatters.get(style);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("bn-BD", {
      ...BN_OPTIONS[style],
      timeZone: MELBOURNE_TZ,
      numberingSystem: "beng",
    });
    formatters.set(style, formatter);
  }
  return formatter;
}

/** A Melbourne date or time in the given language. */
export function formatMelbourneFor(
  locale: Locale,
  date: Date | string | number,
  style: DateStyle,
): string {
  if (locale === "bn") return bnFormatter(style).format(new Date(date));
  return formatMelbourne(date, EN_PATTERNS[style]);
}

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Latin digits → Bengali digits (for civil dates and counts, never for prices). */
export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]);
}

/**
 * A civil date ("yyyy-MM-dd", no time zone) as "10 Dec 2026", or "১০ ডিসে ২০২৬" when `t` is the
 * Bengali dictionary. The month comes from `common.month.N`.
 */
export function formatCivilDate(date: string, t: T, locale: Locale = "en"): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const text = `${day} ${t(`common.month.${month - 1}` as MessageKey)} ${year}`;
  return locale === "bn" ? toBengaliDigits(text) : text;
}
