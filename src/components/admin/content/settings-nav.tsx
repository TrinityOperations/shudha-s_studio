"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";

const SECTIONS: { href: string; key: MessageKey }[] = [
  { href: "/admin/settings", key: "admin.settings.nav.general" },
  { href: "/admin/settings/content", key: "admin.settings.nav.content" },
  { href: "/admin/settings/announcement", key: "admin.settings.nav.announcement" },
  { href: "/admin/settings/banner", key: "admin.settings.nav.banner" },
  { href: "/admin/settings/faqs", key: "admin.settings.nav.faqs" },
  { href: "/admin/settings/testimonials", key: "admin.settings.nav.testimonials" },
  { href: "/admin/settings/account", key: "admin.settings.nav.account" },
];

/** Settings sub-navigation: every content screen groups here so the admin nav keeps five links. */
export function SettingsNav() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav aria-label={t("admin.settings.nav")}>
      <ul className="-mx-4 flex scrollbar-none gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
        {SECTIONS.map((section) => {
          const active =
            section.href === "/admin/settings"
              ? pathname === section.href
              : pathname.startsWith(section.href);
          return (
            <li key={section.href} className="shrink-0">
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full border px-3 py-1.5 text-sm whitespace-nowrap",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line hover:bg-muted",
                )}
              >
                {t(section.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
