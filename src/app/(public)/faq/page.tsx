import type { Metadata } from "next";
import { DeliveryNote } from "@/components/public/pages/delivery-note";
import { PageShell } from "@/components/public/pages/page-shell";
import { Paragraphs } from "@/components/public/pages/paragraphs";
import { listPublishedFaqs } from "@/db/queries/faqs";
import { getLocale, getT } from "@/lib/i18n";
import { localised } from "@/lib/i18n/localised";
import { pageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return pageMetadata("/faq", locale, {
    title: t("faq.title"),
    description: t("faq.description"),
  });
}

/** PW-43, PW-48: the published questions, then the delivery note. */
export default async function FaqPage() {
  const [t, locale, faqs] = await Promise.all([getT(), getLocale(), listPublishedFaqs()]);
  return (
    <PageShell title={t("faq.title")} intro={t("faq.description")}>
      {faqs.length === 0 ? (
        <p className="text-muted-foreground">{t("faq.empty")}</p>
      ) : (
        <dl className="divide-line divide-y">
          {faqs.map((faq) => (
            <div key={faq.id} className="py-6 first:pt-0">
              <dt className="font-heading text-ink text-2xl leading-tight">
                {localised(locale, faq.question, faq.questionBn)}
              </dt>
              <dd className="mt-3">
                <Paragraphs text={localised(locale, faq.answer, faq.answerBn)} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      <DeliveryNote />
    </PageShell>
  );
}
