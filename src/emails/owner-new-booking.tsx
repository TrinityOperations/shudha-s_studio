import { Link, Section, Text } from "@react-email/components";
import { BookingDetails } from "./booking-details";
import { EmailLayout, emailStyles, emailT } from "./layout";
import type { OwnerEmailProps, OwnerEmailVariant } from "./types";

export const ownerSubjectKey = {
  new: "emails.ownerNew.subject",
  rescheduled: "emails.ownerRescheduled.subject",
  cancelled: "emails.ownerCancelled.subject",
} as const satisfies Record<OwnerEmailVariant, string>;

/** PW-35, OD-24: new, rescheduled or cancelled booking, with one-tap WhatsApp and email replies. */
export function OwnerBookingEmail(props: OwnerEmailProps) {
  const t = emailT(props.locale);
  const copy = {
    new: {
      title: t("emails.ownerNew.title"),
      intro: t("emails.ownerNew.intro", {
        name: props.customerName,
        date: props.date,
        time: props.time,
      }),
    },
    rescheduled: {
      title: t("emails.ownerRescheduled.title"),
      intro: t("emails.ownerRescheduled.intro", {
        name: props.customerName,
        date: props.date,
        time: props.time,
      }),
    },
    cancelled: {
      title: t("emails.ownerCancelled.title"),
      intro: t("emails.ownerCancelled.intro", {
        name: props.customerName,
        date: props.date,
        time: props.time,
      }),
    },
  }[props.variant];

  return (
    <EmailLayout
      locale={props.locale}
      studioName={props.studioName}
      preview={copy.intro}
      title={copy.title}
      button={{ href: props.dashboardUrl, label: t("emails.ownerNew.dashboard") }}
      whatsapp={
        props.customerWhatsappUrl
          ? { href: props.customerWhatsappUrl, label: t("emails.ownerNew.replyWhatsApp") }
          : null
      }
    >
      <Text style={emailStyles.text}>{copy.intro}</Text>
      <BookingDetails t={t} {...props} />
      <Section>
        <Text style={{ ...emailStyles.text, margin: "4px 0" }}>
          <strong>{t("emails.ownerNew.customer")}:</strong> {props.customerName}
        </Text>
        <Text style={{ ...emailStyles.text, margin: "4px 0" }}>
          <strong>{t("emails.ownerNew.whatsapp")}:</strong> +{props.customerPhone}
        </Text>
        <Text style={{ ...emailStyles.text, margin: "4px 0" }}>
          <strong>{t("emails.ownerNew.email")}:</strong>{" "}
          <Link href={`mailto:${props.customerEmail}`}>{props.customerEmail}</Link>{" "}
          <Link href={`mailto:${props.customerEmail}`}>({t("emails.ownerNew.replyEmail")})</Link>
        </Text>
        <Text style={{ ...emailStyles.text, margin: "12px 0 4px" }}>
          <strong>{t("emails.ownerNew.message")}:</strong>
        </Text>
        <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>
          {props.message || t("emails.ownerNew.noMessage")}
        </Text>
      </Section>
    </EmailLayout>
  );
}
