import { Text } from "@react-email/components";
import { BookingDetails } from "./booking-details";
import { EmailLayout, emailStyles, emailT } from "./layout";
import type { CustomerEmailProps } from "./types";

export const customerCancelledSubject = "emails.cancelled.subject" as const;

/** PW-37 / OD-22: cancelled by the customer or the owner. No manage link: the token is dead. */
export function CustomerCancelledEmail(props: CustomerEmailProps) {
  const t = emailT(props.locale);
  return (
    <EmailLayout
      locale={props.locale}
      studioName={props.studioName}
      preview={t("emails.cancelled.title")}
      title={t("emails.cancelled.title")}
      button={{ href: `${props.siteUrl}/book`, label: t("emails.common.bookAgain") }}
      whatsapp={
        props.whatsappUrl ? { href: props.whatsappUrl, label: t("emails.common.whatsapp") } : null
      }
    >
      <Text style={emailStyles.text}>
        {t("emails.common.greeting", { name: props.customerName })}
      </Text>
      <Text style={emailStyles.text}>
        {t("emails.cancelled.intro", { date: props.date, time: props.time })}
      </Text>
      <BookingDetails t={t} {...props} />
      <Text style={emailStyles.text}>{t("emails.cancelled.rebook")}</Text>
    </EmailLayout>
  );
}
