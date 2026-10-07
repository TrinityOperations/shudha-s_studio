import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { createT, getMessages, type T } from "@/lib/i18n/t";

/** Pure: usable outside a request (cron, hooks). */
export function emailT(locale: Locale): T {
  return createT(getMessages(locale));
}

const styles = {
  body: {
    backgroundColor: "#f5f5f5",
    fontFamily: "Geist, 'Noto Sans Bengali', Arial, sans-serif",
    margin: 0,
    padding: "24px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    margin: "0 auto",
    maxWidth: 560,
    padding: "32px 28px",
  },
  brand: {
    color: "#171717",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.02em",
    margin: "0 0 16px",
  },
  heading: {
    color: "#171717",
    fontSize: 24,
    fontWeight: 600,
    lineHeight: "32px",
    margin: "0 0 12px",
  },
  text: { color: "#171717", fontSize: 16, lineHeight: "24px", margin: "0 0 12px" },
  button: {
    backgroundColor: "#171717",
    borderRadius: 8,
    color: "#ffffff",
    display: "inline-block",
    fontSize: 14,
    fontWeight: 600,
    padding: "12px 20px",
    textDecoration: "none",
  },
  buttonSecondary: {
    backgroundColor: "#25D366",
    borderRadius: 8,
    color: "#ffffff",
    display: "inline-block",
    fontSize: 14,
    fontWeight: 600,
    padding: "12px 20px",
    textDecoration: "none",
  },
  footer: { color: "#737373", fontSize: 12, lineHeight: "18px", margin: 0 },
} as const;

export const emailStyles = styles;

type Props = {
  locale: Locale;
  studioName: string;
  preview: string;
  title: string;
  children: ReactNode;
  /** Primary call to action */
  button?: { href: string; label: string } | null;
  /** Studio WhatsApp button (customer emails) */
  whatsapp?: { href: string; label: string } | null;
};

export function EmailLayout({
  locale,
  studioName,
  preview,
  title,
  children,
  button,
  whatsapp,
}: Props) {
  const t = emailT(locale);
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>{studioName}</Text>
          <Heading as="h1" style={styles.heading}>
            {title}
          </Heading>
          {children}
          {button ? (
            <Section style={{ margin: "20px 0 8px" }}>
              <Button href={button.href} style={styles.button}>
                {button.label}
              </Button>
            </Section>
          ) : null}
          {whatsapp ? (
            <Section style={{ margin: "8px 0" }}>
              <Button href={whatsapp.href} style={styles.buttonSecondary}>
                {whatsapp.label}
              </Button>
            </Section>
          ) : null}
          <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0 16px" }} />
          <Text style={styles.footer}>{t("emails.common.footer", { studioName })}</Text>
        </Container>
      </Body>
    </Html>
  );
}
