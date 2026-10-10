import Link from "next/link";
import { SiteFooter } from "@/components/public/layout/site-footer";
import { SiteHeader } from "@/components/public/layout/site-header";
import { Tag } from "@/components/public/home/tag";
import { buttonVariants } from "@/components/ui/button";
import {
  getAnnouncementSettings,
  getContactSettings,
  getGeneralSettings,
  getSocialSettings,
} from "@/db/queries/settings";
import { getT } from "@/lib/i18n";
import { whatsappLink } from "@/lib/whatsapp";

/** PW-46: the branded 404. The root not-found sits outside the public layout, so it renders the chrome itself. */
export default async function NotFound() {
  const [t, settings, announcement, contact, social] = await Promise.all([
    getT(),
    getGeneralSettings(),
    getAnnouncementSettings(),
    getContactSettings(),
    getSocialSettings(),
  ]);
  return (
    <>
      <SiteHeader studioName={settings.studioName} announcement={announcement} />
      <main id="main" className="flex-1">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-4 py-20 lg:py-28">
          <Tag>404</Tag>
          <h1 className="font-heading text-ink text-[38px] leading-tight lg:text-[52px]">
            {t("pages.notFound.title")}
          </h1>
          <p className="text-ink-soft max-w-prose text-lg">{t("pages.notFound.body")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              {t("pages.notFound.home")}
            </Link>
            <Link href="/products" className={buttonVariants({ size: "lg", variant: "outline" })}>
              {t("pages.notFound.browse")}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter
        studioName={settings.studioName}
        social={social}
        whatsappUrl={whatsappLink(contact.whatsappNumber)}
      />
    </>
  );
}
