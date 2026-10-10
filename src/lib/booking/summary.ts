import type { Booking, ConsultationType } from "@/db/schema";
import type { Locale } from "@/lib/i18n/locale";
import { formatMelbourneFor } from "@/lib/time";

/** What the confirmation and manage panels show. Never includes the token or other customers' data. */
export type BookingSummary = {
  id: string;
  /** e.g. "Wednesday 15 July 2026" (Melbourne) */
  date: string;
  /** e.g. "11:00 am" (Melbourne) */
  time: string;
  consultationType: ConsultationType;
  productTitle: string | null;
  productTitleBn: string | null;
};

export function bookingSummary(
  booking: Pick<Booking, "id" | "startsAt" | "consultationType">,
  product: { title: string; titleBn: string | null } | null,
  locale: Locale = "en",
): BookingSummary {
  return {
    id: booking.id,
    date: formatMelbourneFor(locale, booking.startsAt, "long"),
    time: formatMelbourneFor(locale, booking.startsAt, "time"),
    consultationType: booking.consultationType,
    productTitle: product?.title ?? null,
    productTitleBn: product?.titleBn ?? null,
  };
}
