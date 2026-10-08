import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { AdminBookingRow } from "@/db/queries/bookings";
import { melbourneDateOf } from "@/lib/booking/slots";
import { getT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/t";
import { formatMelbourne } from "@/lib/time";
import { BookingRows } from "./booking-list";
import { adminCalendarHref } from "./list-params";
import { addMonths, monthGrid, WEEKDAY_ORDER } from "./month-grid";

type Props = { month: string; day: string | null; today: string; bookings: AdminBookingRow[] };

/** OD-20 calendar: a plain grid of links, so it works at phone width and by keyboard without JS. */
export async function BookingCalendar({ month, day, today, bookings }: Props) {
  const t = await getT();
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const date = melbourneDateOf(new Date(b.startsAt));
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  const weeks = monthGrid(month, today);
  const monthLabel = formatMelbourne(new Date(`${month}-15T00:00:00Z`), "MMMM yyyy");
  const dayRows = day ? bookings.filter((b) => melbourneDateOf(new Date(b.startsAt)) === day) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={adminCalendarHref(addMonths(month, -1))}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          rel="prev"
        >
          ← <span className="sr-only">{t("admin.bookings.calendar.previous")}</span>
        </Link>
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <Link
          href={adminCalendarHref(addMonths(month, 1))}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          rel="next"
        >
          <span className="sr-only">{t("admin.bookings.calendar.next")}</span> →
        </Link>
      </div>

      <table
        className="w-full table-fixed border-separate border-spacing-1 text-center text-sm"
        aria-label={monthLabel}
      >
        <thead>
          <tr>
            {WEEKDAY_ORDER.map((weekday) => (
              <th
                key={weekday}
                scope="col"
                className="text-muted-foreground py-1 text-xs font-medium"
              >
                {t(`common.weekday.${weekday}` as MessageKey).slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].date}>
              {week.map((cell) => {
                const count = counts.get(cell.date) ?? 0;
                const selected = cell.date === day;
                return (
                  <td key={cell.date} className="p-0">
                    <Link
                      href={adminCalendarHref(month, cell.date)}
                      aria-current={selected ? "date" : undefined}
                      aria-label={`${formatMelbourne(new Date(`${cell.date}T12:00:00Z`), "EEEE d MMMM")}${
                        count
                          ? `, ${count === 1 ? t("admin.bookings.calendar.countOne") : t("admin.bookings.calendar.count", { count })}`
                          : ""
                      }`}
                      className={`focus-visible:ring-ring/50 flex min-h-12 flex-col items-center justify-center rounded-md border outline-none focus-visible:ring-3 sm:min-h-16 ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : cell.isToday
                            ? "border-primary"
                            : "hover:bg-muted border-transparent"
                      } ${cell.inMonth ? "" : "text-muted-foreground/60"}`}
                    >
                      <span className={cell.isToday ? "font-semibold" : ""}>
                        {Number(cell.date.slice(8))}
                      </span>
                      {count > 0 ? (
                        <span
                          className={`mt-0.5 rounded-full px-1.5 text-[11px] leading-4 ${selected ? "bg-primary-foreground/20" : "bg-primary text-primary-foreground"}`}
                        >
                          {count}
                        </span>
                      ) : (
                        <span className="mt-0.5 h-4" aria-hidden="true" />
                      )}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <section className="space-y-3" aria-live="polite">
        <h3 className="font-medium">
          {day
            ? t("admin.bookings.calendar.bookingsOn", {
                date: formatMelbourne(new Date(`${day}T12:00:00Z`), "EEEE d MMMM"),
              })
            : t("admin.bookings.calendar.pickDay")}
        </h3>
        {day ? (
          dayRows.length ? (
            <BookingRows rows={dayRows} />
          ) : (
            <p className="text-muted-foreground text-sm">{t("admin.bookings.calendar.none")}</p>
          )
        ) : null}
      </section>
    </div>
  );
}
