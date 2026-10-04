import { getGeneralSettings } from "@/db/queries/settings";
import { getLocale, getT } from "@/lib/i18n";

// Placeholder home. PW-01..08 replace this in the home-page issue.
export default async function HomePage() {
  const [settings, t, locale] = await Promise.all([getGeneralSettings(), getT(), getLocale()]);
  const tagline = locale === "bn" && settings.taglineBn ? settings.taglineBn : settings.tagline;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{settings.studioName}</h1>
      {tagline ? <p className="text-muted-foreground text-lg">{tagline}</p> : null}
      <p className="text-muted-foreground max-w-prose text-sm">{t("public.home.placeholder")}</p>
    </section>
  );
}
