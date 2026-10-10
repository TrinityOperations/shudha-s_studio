import type { Metadata } from "next";
import type { SlotDayOption } from "@/components/public/booking/slot-picker";
import { CustomOrderWizard } from "@/components/public/wizard/custom-order-wizard";
import { listAvailableSlots } from "@/db/queries/availability";
import { getPublishedProduct, listCatalogueFacets } from "@/db/queries/catalogue";
import { getContactSettings } from "@/db/queries/settings";
import { listOccasions } from "@/db/queries/taxonomy";
import { groupSlotsByMelbourneDate, melbourneDateOf } from "@/lib/booking/slots";
import { getLocale, getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { formatMelbourneFor } from "@/lib/time";
import { SLUG_PATTERN } from "@/lib/validators/products";
import { whatsappLink } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return pageMetadata("/custom-order", locale, {
    title: t("wizard.title"),
    description: t("wizard.description"),
  });
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** PW-50..PW-53: the custom order wizard; `?product=` preselects a published product (PW-51). */
export default async function CustomOrderPage({ searchParams }: PageProps<"/custom-order">) {
  const params = await searchParams;
  const locale = await getLocale();
  const requested = first(params.product) ?? "";
  const now = new Date();

  const [t, facets, occasions, available, contact, product] = await Promise.all([
    getT(),
    listCatalogueFacets(),
    listOccasions(),
    listAvailableSlots(now),
    getContactSettings(),
    SLUG_PATTERN.test(requested) ? getPublishedProduct(requested) : Promise.resolve(null),
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
        <h1 className="text-3xl font-semibold tracking-tight">{t("wizard.title")}</h1>
        <p className="text-muted-foreground">{t("wizard.intro")}</p>
      </header>
      <CustomOrderWizard
        today={melbourneDateOf(now)}
        categories={facets.categories}
        occasions={occasions.map(({ slug, name, nameBn }) => ({ slug, name, nameBn }))}
        product={
          product ? { slug: product.slug, title: product.title, titleBn: product.titleBn } : null
        }
        days={days}
        consultationTypes={available.settings.consultationTypes}
        whatsappUrl={contact.whatsappNumber ? whatsappLink(contact.whatsappNumber) : null}
      />
    </section>
  );
}
