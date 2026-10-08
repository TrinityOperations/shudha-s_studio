"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import {
  ADMIN_BOOKING_STATUSES,
  ADMIN_BOOKING_TABS,
  adminBookingsHref,
  adminCalendarHref,
  type AdminBookingListParams,
} from "./list-params";

type Props = { params: AdminBookingListParams; currentMonth: string };

/** OD-20: tabs, status chips and search, all reflected in the URL like the products list. */
export function BookingFilters({ params, currentMonth }: Props) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState(params.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pending search must not fire after the owner has navigated to a booking.
  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label={t("admin.bookings.title")} className="flex gap-1 rounded-lg border p-1">
          {ADMIN_BOOKING_TABS.map((tab) => (
            <Link
              key={tab}
              href={adminBookingsHref(params, { tab, status: null, page: 1 })}
              aria-current={params.tab === tab ? "page" : undefined}
              className={buttonVariants({
                variant: params.tab === tab ? "default" : "ghost",
                size: "sm",
              })}
            >
              {t(`admin.bookings.tabs.${tab}` as MessageKey)}
            </Link>
          ))}
        </nav>
        <Link
          href={adminCalendarHref(currentMonth)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("admin.bookings.view.calendar")}
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="bookings-q">{t("admin.bookings.filters.search")}</Label>
          <Input
            id="bookings-q"
            type="search"
            value={q}
            onChange={(event) => {
              const value = event.target.value;
              setQ(value);
              if (debounce.current) clearTimeout(debounce.current);
              debounce.current = setTimeout(
                () => router.replace(adminBookingsHref(params, { q: value.trim(), page: 1 })),
                300,
              );
            }}
          />
        </div>
        <div
          role="group"
          aria-label={t("admin.bookings.filters.status")}
          className="flex flex-wrap gap-1"
        >
          <Link
            href={adminBookingsHref(params, { status: null, page: 1 })}
            aria-current={params.status === null ? "true" : undefined}
            className={buttonVariants({
              variant: params.status === null ? "secondary" : "ghost",
              size: "sm",
            })}
          >
            {t("admin.bookings.filters.all")}
          </Link>
          {ADMIN_BOOKING_STATUSES.map((status) => (
            <Link
              key={status}
              href={adminBookingsHref(params, { status, page: 1 })}
              aria-current={params.status === status ? "true" : undefined}
              className={buttonVariants({
                variant: params.status === status ? "secondary" : "ghost",
                size: "sm",
              })}
            >
              {t(`admin.bookings.status.${status}` as MessageKey)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
