import type { Metadata } from "next";
import Link from "next/link";
import { DeliveryNote } from "@/components/public/pages/delivery-note";
import { PageShell } from "@/components/public/pages/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { getLocale, getT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/t";
import { pageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return pageMetadata("/how-it-works", locale, {
    title: t("pages.howItWorks.title"),
    description: t("pages.howItWorks.description"),
  });
}

const STEPS = [1, 2, 3, 4, 5] as const;

/** PW-41, PW-48: browse → book → consult → create → pickup or post, then the delivery note. */
export default async function HowItWorksPage() {
  const t = await getT();
  return (
    <PageShell title={t("pages.howItWorks.title")} intro={t("pages.howItWorks.intro")}>
      <ol className="space-y-6">
        {STEPS.map((n) => (
          <li key={n} className="flex gap-4">
            <span
              aria-hidden
              className="bg-mark grid size-[30px] shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
            >
              {n}
            </span>
            <div>
              <h2 className="font-heading text-ink text-2xl leading-tight">
                {t(`pages.howItWorks.step${n}.title` as MessageKey)}
              </h2>
              <p className="text-ink-soft mt-1 max-w-prose">
                {t(`pages.howItWorks.step${n}.body` as MessageKey)}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <DeliveryNote />
      <div className="flex flex-wrap gap-3">
        <Link href="/book" prefetch={false} className={buttonVariants({ size: "lg" })}>
          {t("header.book")}
        </Link>
        <Link
          href="/custom-order"
          prefetch={false}
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          {t("home.made.cta")}
        </Link>
      </div>
    </PageShell>
  );
}
