import { Text } from "@react-email/components";
import { BookingDetails } from "./booking-details";
import { EmailLayout, emailStyles, emailT } from "./layout";
import type { CustomerEmailProps } from "./types";

export const customerConfirmedSubject = "emails.confirmed.subject" as const;

/** OD-22: the owner confirmed the booking (sent by slice #6). */
export function CustomerConfirmedEmail(props: CustomerEmailProps) {
  const t = emailT(props.locale);
  return (
    <EmailLayout
      locale={props.locale}
      studioName={props.studioName}
      preview={t("emails.confirmed.title")}
      title={t("emails.confirmed.title")}
      button={{ href: props.manageUrl, label: t("emails.common.manage") }}
      whatsapp={
        props.whatsappUrl ? { href: props.whatsappUrl, label: t("emails.common.whatsapp") } : null
      }
    >
      <Text style={emailStyles.text}>
        {t("emails.common.greeting", { name: props.customerName })}
      </Text>
      <Text style={emailStyles.text}>
        {t("emails.confirmed.intro", { date: props.date, time: props.time })}
      </Text>
      <BookingDetails t={t} {...props} />
      <Text style={{ ...emailStyles.footer, marginTop: 8 }}>{t("emails.common.manageHint")}</Text>
    </EmailLayout>
  );
}
