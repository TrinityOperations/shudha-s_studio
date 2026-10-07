"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getBookingByManageToken, getBookingProductTitle } from "@/db/queries/bookings";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { clientIpFromHeaders } from "@/lib/booking/client-ip";
import { sendBookingEmail } from "@/lib/booking/emails";
import { checkRateLimit } from "@/lib/booking/rate-limit";
import { rescheduleBookingCore } from "@/lib/booking/reschedule-booking";
import { bookingSummary, type BookingSummary } from "@/lib/booking/summary";

/**
 * PW-37: cancel or move a booking with the secret link. The token is the credential, so there
 * is no Turnstile here (DECISIONS.md 2026-10-08); a separate rate-limit bucket keeps these from
 * eating into, or being eaten by, a visitor's booking attempts. No revalidatePath here: /book is
 * dynamic, and a revalidation would re-render this page inside the action response with the
 * rotated token, i.e. as a 404.
 */
const tokenSchema = z.uuid("errors.manageLinkInvalid");
const rescheduleSchema = z.object({
  token: tokenSchema,
  slotStart: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "errors.slotUnavailable"),
});

async function manageRateLimited(): Promise<boolean> {
  const ip = clientIpFromHeaders(await headers());
  return !checkRateLimit(`manage:${ip}`).allowed;
}

export async function cancelBooking(
  token: string,
): Promise<ActionResult<{ summary: BookingSummary }>> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return fail("errors.manageLinkInvalid");
  if (await manageRateLimited()) return fail("errors.rateLimited");

  const booking = await getBookingByManageToken(parsed.data);
  if (!booking) return fail("errors.manageLinkInvalid");

  const [updated] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date(), manageToken: randomUUID() })
    .where(and(eq(bookings.id, booking.id), eq(bookings.manageToken, parsed.data)))
    .returning();
  if (!updated) return fail("errors.manageLinkInvalid"); // raced with another use of the link

  const [customer, owner] = await Promise.all([
    sendBookingEmail("cancelled", updated),
    sendBookingEmail("owner-cancelled", updated),
  ]);
  if (!customer.ok)
    console.error(`[booking] cancel email failed for ${updated.id}: ${customer.error}`);
  if (!owner.ok)
    console.error(`[booking] owner cancel email failed for ${updated.id}: ${owner.error}`);

  return ok({ summary: bookingSummary(updated, await getBookingProductTitle(updated.productId)) });
}

export async function rescheduleBooking(input: {
  token: string;
  slotStart: string;
}): Promise<ActionResult<{ summary: BookingSummary }>> {
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return fail(field === "slotStart" ? "errors.slotUnavailable" : "errors.manageLinkInvalid");
  }
  if (await manageRateLimited()) return fail("errors.rateLimited");

  const booking = await getBookingByManageToken(parsed.data.token);
  if (!booking) return fail("errors.manageLinkInvalid");

  const moved = await rescheduleBookingCore(booking.id, new Date(parsed.data.slotStart));
  if (!moved.ok)
    return fail(moved.error === "errors.notFound" ? "errors.manageLinkInvalid" : moved.error);

  // Fresh token: the link in the old email stops working, the new email carries the new one.
  const [updated] = await db
    .update(bookings)
    .set({ manageToken: randomUUID() })
    .where(eq(bookings.id, moved.booking.id))
    .returning();

  const [customer, owner] = await Promise.all([
    sendBookingEmail("rescheduled", updated),
    sendBookingEmail("owner-rescheduled", updated),
  ]);
  if (!customer.ok)
    console.error(`[booking] reschedule email failed for ${updated.id}: ${customer.error}`);
  if (!owner.ok)
    console.error(`[booking] owner reschedule email failed for ${updated.id}: ${owner.error}`);

  return ok({ summary: bookingSummary(updated, await getBookingProductTitle(updated.productId)) });
}
