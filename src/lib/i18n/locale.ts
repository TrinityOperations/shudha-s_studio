export const locales = ["en", "bn"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "locale";
/** Set by src/proxy.ts when the URL carries `?lang=`; read before the cookie. */
export const LOCALE_HEADER = "x-locale";
/** The query parameter that renders one request in a language and sets the cookie (hreflang). */
export const LOCALE_PARAM = "lang";
export const OG_LOCALES: Record<Locale, string> = { en: "en_AU", bn: "bn_BD" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
