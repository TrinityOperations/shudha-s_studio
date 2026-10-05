"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { bookings, products } from "@/db/schema";
import { getAvailabilitySettings, getAvailableSlots } from "@/db/queries/availability";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { onBookingCreated } from "@/lib/booking/created";
import { checkBookingRateLimit } from "@/lib/booking/rate-limit";
import { findAvailableSlot } from "@/lib/booking/slots";
import { processProductImage } from "@/lib/images";
import { removeStorageObjects, StorageError, uploadStorageObject } from "@/lib/storage.server";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  BOOKING_IMAGE_TYPES,
  bookingSchema,
  MAX_BOOKING_IMAGE_BYTES,
  type BookingInput,
} from "@/lib/validators/booking";

const BOOKING_UPLOADS_BUCKET = "booking-uploads";

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number" &&
    typeof (value as File).type === "string"
  );
}

function exclusionConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; constraint?: string; cause?: unknown };
  return (
    value.code === "23P01" ||
    value.constraint === "bookings_no_overlap" ||
    exclusionConflict(value.cause)
  );
}

function inputFromFormData(formData: FormData): BookingInput {
  return {
    startsAt: String(formData.get("startsAt") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    productId: String(formData.get("productId") ?? ""),
    message: String(formData.get("message") ?? ""),
    consultationType: String(
      formData.get("consultationType") ?? "",
    ) as BookingInput["consultationType"],
    turnstileToken: String(formData.get("turnstileToken") ?? ""),
  };
}

export async function createBooking(
  formData: FormData,
): Promise<ActionResult<{ id: string; startsAt: string }>> {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkBookingRateLimit(ip)) return fail("booking.errors.rateLimited");

  const parsed = bookingSchema.safeParse(inputFromFormData(formData));
  if (!parsed.success) return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) return fail("errors.turnstile");

  const fileValue = formData.get("referenceImage");
  const file = isFileLike(fileValue) && fileValue.size > 0 ? fileValue : null;
  if (file) {
    if (!BOOKING_IMAGE_TYPES.includes(file.type as (typeof BOOKING_IMAGE_TYPES)[number])) {
      return fail("errors.imageType");
    }
    if (file.size > MAX_BOOKING_IMAGE_BYTES) return fail("errors.imageTooLarge");
  }

  let referenceImagePath: string | null = null;
  try {
    if (file) {
      const processed = await processProductImage(Buffer.from(await file.arrayBuffer()));
      referenceImagePath = `references/${randomUUID()}.webp`;
      await uploadStorageObject(
        BOOKING_UPLOADS_BUCKET,
        referenceImagePath,
        processed.full,
        "image/webp",
      );
    }

    const created = await db.transaction(async (tx) => {
      const settings = await getAvailabilitySettings(tx);
      if (!settings.consultationTypes.includes(parsed.data.consultationType)) {
        throw new Error("CONSULTATION_DISABLED");
      }
      const productId = parsed.data.productId || undefined;
      if (productId) {
        const productRows = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.id, productId), eq(products.status, "published")))
          .limit(1);
        if (!productRows.length) throw new Error("PRODUCT_NOT_FOUND");
      }
      const slots = await getAvailableSlots(new Date(), tx);
      const slot = findAvailableSlot(slots, parsed.data.startsAt);
      if (!slot) throw new Error("SLOT_UNAVAILABLE");

      const [row] = await tx
        .insert(bookings)
        .values({
          consultationType: parsed.data.consultationType,
          startsAt: new Date(slot.startsAt),
          endsAt: new Date(slot.endsAt),
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail,
          productId: productId ?? null,
          message: parsed.data.message || null,
          referenceImagePath,
        })
        .returning({ id: bookings.id });
      return { id: row.id, startsAt: slot.startsAt };
    });

    await onBookingCreated(created.id).catch((error) => {
      console.error("[booking] post-create hook failed", error);
    });
    return ok(created);
  } catch (error) {
    if (referenceImagePath) {
      await removeStorageObjects(BOOKING_UPLOADS_BUCKET, [referenceImagePath]).catch(
        () => undefined,
      );
    }
    if (exclusionConflict(error)) return fail("booking.errors.slotTaken");
    if (error instanceof StorageError) return fail("errors.storageFailed");
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND")
      return fail("errors.notFound");
    if (
      error instanceof Error &&
      ["SLOT_UNAVAILABLE", "CONSULTATION_DISABLED"].includes(error.message)
    ) {
      return fail("booking.errors.slotUnavailable");
    }
    return fail("booking.errors.createFailed");
  }
}
