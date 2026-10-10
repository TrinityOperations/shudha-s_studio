import { PageShell } from "@/components/public/pages/page-shell";
import { Paragraphs } from "@/components/public/pages/paragraphs";
import { getLegalSettings } from "@/db/queries/settings";
import { getLocale, getT } from "@/lib/i18n";

/** PW-45: privacy or terms from the `legal` key. */
export async function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const [t, locale, legal] = await Promise.all([getT(), getLocale(), getLegalSettings()]);
  const text = kind === "privacy" ? legal.privacy : legal.terms;
  const textBn = kind === "privacy" ? legal.privacyBn : legal.termsBn;
  return (
    <PageShell title={t(kind === "privacy" ? "pages.privacy.title" : "pages.terms.title")}>
      <Paragraphs text={locale === "bn" && textBn ? textBn : text} />
    </PageShell>
  );
}
