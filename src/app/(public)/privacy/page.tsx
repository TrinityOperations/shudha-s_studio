import type { Metadata } from "next";
import { LegalPage } from "@/components/public/pages/legal-page";
import { getLocale, getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return pageMetadata("/privacy", locale, {
    title: t("pages.privacy.title"),
    description: t("pages.privacy.description"),
  });
}

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
