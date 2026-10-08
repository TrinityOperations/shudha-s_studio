"use server";

import { and, eq, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookings, type Booking } from "@/db/schema";
import { getBookingById } from "@/db/queries/bookings";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { sendBookingEmail, type BookingEmailKind } from "@/lib/booking/emails";
import { rescheduleBookingCore } from "@/lib/booking/reschedule-booking";

/**
 * OD-22, OD-23: the owner's booking actions. Every write is a conditional UPDATE on the allowed
 * statuses, so a stale page can't apply a change twice; anything else is errors.invalidStatus.
 * Emails go out with after() and never affect the result (DECISIONS.md 2026-10-08).
 */
const idSchema = z.uuid("errors.invalidInput");
const notesSchema = z.string().trim().max(2000, "errors.tooLong");
const slotStartSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "errors.slotUnavailable");

function revalidateBookings() {
  revalidatePath("/admin/bookings", "layout");
  revalidatePath("/admin");
  revalidatePath("/book");
}

function emailLater(kind: BookingEmailKind, booking: Booking) {
  after(async () => {
    try {
      const result = await sendBookingEmail(kind, booking);
      if (!result.ok)
        console.error(`[bookings] ${kind} email failed for ${booking.id}: ${result.error}`);
    } catch (error) {
      console.error(`[bookings] ${kind} email threw for ${booking.id}`, error);
    }
  });
}

/** new → confirmed */
export async function confirmBooking(
  id: string,
): Promise<ActionResult<{ status: Booking["status"] }>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();

  const [row] = await db
    .update(bookings)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(and(eq(bookings.id, parsed.data), eq(bookings.status, "new")))
    .returning();
  if (!row)
    return fail(
      (await getBookingById(parsed.data)) ? "errors.invalidStatus" : "errors.bookingNotFound",
    );

  emailLater("confirmed", row);
  revalidateBookings();
  return ok({ status: row.status });
}

/** new | confirmed, in the future → same status, new time. The manage token is not rotated. */
export async function rescheduleBooking(
  id: string,
  slotStart: string,
): Promise<ActionResult<{ startsAt: string }>> {
  const parsedId = idSchema.safeParse(id);
  const parsedStart = slotStartSchema.safeParse(slotStart);
  if (!parsedId.success) return fail("errors.invalidInput");
  if (!parsedStart.success) return fail("errors.slotUnavailable");
  await requireOwner();

  const existing = await getBookingById(parsedId.data);
  if (!existing) return fail("errors.bookingNotFound");
  if (existing.status !== "new" && existing.status !== "confirmed")
    return fail("errors.invalidStatus");
  if (existing.startsAt <= new Date()) return fail("errors.bookingPast");

  // The owner may move a booking inside the minimum notice; hours, horizon, blocks and conflicts still apply.
  const moved = await rescheduleBookingCore(existing.id, new Date(parsedStart.data), {
    ignoreMinNotice: true,
  });
  if (!moved.ok)
    return fail(moved.error === "errors.notFound" ? "errors.bookingNotFound" : moved.error);

  emailLater("rescheduled", moved.booking);
  revalidateBookings();
  return ok({ startsAt: moved.booking.startsAt.toISOString() });
}

/** new | confirmed → cancelled. Done is terminal. */
export async function cancelBooking(
  id: string,
): Promise<ActionResult<{ status: Booking["status"] }>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();

  const [row] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(eq(bookings.id, parsed.data), inArray(bookings.status, ["new", "confirmed"])))
    .returning();
  if (!row)
    return fail(
      (await getBookingById(parsed.data)) ? "errors.invalidStatus" : "errors.bookingNotFound",
    );

  emailLater("cancelled", row);
  revalidateBookings();
  return ok({ status: row.status });
}

/** new | confirmed, already started → done. No email. */
export async function markDone(id: string): Promise<ActionResult<{ status: Booking["status"] }>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();

  const [row] = await db
    .update(bookings)
    .set({ status: "done" })
    .where(
      and(
        eq(bookings.id, parsed.data),
        inArray(bookings.status, ["new", "confirmed"]),
        lt(bookings.startsAt, new Date()),
      ),
    )
    .returning();
  if (!row) {
    const existing = await getBookingById(parsed.data);
    if (!existing) return fail("errors.bookingNotFound");
    if (existing.status !== "new" && existing.status !== "confirmed")
      return fail("errors.invalidStatus");
    return fail("errors.bookingPast"); // not yet in the past
  }

  revalidateBookings();
  return ok({ status: row.status });
}

/** Any status. No email. */
export async function saveBookingNotes(
  id: string,
  notes: string,
): Promise<ActionResult<{ notes: string }>> {
  const parsedId = idSchema.safeParse(id);
  const parsedNotes = notesSchema.safeParse(notes);
  if (!parsedId.success) return fail("errors.invalidInput");
  if (!parsedNotes.success) return fail("errors.invalidInput", { notes: ["errors.tooLong"] });
  await requireOwner();

  const [row] = await db
    .update(bookings)
    .set({ privateNotes: parsedNotes.data || null })
    .where(eq(bookings.id, parsedId.data))
    .returning({ id: bookings.id });
  if (!row) return fail("errors.bookingNotFound");

  revalidateBookings();
  return ok({ notes: parsedNotes.data });
}
