import { getDeliverySettings } from "@/db/queries/settings";
import { getLocale, getT } from "@/lib/i18n";
import { Tag } from "@/components/public/home/tag";

/** PW-48: the delivery note from settings, as a section with an anchor (How it works, FAQ). */
export async function DeliveryNote({ id = "delivery" }: { id?: string }) {
  const [t, locale, delivery] = await Promise.all([getT(), getLocale(), getDeliverySettings()]);
  const note = locale === "bn" && delivery.noteBn ? delivery.noteBn : delivery.note;
  if (!note) return null;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="border-line border bg-white p-6 lg:p-8"
    >
      <Tag variant="quiet" className="mb-3">
        {t("faq.delivery")}
      </Tag>
      <h2 id={`${id}-heading`} className="sr-only">
        {t("faq.delivery")}
      </h2>
      <p className="text-ink max-w-prose text-lg">{note}</p>
    </section>
  );
}
