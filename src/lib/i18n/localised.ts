import type { Locale } from "./locale";

/**
 * PW-81: the Bengali text when the visitor chose Bengali and the owner provided one; English
 * otherwise. Whitespace-only Bengali counts as missing. One helper for every `_bn` column.
 */
export function localised(locale: Locale, en: string, bn: string | null | undefined): string {
  if (locale === "bn" && bn && bn.trim() !== "") return bn;
  return en;
}
