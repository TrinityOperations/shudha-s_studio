import type { Locale } from "@/lib/i18n/locale";
import type { T } from "@/lib/i18n/t";

// Prices are always whole Australian dollars (PW-14, OD-18). Western digits in both languages:
// the audience reads prices in Australian notation.
const formatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

/** "$1,500" for 1500. */
export function formatAud(amount: number): string {
  return formatter.format(amount);
}

/** "From $25" (localised label), or null when the owner left the price blank. */
export function formatPriceFrom(priceFrom: number | null, _locale: Locale, t: T): string | null {
  if (priceFrom === null || !Number.isFinite(priceFrom)) return null;
  return t("catalogue.priceFrom", { price: formatAud(priceFrom) });
}
