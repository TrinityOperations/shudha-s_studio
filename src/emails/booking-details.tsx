import { Section, Text } from "@react-email/components";
import type { MessageKey, T } from "@/lib/i18n/t";
import { emailStyles } from "./layout";
import type { CustomerEmailProps } from "./types";

type Props = Pick<CustomerEmailProps, "date" | "time" | "consultationType" | "productTitle"> & {
  t: T;
};

/** Date, time, consultation type and product, as a simple labelled list that survives any client. */
export function BookingDetails({ t, date, time, consultationType, productTitle }: Props) {
  const rows: [string, string][] = [
    [t("emails.common.date"), date],
    [t("emails.common.time"), time],
    [t("emails.common.type"), t(`booking.type.${consultationType}` as MessageKey)],
  ];
  if (productTitle) rows.push([t("emails.common.product"), productTitle]);
  return (
    <Section
      style={{
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        margin: "16px 0",
        padding: "12px 16px",
      }}
    >
      {rows.map(([label, value]) => (
        <Text key={label} style={{ ...emailStyles.text, margin: "4px 0" }}>
          <strong>{label}:</strong> {value}
        </Text>
      ))}
    </Section>
  );
}
