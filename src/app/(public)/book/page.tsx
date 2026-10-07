import type { Metadata } from "next";
import { BookingForm } from "@/components/public/booking/booking-form";
import type { SlotDayOption } from "@/components/public/booking/slot-picker";
import { listAvailableSlots } from "@/db/queries/availability";
import { listPublishedProductOptions } from "@/db/queries/catalogue";
import { groupSlotsByMelbourneDate } from "@/lib/booking/slots";
import { getT } from "@/lib/i18n";
import { formatMelbourne } from "@/lib/time";
import { SLUG_PATTERN } from "@/lib/validators/products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("booking.title"), alternates: { canonical: "/book" } };
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** PW-30..33: slots are computed on the server now; the form only ever sends a slot start back. */
export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const params = await searchParams;
  const requested = first(params.product) ?? "";
  const initialProductSlug = SLUG_PATTERN.test(requested) ? requested : "";

  const [t, available, products] = await Promise.all([
    getT(),
    listAvailableSlots(),
    listPublishedProductOptions(),
  ]);

  const days: SlotDayOption[] = groupSlotsByMelbourneDate(available.slots).map((day) => ({
    date: day.date,
    label: formatMelbourne(day.slots[0].startsAt, "EEE d MMM"),
    slots: day.slots.map((slot) => ({
      start: slot.startsAt.toISOString(),
      label: formatMelbourne(slot.startsAt, "h:mm aaa"),
    })),
  }));

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 lg:py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("booking.title")}</h1>
        <p className="text-muted-foreground">{t("booking.intro")}</p>
      </header>
      <BookingForm
        days={days}
        products={products.map(({ slug, title, titleBn }) => ({ slug, title, titleBn }))}
        consultationTypes={available.settings.consultationTypes}
        initialProductSlug={initialProductSlug}
      />
    </section>
  );
}
