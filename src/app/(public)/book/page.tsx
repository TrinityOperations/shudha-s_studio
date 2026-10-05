import type { Metadata } from "next";
import { BookingForm } from "@/components/public/booking/booking-form";
import {
  getAvailabilitySettings,
  getAvailableSlots,
  listBookingProducts,
} from "@/db/queries/availability";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("booking.title"), description: t("booking.description") };
}

export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const params = await searchParams;
  const [t, slots, settings, products] = await Promise.all([
    getT(),
    getAvailableSlots(),
    getAvailabilitySettings(),
    listBookingProducts(),
  ]);
  const requestedSlug = typeof params.product === "string" ? params.product : undefined;
  const defaultProductId = products.find((product) => product.slug === requestedSlug)?.id;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:py-14">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("booking.title")}</h1>
        <p className="text-muted-foreground">{t("booking.description")}</p>
        <p className="text-muted-foreground text-sm">{t("booking.melbourneTime")}</p>
      </header>
      <BookingForm
        slots={slots}
        products={products}
        consultationTypes={settings.consultationTypes}
        defaultProductId={defaultProductId}
      />
    </div>
  );
}
