import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { SlotDayOption } from "@/components/public/booking/slot-picker";
import { listAvailableSlots } from "@/db/queries/availability";
import { getBookingByManageToken, getBookingProductTitle } from "@/db/queries/bookings";
import { getContactSettings } from "@/db/queries/settings";
import { groupSlotsByMelbourneDate } from "@/lib/booking/slots";
import { bookingSummary } from "@/lib/booking/summary";
import { getLocale, getT } from "@/lib/i18n";
import { formatMelbourneFor } from "@/lib/time";
import { whatsappLink } from "@/lib/whatsapp";
import { ManageBooking } from "./manage-booking";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("bookingManage.title"), robots: { index: false, follow: false } };
}

const tokenSchema = z.uuid();

/**
 * PW-37. The token is the only lookup key: unknown, cancelled or past bookings are a 404, and
 * the page never shows an id or anyone else's data.
 */
export default async function ManageBookingPage({ params }: PageProps<"/booking/manage/[token]">) {
  const { token } = await params;
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) notFound();
  const locale = await getLocale();

  const booking = await getBookingByManageToken(parsed.data);
  if (!booking) notFound();

  const [t, product, contact, available] = await Promise.all([
    getT(),
    getBookingProductTitle(booking.productId),
    getContactSettings(),
    listAvailableSlots(),
  ]);

  const days: SlotDayOption[] = groupSlotsByMelbourneDate(available.slots).map((day) => ({
    date: day.date,
    label: formatMelbourneFor(locale, day.slots[0].startsAt, "short"),
    slots: day.slots.map((slot) => ({
      start: slot.startsAt.toISOString(),
      label: formatMelbourneFor(locale, slot.startsAt, "time"),
    })),
  }));

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 lg:py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("bookingManage.title")}</h1>
        <p className="text-muted-foreground">{t("bookingManage.intro")}</p>
      </header>
      <ManageBooking
        token={parsed.data}
        name={booking.customerName}
        summary={bookingSummary(booking, product)}
        days={days}
        whatsappUrl={contact.whatsappNumber ? whatsappLink(contact.whatsappNumber) : null}
      />
    </section>
  );
}
