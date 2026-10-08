/**
 * Pure civil-date maths for the calendar view (OD-20). Dates are "yyyy-MM-dd" strings; the
 * caller passes today's Melbourne date, so no time zone work happens here. Weeks start Monday.
 */
export type MonthCell = { date: string; inMonth: boolean; isToday: boolean };

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function toDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-10" when valid, otherwise the month of `fallbackDate`. */
export function parseMonth(value: string | undefined, fallbackDate: string): string {
  return value && MONTH_PATTERN.test(value) ? value : fallbackDate.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return fromDate(d).slice(0, 7);
}

/** First day of the month, and the day after the last (for a half-open range). */
export function monthBounds(month: string): { start: string; end: string } {
  const [year, m] = month.split("-").map(Number);
  return {
    start: fromDate(new Date(Date.UTC(year, m - 1, 1))),
    end: fromDate(new Date(Date.UTC(year, m, 1))),
  };
}

/** Monday-first weeks covering the month, padded with the neighbouring months' days. */
export function monthGrid(month: string, today: string): MonthCell[][] {
  const { start, end } = monthBounds(month);
  const first = toDate(start);
  const mondayOffset = (first.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  const cursor = new Date(first);
  cursor.setUTCDate(cursor.getUTCDate() - mondayOffset);
  const last = toDate(end);
  const weeks: MonthCell[][] = [];
  while (cursor < last || weeks.length === 0) {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = fromDate(cursor);
      week.push({ date, inMonth: date >= start && date < end, isToday: date === today });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Monday-first weekday index (0 = Monday) for the headers. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
