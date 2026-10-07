import "server-only";
import { and, gt, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Booking, type ConsultationType, type NewBooking } from "@/db/schema";
import { getAvailabilityContext, getBookingSettings } from "@/db/queries/availability";
import { onBookingCreated } from "./hooks";
import { isSlotAvailable } from "./slots";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reusable core for the public form (#4), the wizard (#7) and the wishlist (#8). Callers have
 * already validated and normalised the fields; `brief` and `wishlistProductIds` pass through
 * unchanged.
 */
export type CreateBookingInput = {
  startsAt: Date;
  consultationType: ConsultationType;
  customerName: string;
  /** Normalised WhatsApp number (digits, international, no "+"). */
  customerPhone: string;
  customerEmail: string;
  productId: string | null;
  message: string | null;
  brief?: NewBooking["brief"];
  wishlistProductIds?: NewBooking["wishlistProductIds"];
};

export type CreateBookingError = "errors.slotTaken" | "errors.slotUnavailable";

export type CreateBookingResult =
  { ok: true; booking: Booking } | { ok: false; error: CreateBookingError };

class SlotTakenError extends Error {
  constructor() {
    super("slot taken");
    this.name = "SlotTakenError";
  }
}

/** True for Postgres SQLSTATE 23P01 (exclusion_violation), wherever drizzle or pg nested it. */
export function isExclusionViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (typeof current === "object" && (current as { code?: unknown }).code === "23P01")
      return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * PW-32. The slot must be one the rules currently generate; then, under a transaction-scoped
 * advisory lock, re-check conflicts (including buffer) and insert. The bookings_no_overlap
 * exclusion constraint is the last line of defence and maps to the same i18n key.
 */
export async function createBookingCore(
  input: CreateBookingInput,
  deps: { now?: Date } = {},
): Promise<CreateBookingResult> {
  const now = deps.now ?? new Date();
  const settings = await getBookingSettings();
  const slotMs = settings.slotMinutes * 60_000;
  const bufferMs = settings.bufferMinutes * 60_000;
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(startsAt.getTime() + slotMs);

  const context = await getAvailabilityContext(
    new Date(startsAt.getTime() - DAY_MS),
    new Date(endsAt.getTime() + 2 * DAY_MS),
  );
  if (!isSlotAvailable(startsAt, { ...context, now })) {
    return { ok: false, error: "errors.slotUnavailable" };
  }

  let booking: Booking;
  try {
    booking = await db.transaction(async (tx) => {
      // Serialise all booking inserts; released at commit or rollback.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('bookings'))`);

      const conflicts = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            ne(bookings.status, "cancelled"),
            lt(bookings.startsAt, new Date(endsAt.getTime() + bufferMs)),
            gt(bookings.endsAt, new Date(startsAt.getTime() - bufferMs)),
          ),
        )
        .limit(1);
      if (conflicts.length > 0) throw new SlotTakenError();

      const [row] = await tx
        .insert(bookings)
        .values({
          status: "new",
          consultationType: input.consultationType,
          startsAt,
          endsAt,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          productId: input.productId,
          message: input.message,
          ...(input.brief !== undefined ? { brief: input.brief } : {}),
          ...(input.wishlistProductIds !== undefined
            ? { wishlistProductIds: input.wishlistProductIds }
            : {}),
        })
        .returning();
      return row;
    });
  } catch (error) {
    if (error instanceof SlotTakenError || isExclusionViolation(error)) {
      return { ok: false, error: "errors.slotTaken" };
    }
    throw error;
  }

  try {
    await onBookingCreated(booking);
  } catch (error) {
    console.error("[booking] onBookingCreated failed", error);
  }
  return { ok: true, booking };
}
