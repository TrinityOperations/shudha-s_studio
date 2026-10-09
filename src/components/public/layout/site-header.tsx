import Link from "next/link";
import { LocaleToggle } from "@/components/shared/locale-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getLocale, getT } from "@/lib/i18n";
import type { AnnouncementSettings } from "@/lib/validators/settings";
import { AnnouncementStrip } from "./announcement-strip";
import { HeaderChrome } from "./header-chrome";
import { LogoMark } from "./logo-mark";
import { MobileMenu } from "./mobile-menu";
import { NAV_LINKS } from "./nav-links";
import { WishlistBadge } from "./wishlist-badge";

type Props = { studioName: string; announcement: AnnouncementSettings };

/** docs/design.md, "Header": announcement strip, then the sticky centred header. */
export async function SiteHeader({ studioName, announcement }: Props) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const messages = announcement.messages
    .map((m) => ({
      text: locale === "bn" && m.textBn ? m.textBn : m.text,
      linkLabel: locale === "bn" && m.linkLabelBn ? m.linkLabelBn : m.linkLabel,
      href: m.href,
    }))
    .filter((m) => m.text);

  return (
    <>
      {messages.length ? (
        <AnnouncementStrip messages={messages} label={t("header.announcement")} />
      ) : null}
      <HeaderChrome>
        {/* Desktop: three columns */}
        <div className="mx-auto hidden w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-x-5 px-6 lg:grid">
          <nav aria-label={t("header.menu")}>
            <ul className="flex items-center gap-[18px] min-[1400px]:gap-6">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink hover:text-primary block rounded-full py-2 text-sm font-medium whitespace-nowrap min-[1400px]:text-[15px]"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <LogoMark studioName={studioName} homeLabel={t("header.home")} />
          <div className="flex items-center justify-end gap-2">
            <WishlistBadge />
            <LocaleToggle />
            <Link
              href="/book"
              prefetch={false}
              className={`${buttonVariants()} h-auto px-4 py-2.5 min-[1400px]:px-[26px] min-[1400px]:py-[14px]`}
            >
              {t("header.book")}
            </Link>
          </div>
        </div>
        {/* Phone and tablet */}
        <div className="flex w-full items-center justify-between gap-2 px-3 lg:hidden">
          <MobileMenu studioName={studioName} />
          <LogoMark studioName={studioName} homeLabel={t("header.home")} size="phone" />
          <WishlistBadge />
        </div>
      </HeaderChrome>
    </>
  );
}
