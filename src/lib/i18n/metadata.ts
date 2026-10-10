import type { Metadata } from "next";
import { LOCALE_PARAM, OG_LOCALES, type Locale } from "./locale";

/**
 * hreflang and canonical for a public page (PW-80). English lives at the clean URL (also the
 * x-default); Bengali at `?lang=bn`, which the proxy serves directly in Bengali. A Bengali
 * request's canonical is its own address.
 */
export function localeAlternates(
  path: string,
  locale: Locale,
): NonNullable<Metadata["alternates"]> {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const joiner = clean.includes("?") ? "&" : "?";
  const bn = `${clean}${joiner}${LOCALE_PARAM}=bn`;
  return {
    canonical: locale === "bn" ? bn : clean,
    languages: { en: clean, bn, "x-default": clean },
  };
}

export function openGraphLocale(locale: Locale): NonNullable<Metadata["openGraph"]> {
  return {
    locale: OG_LOCALES[locale],
    alternateLocale: [OG_LOCALES[locale === "en" ? "bn" : "en"]],
  };
}

/** One call for a public page: canonical, hreflang alternates and og:locale. */
export function pageMetadata(path: string, locale: Locale, meta: Metadata = {}): Metadata {
  return {
    ...meta,
    alternates: { ...localeAlternates(path, locale), ...(meta.alternates ?? {}) },
    openGraph: { ...openGraphLocale(locale), ...(meta.openGraph ?? {}) },
  };
}
