import type { MessageKey } from "@/lib/i18n/t";

export type NavLink = { href: string; key: MessageKey };

/** Header navigation (docs/design.md, "Header"). Routes for #11 and #12 pages are planned paths. */
export const NAV_LINKS: NavLink[] = [
  { href: "/#occasions", key: "header.nav.occasions" },
  { href: "/products", key: "header.nav.allGifts" },
  { href: "/custom-order", key: "header.nav.customOrder" },
  { href: "/gallery", key: "header.nav.customers" },
  { href: "/about", key: "header.nav.about" },
];
