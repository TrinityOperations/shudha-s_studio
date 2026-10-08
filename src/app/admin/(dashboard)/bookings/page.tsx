import type { Metadata } from "next";
import Link from "next/link";
import { BookingCalendar } from "@/components/admin/bookings/booking-calendar";
import { BookingFilters } from "@/components/admin/bookings/booking-filters";
import { BookingList } from "@/components/admin/bookings/booking-list";
import { parseAdminBookingListParams } from "@/components/admin/bookings/list-params";
import { monthBounds, parseMonth } from "@/components/admin/bookings/month-grid";
import { buttonVariants } from "@/components/ui/button";
import { listAdminBookings, listBookingsForMonth } from "@/db/queries/bookings";
import { melbourneDateOf, melbourneWallClock } from "@/lib/booking/slots";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.bookings.title") };
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** OD-20: list (default) or calendar, both URL-driven. */
export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  await requireOwner();
  const raw = await searchParams;
  const t = await getT();
  const now = new Date();
  const today = melbourneDateOf(now);

  if (first(raw.view) === "calendar") {
    const month = parseMonth(first(raw.month), today);
    const dayParam = first(raw.day);
    const day = dayParam && DAY_PATTERN.test(dayParam) ? dayParam : null;
    const { start, end } = monthBounds(month);
    const bookings = await listBookingsForMonth(
      melbourneWallClock(start, "00:00"),
      melbourneWallClock(end, "00:00"),
    );
    return (
      <section className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t("admin.bookings.title")}</h1>
          <Link
            href="/admin/bookings"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("admin.bookings.view.list")}
          </Link>
        </header>
        <BookingCalendar month={month} day={day} today={today} bookings={bookings} />
      </section>
    );
  }

  const params = parseAdminBookingListParams(raw);
  const page = await listAdminBookings(params, now);
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("admin.bookings.title")}</h1>
      <BookingFilters params={params} currentMonth={today.slice(0, 7)} />
      <BookingList page={page} params={params} />
    </section>
  );
}
