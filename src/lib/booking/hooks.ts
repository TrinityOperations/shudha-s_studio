import type { Booking } from "@/db/schema";
import { sendBookingEmail } from "./emails";

/**
 * PW-34, PW-35: after a public booking is committed, email the customer (in their language) and
 * the owner. createBookingCore already guards this call, and nothing here throws either: a mail
 * problem is logged and can never undo a booking.
 */
export async function onBookingCreated(booking: Booking): Promise<void> {
  try {
    const [customer, owner] = await Promise.all([
      sendBookingEmail("received", booking),
      sendBookingEmail("owner-new", booking),
    ]);
    if (!customer.ok)
      console.error(`[booking] customer email failed for ${booking.id}: ${customer.error}`);
    if (!owner.ok) console.error(`[booking] owner email failed for ${booking.id}: ${owner.error}`);
  } catch (error) {
    console.error(`[booking] onBookingCreated failed for ${booking.id}`, error);
  }
}
