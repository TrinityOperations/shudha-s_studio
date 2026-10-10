import { Section, Text } from "@react-email/components";
import type { Locale } from "@/lib/i18n/locale";
import { EmailLayout, emailStyles, emailT } from "./layout";

export type OwnerGalleryEmailProps = {
  locale: Locale;
  studioName: string;
  firstName: string | null;
  note: string | null;
  /** /admin/gallery on the public site URL */
  reviewUrl: string;
};

/** PW-72, OD-32: one short email per submitted photo, until #14's push notification. */
export function OwnerGalleryEmail(props: OwnerGalleryEmailProps) {
  const t = emailT(props.locale);
  const who = props.firstName || t("admin.gallery.email.anonymous");
  return (
    <EmailLayout
      locale={props.locale}
      studioName={props.studioName}
      preview={t("admin.gallery.email.intro", { name: who })}
      title={t("admin.gallery.email.title")}
      button={{ href: props.reviewUrl, label: t("admin.gallery.email.review") }}
      whatsapp={null}
    >
      <Text style={emailStyles.text}>{t("admin.gallery.email.intro", { name: who })}</Text>
      {props.note ? (
        <Section>
          <Text style={{ ...emailStyles.text, margin: "4px 0" }}>
            <strong>{t("admin.gallery.email.note")}:</strong>
          </Text>
          <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>{props.note}</Text>
        </Section>
      ) : null}
      <Text style={emailStyles.text}>{t("admin.gallery.email.reminder")}</Text>
    </EmailLayout>
  );
}
