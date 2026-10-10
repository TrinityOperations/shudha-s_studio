import type { Metadata } from "next";
import { FacebookIcon, InstagramIcon } from "@/components/public/layout/social-icons";
import { WhatsAppIcon } from "@/components/public/layout/whatsapp-icon";
import { ContactForm } from "@/components/public/pages/contact-form";
import { PageShell } from "@/components/public/pages/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { getContactSettings, getSocialSettings } from "@/db/queries/settings";
import { getT } from "@/lib/i18n";
import { whatsappLink } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("contact.title"),
    description: t("contact.description"),
    alternates: { canonical: "/contact" },
  };
}

/** PW-42: form, WhatsApp, social links and the area served. */
export default async function ContactPage() {
  const [t, contact, social] = await Promise.all([
    getT(),
    getContactSettings(),
    getSocialSettings(),
  ]);
  const whatsappUrl = whatsappLink(contact.whatsappNumber);
  return (
    <PageShell title={t("contact.title")} intro={t("contact.intro")} wide>
      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        <ContactForm />
        <aside className="space-y-8">
          <section aria-labelledby="contact-other" className="space-y-3">
            <h2 id="contact-other" className="font-heading text-ink text-2xl">
              {t("contact.other")}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {whatsappUrl ? (
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <WhatsAppIcon className="text-primary" />
                    {t("contact.whatsapp")}
                  </a>
                </li>
              ) : null}
              {contact.email ? (
                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    {contact.email}
                  </a>
                </li>
              ) : null}
              {social.instagram ? (
                <li>
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <InstagramIcon data-icon="inline-start" />
                    {t("footer.instagram")}
                  </a>
                </li>
              ) : null}
              {social.facebook ? (
                <li>
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <FacebookIcon data-icon="inline-start" />
                    {t("footer.facebook")}
                  </a>
                </li>
              ) : null}
            </ul>
          </section>
          <section aria-labelledby="contact-area" className="space-y-2">
            <h2 id="contact-area" className="font-heading text-ink text-2xl">
              {t("contact.area")}
            </h2>
            <p className="text-ink-soft max-w-prose">{t("contact.areaText")}</p>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
