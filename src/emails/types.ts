import type { ConsultationType } from "@/db/schema";
import type { Locale } from "@/lib/i18n/locale";

/** Everything a customer-facing template needs; strings are pre-formatted in Melbourne time. */
export type CustomerEmailProps = {
  locale: Locale;
  studioName: string;
  siteUrl: string;
  customerName: string;
  /** e.g. "Wednesday 15 July 2026" */
  date: string;
  /** e.g. "11:00 am" */
  time: string;
  consultationType: ConsultationType;
  productTitle: string | null;
  /** Built from NEXT_PUBLIC_SITE_URL only */
  manageUrl: string;
  /** Studio WhatsApp link, or null when the owner has not set a number */
  whatsappUrl: string | null;
};

export type OwnerEmailVariant = "new" | "rescheduled" | "cancelled";

export type OwnerEmailProps = CustomerEmailProps & {
  variant: OwnerEmailVariant;
  customerPhone: string;
  customerEmail: string;
  message: string | null;
  /** One-tap wa.me link to the customer with a prefilled greeting (OD-24) */
  customerWhatsappUrl: string | null;
  dashboardUrl: string;
};
