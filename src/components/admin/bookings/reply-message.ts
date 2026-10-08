import { createT, getMessages } from "@/lib/i18n/t";
import { isLocale, type Locale } from "@/lib/i18n/locale";
import { formatMelbourne } from "@/lib/time";
import { whatsappLink } from "@/lib/whatsapp";

export type ReplyInput = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  startsAt: Date;
  locale: string;
  studioName: string;
};

/** OD-24: the prefilled greeting, in the customer's language, with Melbourne date and time. */
export function buildReplyMessage(input: ReplyInput): {
  subject: string;
  body: string;
  locale: Locale;
} {
  const locale: Locale = isLocale(input.locale) ? input.locale : "en";
  const t = createT(getMessages(locale));
  const params = {
    name: input.customerName,
    studio: input.studioName,
    date: formatMelbourne(input.startsAt, "EEEE d MMMM"),
    time: formatMelbourne(input.startsAt, "h:mm aaa"),
  };
  return {
    locale,
    subject: t("admin.bookings.reply.subject", params),
    body: t("admin.bookings.reply.message", params),
  };
}

export function buildReplyLinks(input: ReplyInput): { whatsapp: string | null; mailto: string } {
  const { subject, body } = buildReplyMessage(input);
  return {
    whatsapp: whatsappLink(input.customerPhone, body),
    mailto: `mailto:${encodeURIComponent(input.customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
