import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getGeneralSettings } from "@/db/queries/settings";
import { getLocale, getT } from "@/lib/i18n";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [settings, t, locale] = await Promise.all([getGeneralSettings(), getT(), getLocale()]);

  return (
    <>
      <a
        href="#main"
        className="focus:bg-background focus:ring-ring/50 sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:ring-3"
      >
        {t("common.skipToContent")}
      </a>
      <SiteHeader studioName={settings.studioName} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter
        studioName={settings.studioName}
        tagline={locale === "bn" && settings.taglineBn ? settings.taglineBn : settings.tagline}
      />
    </>
  );
}
