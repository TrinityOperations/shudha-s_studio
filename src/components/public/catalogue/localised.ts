import type { Locale } from "@/lib/i18n/locale";

/** Bengali text when the visitor chose Bengali and the owner provided it; English otherwise (PW-81). */
export function localised(locale: Locale, en: string, bn: string | null | undefined): string {
  return locale === "bn" && bn ? bn : en;
}
