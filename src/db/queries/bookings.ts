import "server-only";
import { and, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Booking } from "@/db/schema";

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
  const { inArray, isNull, gte, lt } = await import("drizzle-orm");
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
