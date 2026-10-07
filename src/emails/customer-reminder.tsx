import { Text } from "@react-email/components";
import { BookingDetails } from "./booking-details";
import { EmailLayout, emailStyles, emailT } from "./layout";
import type { CustomerEmailProps } from "./types";

export const customerReminderSubject = "emails.reminder.subject" as const;

/** PW-36: about 24 hours before the appointment. */
export function CustomerReminderEmail(props: CustomerEmailProps) {
  const t = emailT(props.locale);
  return (
    <EmailLayout
      locale={props.locale}
      studioName={props.studioName}
      preview={t("emails.reminder.title")}
      title={t("emails.reminder.title")}
      button={{ href: props.manageUrl, label: t("emails.common.manage") }}
      whatsapp={
        props.whatsappUrl ? { href: props.whatsappUrl, label: t("emails.common.whatsapp") } : null
      }
    >
      <Text style={emailStyles.text}>
        {t("emails.common.greeting", { name: props.customerName })}
      </Text>
      <Text style={emailStyles.text}>
        {t("emails.reminder.intro", {
          studioName: props.studioName,
          date: props.date,
          time: props.time,
        })}
      </Text>
      <BookingDetails t={t} {...props} />
      <Text style={emailStyles.text}>{t("emails.reminder.next")}</Text>
    </EmailLayout>
  );
}
