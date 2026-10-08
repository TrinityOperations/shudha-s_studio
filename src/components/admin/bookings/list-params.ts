import type { BookingStatus } from "@/db/schema";

export const ADMIN_BOOKING_TABS = ["upcoming", "past", "cancelled"] as const;
export type AdminBookingTab = (typeof ADMIN_BOOKING_TABS)[number];
export const ADMIN_BOOKING_STATUSES: BookingStatus[] = ["new", "confirmed", "done", "cancelled"];

export type AdminBookingListParams = {
  tab: AdminBookingTab;
  status: BookingStatus | null;
  q: string;
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** URL params for the list; invalid values fall back to defaults. */
export function parseAdminBookingListParams(raw: Raw): AdminBookingListParams {
  const tab = first(raw.tab);
  const status = first(raw.status);
  const page = Number.parseInt(first(raw.page) ?? "1", 10);
  return {
    tab: (ADMIN_BOOKING_TABS as readonly string[]).includes(tab ?? "")
      ? (tab as AdminBookingTab)
      : "upcoming",
    status: ADMIN_BOOKING_STATUSES.includes(status as BookingStatus)
      ? (status as BookingStatus)
      : null,
    q: (first(raw.q) ?? "").trim().slice(0, 100),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export function adminBookingsHref(
  params: AdminBookingListParams,
  overrides: Partial<AdminBookingListParams> = {},
): string {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  if (merged.tab !== "upcoming") search.set("tab", merged.tab);
  if (merged.status) search.set("status", merged.status);
  if (merged.q) search.set("q", merged.q);
  if (merged.page > 1) search.set("page", String(merged.page));
  const query = search.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

export function adminCalendarHref(month: string, day?: string): string {
  const search = new URLSearchParams({ view: "calendar", month });
  if (day) search.set("day", day);
  return `/admin/bookings?${search.toString()}`;
}
