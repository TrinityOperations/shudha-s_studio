import type { Metadata } from "next";
import { LegalPage } from "@/components/public/pages/legal-page";
import { getLocale, getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return pageMetadata("/terms", locale, {
    title: t("pages.terms.title"),
    description: t("pages.terms.description"),
  });
}

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
