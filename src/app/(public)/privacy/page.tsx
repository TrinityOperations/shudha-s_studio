import type { Metadata } from "next";
import { LegalPage } from "@/components/public/pages/legal-page";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("pages.privacy.title"),
    description: t("pages.privacy.description"),
    alternates: { canonical: "/privacy" },
  };
}

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
