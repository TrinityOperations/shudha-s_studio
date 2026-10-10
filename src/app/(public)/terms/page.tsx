import type { Metadata } from "next";
import { LegalPage } from "@/components/public/pages/legal-page";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("pages.terms.title"),
    description: t("pages.terms.description"),
    alternates: { canonical: "/terms" },
  };
}

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
