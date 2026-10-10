import Link from "next/link";
import { getT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/t";
import type { SocialSettings } from "@/lib/validators/settings";
import { FacebookIcon, InstagramIcon } from "./social-icons";
import { WhatsAppIcon } from "./whatsapp-icon";

type Props = { studioName: string; social: SocialSettings; whatsappUrl: string | null };

type Column = { heading: MessageKey; links: { href: string; key: MessageKey }[] };

/** docs/design.md, "Footer". Routes for later slices are the planned paths. */
const COLUMNS: Column[] = [
  {
    heading: "footer.shop",
    links: [
      { href: "/#occasions", key: "header.nav.occasions" },
      { href: "/products", key: "header.nav.allGifts" },
      { href: "/custom-order", key: "header.nav.customOrder" },
      { href: "/wishlist", key: "footer.wishlist" },
    ],
  },
  {
    heading: "footer.studio",
    links: [
      { href: "/about", key: "header.nav.about" },
      { href: "/how-it-works", key: "footer.howItWorks" },
      { href: "/gallery", key: "header.nav.customers" },
      { href: "/faq", key: "footer.questions" },
    ],
  },
  {
    heading: "footer.help",
    links: [
      { href: "/contact", key: "footer.contact" },
      { href: "/how-it-works#delivery", key: "footer.delivery" },
      { href: "/privacy", key: "footer.privacy" },
      { href: "/terms", key: "footer.terms" },
    ],
  },
];

export async function SiteFooter({ studioName, social, whatsappUrl }: Props) {
  const t = await getT();
  const year = new Date().getFullYear();
  const link = "text-white/86 hover:text-white underline-offset-4 hover:underline";

  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="font-heading text-[30px] leading-tight">{studioName}</p>
          <p className="max-w-xs text-white/86">{t("footer.tagline")}</p>
          <ul className="flex gap-2" aria-label={t("footer.social")}>
            {social.facebook ? (
              <li>
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.facebook")}
                  className="grid size-11 place-items-center rounded-full border border-white/40 hover:bg-white/10"
                >
                  <FacebookIcon />
                </a>
              </li>
            ) : null}
            {social.instagram ? (
              <li>
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.instagram")}
                  className="grid size-11 place-items-center rounded-full border border-white/40 hover:bg-white/10"
                >
                  <InstagramIcon />
                </a>
              </li>
            ) : null}
            {whatsappUrl ? (
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.whatsapp")}
                  className="grid size-11 place-items-center rounded-full border border-white/40 hover:bg-white/10"
                >
                  <WhatsAppIcon />
                </a>
              </li>
            ) : null}
          </ul>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.heading} aria-labelledby={`footer-${column.heading}`}>
            <h2 id={`footer-${column.heading}`} className="mb-3 text-[15px] font-medium">
              {t(column.heading)}
            </h2>
            <ul className="space-y-2">
              {column.links.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} prefetch={false} className={link}>
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/25 py-5 text-sm text-white/86">
          <p>{t("footer.copyright", { year, name: studioName })}</p>
          <p aria-label={t("footer.language")}>
            {t("footer.english")} <span aria-hidden>|</span>{" "}
            <span lang="bn" className="font-bangla">
              {t("footer.bengali")}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
