"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { bookings, type ConsultationType } from "@/db/schema";
import { listPublishedProductOptions, listPublishedProductsBySlugs } from "@/db/queries/catalogue";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { clientIpFromHeaders } from "@/lib/booking/client-ip";
import { createBookingCore } from "@/lib/booking/create-booking";
import { BOOKING_UPLOADS_BUCKET } from "@/lib/booking/defaults";
import { checkRateLimit } from "@/lib/booking/rate-limit";
import { getLocale } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/t";
import { processReferenceImage } from "@/lib/images";
import { uploadStorageObject } from "@/lib/storage.server";
import { formatMelbourne } from "@/lib/time";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  bookingFormSchema,
  REFERENCE_IMAGE_MAX_BYTES,
  REFERENCE_IMAGE_TYPES,
} from "@/lib/validators/booking";
import { attachedWishlistSchema } from "@/lib/validators/wishlist";

export type BookingSummary = {
  id: string;
  /** e.g. "Wednesday 15 July 2026" (Melbourne) */
  date: string;
  /** e.g. "11:00 am" (Melbourne) */
  time: string;
  consultationType: ConsultationType;
  productTitle: string | null;
  productTitleBn: string | null;
  /** PW-61: how many wishlist products were attached; absent when none */
  wishlistCount?: number;
};

export type CreateBookingData = { summary: BookingSummary; warning?: MessageKey };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  );
}

/**
 * PW-30, PW-32, PW-38: the public booking action. Order: Turnstile → Zod → rate limit → server
 * recomputes the slot and inserts under a lock → optional reference image (a failed upload never
 * fails the booking). Emails are #5's hook inside createBookingCore.
 */
export async function createBooking(formData: FormData): Promise<ActionResult<CreateBookingData>> {
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  if (
    !(await verifyTurnstile(field(formData, "turnstileToken"), ip === "unknown" ? undefined : ip))
  ) {
    return fail("errors.turnstile");
  }

  const parsed = bookingFormSchema.safeParse({
    customerName: field(formData, "customerName"),
    customerPhone: field(formData, "customerPhone"),
    customerEmail: field(formData, "customerEmail"),
    consultationType: field(formData, "consultationType"),
    productSlug: field(formData, "productSlug"),
    slotStart: field(formData, "slotStart"),
    message: field(formData, "message"),
    turnstileToken: field(formData, "turnstileToken"),
  });
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  const data = parsed.data;

  if (!checkRateLimit(ip).allowed) return fail("errors.rateLimited");

  const product = data.productSlug
    ? ((await listPublishedProductOptions()).find((p) => p.slug === data.productSlug) ?? null)
    : null;

  const wishlistProductIds = await resolveWishlist(formData);

  const result = await createBookingCore({
    startsAt: new Date(data.slotStart),
    consultationType: data.consultationType,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail,
    productId: product?.id ?? null,
    message: data.message || null,
    locale: await getLocale(),
    ...(wishlistProductIds.length ? { wishlistProductIds } : {}),
  });
  if (!result.ok) return fail(result.error);
  const booking = result.booking;

  let warning: MessageKey | undefined;
  const file = formData.get("referenceImage");
  if (isFileLike(file) && file.size > 0) {
    if (!(REFERENCE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      warning = "errors.imageType";
    } else if (file.size > REFERENCE_IMAGE_MAX_BYTES) {
      warning = "errors.imageTooLarge";
    } else {
      try {
        const processed = await processReferenceImage(Buffer.from(await file.arrayBuffer()));
        const path = `${booking.id}/${randomUUID()}.webp`;
        await uploadStorageObject(BOOKING_UPLOADS_BUCKET, path, processed.data, "image/webp");
        await db
          .update(bookings)
          .set({ referenceImagePath: path })
          .where(eq(bookings.id, booking.id));
      } catch (error) {
        console.error("[booking] reference image not saved", error);
        warning = "booking.form.imageFailed";
      }
    }
  }

  revalidatePath("/book");
  return ok({
    summary: {
      id: booking.id,
      date: formatMelbourne(booking.startsAt, "EEEE d MMMM yyyy"),
      time: formatMelbourne(booking.startsAt, "h:mm aaa"),
      consultationType: booking.consultationType,
      productTitle: product?.title ?? null,
      productTitleBn: product?.titleBn ?? null,
      ...(wishlistProductIds.length ? { wishlistCount: wishlistProductIds.length } : {}),
    },
    ...(warning ? { warning } : {}),
  });
}

/**
 * PW-61: the `wishlistSlugs` fields (slugs only, never ids) resolved against published products;
 * unknown, draft and archived slugs are dropped, the rest capped at 20. Shared with the wizard.
 */
export async function resolveWishlist(formData: FormData): Promise<string[]> {
  const parsed = attachedWishlistSchema.safeParse(formData.getAll("wishlistSlugs"));
  const slugs = parsed.success ? parsed.data : [];
  if (slugs.length === 0) return [];
  return (await listPublishedProductsBySlugs(slugs)).map((product) => product.id);
}
