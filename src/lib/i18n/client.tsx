"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./locale";
import { createT, type Messages, type T } from "./t";

type I18nContextValue = { locale: Locale; t: T };

const I18nContext = createContext<I18nContextValue | null>(null);

/** Mounted once in the root layout with the server-resolved locale and dictionary. */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: createT(messages) }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT/useLocale must be used inside <I18nProvider>");
  return ctx;
}

/** For client components: `const t = useT();` */
export function useT(): T {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
