import { Text } from "@react-email/components";
import { BookingDetails } from "./booking-details";
import { EmailLayout, emailStyles, emailT } from "./layout";
import type { CustomerEmailProps } from "./types";

export const customerRescheduledSubject = "emails.rescheduled.subject" as const;

/** PW-37 / OD-22: the time changed (by the customer or the owner); carries a fresh manage link. */
export function CustomerRescheduledEmail(props: CustomerEmailProps) {
  const t = emailT(props.locale);
  return (
    <EmailLayout
      locale={props.locale}
      studioName={props.studioName}
      preview={t("emails.rescheduled.title")}
      title={t("emails.rescheduled.title")}
      button={{ href: props.manageUrl, label: t("emails.common.manage") }}
      whatsapp={
        props.whatsappUrl ? { href: props.whatsappUrl, label: t("emails.common.whatsapp") } : null
      }
    >
      <Text style={emailStyles.text}>
        {t("emails.common.greeting", { name: props.customerName })}
      </Text>
      <Text style={emailStyles.text}>
        {t("emails.rescheduled.intro", { date: props.date, time: props.time })}
      </Text>
      <BookingDetails t={t} {...props} />
      <Text style={emailStyles.text}>{t("emails.rescheduled.next")}</Text>
      <Text style={{ ...emailStyles.footer, marginTop: 8 }}>{t("emails.common.manageHint")}</Text>
    </EmailLayout>
  );
}
