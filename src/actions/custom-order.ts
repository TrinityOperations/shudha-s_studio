"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { listPublishedProductOptions } from "@/db/queries/catalogue";
import { bookings, type CustomOrderBrief } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { clientIpFromHeaders } from "@/lib/booking/client-ip";
import { createBookingCore } from "@/lib/booking/create-booking";
import { BOOKING_UPLOADS_BUCKET } from "@/lib/booking/defaults";
import { checkRateLimit } from "@/lib/booking/rate-limit";
import { melbourneDateOf } from "@/lib/booking/slots";
import { getLocale } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/t";
import { processReferenceImage } from "@/lib/images";
import { removeStorageObjects, uploadStorageObject } from "@/lib/storage.server";
import { formatMelbourne } from "@/lib/time";
import { verifyTurnstile } from "@/lib/turnstile";
import { REFERENCE_IMAGE_MAX_BYTES, REFERENCE_IMAGE_TYPES } from "@/lib/validators/booking";
import { customOrderFormSchema, MAX_WIZARD_PHOTOS, toBrief } from "@/lib/validators/brief";
import type { BookingSummary } from "./booking";

export type CreateCustomOrderData = { summary: BookingSummary; warning?: MessageKey };

const FIELDS = [
  "productType",
  "productSlug",
  "occasion",
  "orderFor",
  "businessName",
  "names",
  "dates",
  "message",
  "language",
  "quantity",
  "neededBy",
  "customerName",
  "customerPhone",
  "customerEmail",
  "consultationType",
  "slotStart",
  "turnstileToken",
] as const;

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
 * PW-50..PW-52: the wizard's single submit. Same pipeline as createBooking (Turnstile → Zod →
 * rate limit → createBookingCore under the lock), with the structured brief attached, then up to
 * three photos into booking-uploads/<bookingId>/. A photo failure never loses the booking: the
 * uploaded objects are removed and the customer gets a warning.
 */
export async function createCustomOrder(
  formData: FormData,
): Promise<ActionResult<CreateCustomOrderData>> {
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  if (
    !(await verifyTurnstile(field(formData, "turnstileToken"), ip === "unknown" ? undefined : ip))
  ) {
    return fail("errors.turnstile");
  }

  const today = melbourneDateOf(new Date());
  const parsed = customOrderFormSchema(today).safeParse(
    Object.fromEntries(FIELDS.map((name) => [name, field(formData, name)])),
  );
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  const data = parsed.data;

  if (!checkRateLimit(ip).allowed) return fail("errors.rateLimited");

  const product = data.productSlug
    ? ((await listPublishedProductOptions()).find((p) => p.slug === data.productSlug) ?? null)
    : null;
  const brief = toBrief(data);

  const result = await createBookingCore({
    startsAt: new Date(data.slotStart),
    consultationType: data.consultationType,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail,
    productId: product?.id ?? null,
    message: brief.details?.message ?? null,
    locale: await getLocale(),
    brief,
  });
  if (!result.ok) return fail(result.error);
  const booking = result.booking;

  const warning = await attachPhotos(booking.id, brief, formData.getAll("photos"));

  revalidatePath("/custom-order");
  revalidatePath("/book");
  return ok({
    summary: {
      id: booking.id,
      date: formatMelbourne(booking.startsAt, "EEEE d MMMM yyyy"),
      time: formatMelbourne(booking.startsAt, "h:mm aaa"),
      consultationType: booking.consultationType,
      productTitle: product?.title ?? null,
      productTitleBn: product?.titleBn ?? null,
    },
    ...(warning ? { warning } : {}),
  });
}

/** Uploads the photos and stores their paths in the brief. Returns a warning key on any failure. */
async function attachPhotos(
  bookingId: string,
  brief: CustomOrderBrief,
  entries: FormDataEntryValue[],
): Promise<MessageKey | undefined> {
  const files = entries.filter((e): e is File => isFileLike(e) && e.size > 0);
  if (files.length === 0) return undefined;
  if (files.length > MAX_WIZARD_PHOTOS) return "wizard.photos.tooMany";
  for (const file of files) {
    if (!(REFERENCE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return "errors.imageType";
    }
    if (file.size > REFERENCE_IMAGE_MAX_BYTES) return "errors.imageTooLarge";
  }

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      const processed = await processReferenceImage(Buffer.from(await file.arrayBuffer()));
      const path = `${bookingId}/${randomUUID()}.webp`;
      await uploadStorageObject(BOOKING_UPLOADS_BUCKET, path, processed.data, "image/webp");
      uploaded.push(path);
    }
    await db
      .update(bookings)
      .set({ brief: { ...brief, photoPaths: uploaded } })
      .where(eq(bookings.id, bookingId));
    return undefined;
  } catch (error) {
    console.error("[custom-order] photos not saved", error);
    try {
      await removeStorageObjects(BOOKING_UPLOADS_BUCKET, uploaded);
    } catch (cleanupError) {
      console.error("[custom-order] photo cleanup failed", cleanupError);
    }
    return "wizard.photos.failed";
  }
}
