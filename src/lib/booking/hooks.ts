import type { Booking } from "@/db/schema";

/**
 * Hook point for slice #5 (PW-34, PW-35): send the customer confirmation and the owner
 * notification. Called after the booking is committed; createBookingCore catches any error it
 * throws so a mail problem can never undo a booking.
 */
export async function onBookingCreated(booking: Booking): Promise<void> {
  // Intentionally empty until #5.
  void booking;
}
