import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./locale";
import { createT, getMessages } from "./t";

export type { Locale } from "./locale";
export type { MessageKey, T } from "./t";

/** Visitor's locale from the cookie set by actions/locale.ts. Memoised per request. */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
});

/** For server components and emails: `const t = await getT();` */
export async function getT() {
  return createT(getMessages(await getLocale()));
}
