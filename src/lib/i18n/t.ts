import en from "./en.json";
import bnJson from "./bn.json";
import type { Locale } from "./locale";

/** Flat keys ("admin.login.title"). Adding a key to en.json makes it available everywhere. */
export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export type Params = Record<string, string | number>;

const bn = bnJson as Partial<Messages>;

/** Bengali falls back to English for any missing key (PW-81). */
export function getMessages(locale: Locale): Messages {
  return locale === "bn" ? { ...en, ...bn } : en;
}

export type T = (key: MessageKey, params?: Params) => string;

export function createT(messages: Messages): T {
  return (key, params) => {
    const template = messages[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) =>
      name in params ? String(params[name]) : `{${name}}`,
    );
  };
}
