import { SiteFooter } from "@/components/public/layout/site-footer";
import { SiteHeader } from "@/components/public/layout/site-header";
import { WhatsAppButton } from "@/components/public/layout/whatsapp-button";
import {
  getAnnouncementSettings,
  getContactSettings,
  getGeneralSettings,
  getSocialSettings,
} from "@/db/queries/settings";
import { getT } from "@/lib/i18n";
import { whatsappLink } from "@/lib/whatsapp";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [settings, announcement, contact, social, t] = await Promise.all([
    getGeneralSettings(),
    getAnnouncementSettings(),
    getContactSettings(),
    getSocialSettings(),
    getT(),
  ]);
  const whatsappUrl = whatsappLink(contact.whatsappNumber);

  return (
    <>
      <a
        href="#main"
        className="focus:bg-background focus:ring-ring/50 sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:ring-3"
      >
        {t("common.skipToContent")}
      </a>
      <SiteHeader studioName={settings.studioName} announcement={announcement} />
      <main id="main" className={`flex-1 ${whatsappUrl ? "pb-20 sm:pb-0" : ""}`}>
        {children}
      </main>
      <SiteFooter studioName={settings.studioName} social={social} whatsappUrl={whatsappUrl} />
      {whatsappUrl ? <WhatsAppButton href={whatsappUrl} /> : null}
    </>
  );
}
