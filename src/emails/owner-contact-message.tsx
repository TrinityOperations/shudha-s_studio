import { Link, Section, Text } from "@react-email/components";
import { EmailLayout, emailStyles, emailT } from "./layout";

export type OwnerContactEmailProps = {
  studioName: string;
  name: string;
  email: string;
  /** Normalised WhatsApp number or "" */
  phone: string;
  message: string;
  whatsappUrl: string | null;
};

/** PW-42: a contact form message, forwarded to the owner with one-tap replies. */
export function OwnerContactEmail(props: OwnerContactEmailProps) {
  const t = emailT("en");
  const intro = t("contact.email.intro", { name: props.name });
  return (
    <EmailLayout
      locale="en"
      studioName={props.studioName}
      preview={intro}
      title={t("contact.email.title")}
      button={{ href: `mailto:${props.email}`, label: t("contact.email.replyEmail") }}
      whatsapp={
        props.whatsappUrl
          ? { href: props.whatsappUrl, label: t("contact.email.replyWhatsApp") }
          : null
      }
    >
      <Text style={emailStyles.text}>{intro}</Text>
      <Section>
        <Text style={{ ...emailStyles.text, margin: "4px 0" }}>
          <strong>{t("contact.email.from")}:</strong> {props.name}
        </Text>
        <Text style={{ ...emailStyles.text, margin: "4px 0" }}>
          <strong>{t("contact.email.emailLabel")}:</strong>{" "}
          <Link href={`mailto:${props.email}`}>{props.email}</Link>
        </Text>
        {props.phone ? (
          <Text style={{ ...emailStyles.text, margin: "4px 0" }}>
            <strong>{t("contact.email.whatsapp")}:</strong> +{props.phone}
          </Text>
        ) : null}
        <Text style={{ ...emailStyles.text, margin: "12px 0 4px" }}>
          <strong>{t("contact.email.message")}:</strong>
        </Text>
        <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>{props.message}</Text>
      </Section>
    </EmailLayout>
  );
}
