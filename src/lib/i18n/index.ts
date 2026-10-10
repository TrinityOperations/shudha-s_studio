import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from "./locale";
import { createT, getMessages } from "./t";

export type { Locale } from "./locale";
export type { MessageKey, T } from "./t";

/**
 * Visitor's locale: `?lang=` for this request (forwarded by the proxy as a header), else the
 * cookie set by actions/locale.ts, else English. Memoised per request.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const requested = (await headers()).get(LOCALE_HEADER);
  if (isLocale(requested)) return requested;
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
});

/** For server components and emails: `const t = await getT();` */
export async function getT() {
  return createT(getMessages(await getLocale()));
}
