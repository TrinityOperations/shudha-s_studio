import "server-only";

/** Slice #5 replaces or extends this hook with booking confirmation and owner notification emails. */
export async function onBookingCreated(bookingId: string): Promise<void> {
  void bookingId;
}
