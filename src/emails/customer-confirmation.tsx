import { Text } from "@react-email/components";
import { BookingDetails } from "./booking-details";
import { EmailLayout, emailStyles, emailT } from "./layout";
import type { CustomerEmailProps } from "./types";

export const customerConfirmationSubject = "emails.confirmation.subject" as const;

/** PW-34: sent as soon as the booking is saved. */
export function CustomerConfirmationEmail(props: CustomerEmailProps) {
  const t = emailT(props.locale);
  return (
    <EmailLayout
      locale={props.locale}
      studioName={props.studioName}
      preview={t("emails.confirmation.title")}
      title={t("emails.confirmation.title")}
      button={{ href: props.manageUrl, label: t("emails.common.manage") }}
      whatsapp={
        props.whatsappUrl ? { href: props.whatsappUrl, label: t("emails.common.whatsapp") } : null
      }
    >
      <Text style={emailStyles.text}>
        {t("emails.common.greeting", { name: props.customerName })}
      </Text>
      <Text style={emailStyles.text}>
        {t("emails.confirmation.intro", { studioName: props.studioName })}
      </Text>
      <BookingDetails t={t} {...props} />
      <Text style={emailStyles.text}>{t("emails.confirmation.next")}</Text>
      <Text style={emailStyles.text}>{t("emails.common.calendar")}</Text>
      <Text style={{ ...emailStyles.footer, marginTop: 8 }}>{t("emails.common.manageHint")}</Text>
    </EmailLayout>
  );
}
