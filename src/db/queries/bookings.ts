import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  productImages,
  products,
  type Booking,
  type BookingStatus,
  type CustomOrderBrief,
} from "@/db/schema";
import { getAvailabilityContext, getBookingSettings } from "@/db/queries/availability";
import { generateSlots, type Slot } from "@/lib/booking/slots";

/**
 * PW-37: the customer's secret link. Looks up by manage_token only (never by id) and returns
 * nothing for cancelled bookings or ones that have already started, so a token dies with its
 * appointment. #6 extends this file with the owner's reads.
 */
export async function getBookingByManageToken(
  token: string,
  now = new Date(),
): Promise<Booking | null> {
  const row = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.manageToken, token),
      ne(bookings.status, "cancelled"),
      gt(bookings.startsAt, now),
    ),
  });
  return row ?? null;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const row = await db.query.bookings.findFirst({ where: eq(bookings.id, id) });
  return row ?? null;
}

/** Title of the product a booking refers to, published or not (the owner still needs it). */
export async function getBookingProductTitle(
  productId: string | null,
): Promise<{ title: string; titleBn: string | null } | null> {
  if (!productId) return null;
  const row = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, productId),
    columns: { title: true, titleBn: true },
  });
  return row ?? null;
}

/** Reminder candidates: upcoming, not cancelled, not yet reminded, starting in [from, to). */
export async function listReminderCandidates(from: Date, to: Date): Promise<{ id: string }[]> {
  return db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["new", "confirmed"]),
        gte(bookings.startsAt, from),
        lt(bookings.startsAt, to),
        isNull(bookings.reminderSentAt),
      ),
    );
}

// ---------------------------------------------------------------------------
// Owner's reads (slice #6, OD-20, OD-23, OD-26)
// ---------------------------------------------------------------------------

/** Fields slice #7 adds to the brief; read defensively until the schema type carries them. */
export type BriefWithOrderFor = CustomOrderBrief & {
  orderFor?: "personal" | "business";
  businessName?: string;
};

export function isBusinessBrief(
  brief: unknown,
): brief is BriefWithOrderFor & { orderFor: "business" } {
  return (
    typeof brief === "object" &&
    brief !== null &&
    (brief as BriefWithOrderFor).orderFor === "business"
  );
}

export const ADMIN_BOOKINGS_PAGE_SIZE = 50;

export type AdminBookingTab = "upcoming" | "past" | "cancelled";

export type AdminBookingListFilters = {
  tab: AdminBookingTab;
  status: BookingStatus | null;
  q: string;
  page: number;
};

export type AdminBookingRow = {
  id: string;
  /** ISO, so rows are serialisable */
  startsAt: string;
  status: BookingStatus;
  consultationType: Booking["consultationType"];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productTitle: string | null;
  isBusiness: boolean;
  businessName: string | null;
};

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function tabWhere(tab: AdminBookingTab, now: Date): SQL {
  switch (tab) {
    case "upcoming":
      return and(gte(bookings.startsAt, now), inArray(bookings.status, ["new", "confirmed"]))!;
    case "past":
      return and(lt(bookings.startsAt, now), ne(bookings.status, "cancelled"))!;
    case "cancelled":
      return eq(bookings.status, "cancelled");
  }
}

function searchWhere(q: string): SQL | undefined {
  const text = q.trim();
  if (!text) return undefined;
  const pattern = `%${escapeLike(text)}%`;
  const digits = text.replace(/\D/g, "");
  const parts = [ilike(bookings.customerName, pattern), ilike(bookings.customerEmail, pattern)];
  if (digits.length >= 3) parts.push(ilike(bookings.customerPhone, `%${digits}%`));
  return or(...parts);
}

const rowColumns = {
  id: bookings.id,
  startsAt: bookings.startsAt,
  status: bookings.status,
  consultationType: bookings.consultationType,
  customerName: bookings.customerName,
  customerEmail: bookings.customerEmail,
  customerPhone: bookings.customerPhone,
  brief: bookings.brief,
  productTitle: products.title,
};

function toRow(row: {
  id: string;
  startsAt: Date;
  status: BookingStatus;
  consultationType: Booking["consultationType"];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  brief: unknown;
  productTitle: string | null;
}): AdminBookingRow {
  const business = isBusinessBrief(row.brief);
  return {
    id: row.id,
    startsAt: row.startsAt.toISOString(),
    status: row.status,
    consultationType: row.consultationType,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    productTitle: row.productTitle,
    isBusiness: business,
    businessName: business ? ((row.brief as BriefWithOrderFor).businessName ?? null) : null,
  };
}

export type AdminBookingPage = {
  items: AdminBookingRow[];
  total: number;
  page: number;
  pageCount: number;
};

/** OD-20 list: tab, optional status within the tab, search over name/email/phone, 50 per page. */
export async function listAdminBookings(
  filters: AdminBookingListFilters,
  now = new Date(),
): Promise<AdminBookingPage> {
  const conditions: SQL[] = [tabWhere(filters.tab, now)];
  if (filters.status) conditions.push(eq(bookings.status, filters.status));
  const search = searchWhere(filters.q);
  if (search) conditions.push(search);
  const where = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(bookings).where(where);
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_BOOKINGS_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);

  const rows = await db
    .select(rowColumns)
    .from(bookings)
    .leftJoin(products, eq(products.id, bookings.productId))
    .where(where)
    .orderBy(filters.tab === "upcoming" ? asc(bookings.startsAt) : desc(bookings.startsAt))
    .limit(ADMIN_BOOKINGS_PAGE_SIZE)
    .offset((page - 1) * ADMIN_BOOKINGS_PAGE_SIZE);

  return { items: rows.map(toRow), total, page, pageCount };
}

/** Non-cancelled bookings starting in [from, to), soonest first (calendar month). */
export async function listBookingsForMonth(from: Date, to: Date): Promise<AdminBookingRow[]> {
  const rows = await db
    .select(rowColumns)
    .from(bookings)
    .leftJoin(products, eq(products.id, bookings.productId))
    .where(
      and(
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, from),
        lt(bookings.startsAt, to),
      ),
    )
    .orderBy(asc(bookings.startsAt));
  return rows.map(toRow);
}

export async function countNewBookings(): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(bookings).where(eq(bookings.status, "new"));
  return n;
}

export async function listUpcomingBookings(
  limit: number,
  now = new Date(),
): Promise<AdminBookingRow[]> {
  const rows = await db
    .select(rowColumns)
    .from(bookings)
    .leftJoin(products, eq(products.id, bookings.productId))
    .where(tabWhere("upcoming", now))
    .orderBy(asc(bookings.startsAt))
    .limit(limit);
  return rows.map(toRow);
}

export type AdminProductRef = { id: string; title: string; slug: string; thumbPath: string | null };

export type AdminBookingDetail = {
  booking: Booking;
  product: AdminProductRef | null;
  wishlist: AdminProductRef[];
};

async function productRefs(ids: string[]): Promise<AdminProductRef[]> {
  if (ids.length === 0) return [];
  const rows = await db.query.products.findMany({
    where: inArray(products.id, ids),
    columns: { id: true, title: true, slug: true },
    with: {
      images: { columns: { thumbPath: true }, orderBy: [asc(productImages.sortOrder)], limit: 1 },
    },
  });
  const byId = new Map<string, AdminProductRef>(
    rows.map((r) => [
      r.id,
      { id: r.id, title: r.title, slug: r.slug, thumbPath: r.images[0]?.thumbPath ?? null },
    ]),
  );
  return ids.map((id) => byId.get(id)).filter((r): r is AdminProductRef => r !== undefined);
}

/** OD-23, OD-26: one booking with its product and the wishlist products (any status). */
export async function getAdminBookingDetail(id: string): Promise<AdminBookingDetail | null> {
  const booking = await getBookingById(id);
  if (!booking) return null;
  const [productList, wishlist] = await Promise.all([
    productRefs(booking.productId ? [booking.productId] : []),
    productRefs(booking.wishlistProductIds),
  ]);
  return { booking, product: productList[0] ?? null, wishlist };
}

/**
 * Slots the owner may move a booking to: the normal set with the booking's own interval removed
 * from the taken set, plus the current slot itself so it shows as selected (decision #6).
 */
export async function listRescheduleSlots(
  booking: Booking,
  now = new Date(),
  options: { ignoreMinNotice?: boolean } = {},
): Promise<Slot[]> {
  const settings = await getBookingSettings();
  const to = new Date(now.getTime() + settings.horizonDays * 24 * 60 * 60 * 1000);
  const context = await getAvailabilityContext(now, to);
  const own = { start: booking.startsAt.getTime(), end: booking.endsAt.getTime() };
  const others = context.bookings.filter(
    (b) => !(b.startsAt.getTime() === own.start && b.endsAt.getTime() === own.end),
  );
  const slots = generateSlots({
    ...context,
    bookings: others,
    from: now,
    to,
    now,
    ignoreMinNotice: options.ignoreMinNotice ?? false,
  });
  if (booking.startsAt > now && !slots.some((s) => s.startsAt.getTime() === own.start)) {
    slots.push({ startsAt: booking.startsAt, endsAt: booking.endsAt });
    slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }
  return slots;
}
