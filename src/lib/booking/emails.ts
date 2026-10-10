import "server-only";
import { createElement } from "react";
import type { Booking } from "@/db/schema";
import { getBookingProductTitle } from "@/db/queries/bookings";
import { getContactSettings, getGeneralSettings } from "@/db/queries/settings";
import { CustomerCancelledEmail, customerCancelledSubject } from "@/emails/customer-cancelled";
import {
  CustomerConfirmationEmail,
  customerConfirmationSubject,
} from "@/emails/customer-confirmation";
import { CustomerConfirmedEmail, customerConfirmedSubject } from "@/emails/customer-confirmed";
import { CustomerReminderEmail, customerReminderSubject } from "@/emails/customer-reminder";
import {
  CustomerRescheduledEmail,
  customerRescheduledSubject,
} from "@/emails/customer-rescheduled";
import { emailT } from "@/emails/layout";
import { OwnerBookingEmail, ownerSubjectKey } from "@/emails/owner-new-booking";
import type { CustomerEmailProps, OwnerEmailProps, OwnerEmailVariant } from "@/emails/types";
import { sendEmail, type EmailAttachment, type SendEmailResult } from "@/lib/email";
import { publicEnv } from "@/lib/env.public";
import { serverEnv } from "@/lib/env";
import { isLocale, type Locale } from "@/lib/i18n/locale";
import { localised } from "@/lib/i18n/localised";
import { formatMelbourneFor } from "@/lib/time";
import { whatsappLink } from "@/lib/whatsapp";
import { buildIcs, ICS_CONTENT_TYPE, ICS_FILENAME } from "./ics";

/**
 * One entry point for every booking email (PW-34..37, OD-22). Slice #6 calls this from the owner's
 * confirm/reschedule/cancel actions. "received" is the first email after a public booking;
 * "confirmed" is the owner's confirmation.
 */
export type BookingEmailKind =
  | "received"
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "reminder"
  | "owner-new"
  | "owner-rescheduled"
  | "owner-cancelled";

const OWNER_LOCALE: Locale = "en";

/** Manage URLs come from NEXT_PUBLIC_SITE_URL only, never from request headers. */
export function manageUrlFor(booking: Pick<Booking, "manageToken">): string {
  return `${publicEnv.siteUrl}/booking/manage/${booking.manageToken}`;
}

export function bookingLocale(booking: Pick<Booking, "locale">): Locale {
  return isLocale(booking.locale) ? booking.locale : "en";
}

async function customerProps(booking: Booking, locale: Locale): Promise<CustomerEmailProps> {
  const [general, contact, product] = await Promise.all([
    getGeneralSettings(),
    getContactSettings(),
    getBookingProductTitle(booking.productId),
  ]);
  return {
    locale,
    studioName: general.studioName,
    siteUrl: publicEnv.siteUrl,
    customerName: booking.customerName,
    date: formatMelbourneFor(locale, booking.startsAt, "long"),
    time: formatMelbourneFor(locale, booking.startsAt, "time"),
    consultationType: booking.consultationType,
    productTitle: product ? localised(locale, product.title, product.titleBn) : null,
    manageUrl: manageUrlFor(booking),
    whatsappUrl: contact.whatsappNumber ? whatsappLink(contact.whatsappNumber) : null,
  };
}

function icsAttachment(booking: Booking, props: CustomerEmailProps): EmailAttachment {
  const t = emailT(props.locale);
  const host = new URL(props.siteUrl).host;
  return {
    filename: ICS_FILENAME,
    contentType: ICS_CONTENT_TYPE,
    content: buildIcs({
      // Same UID on every send for one booking, so a reschedule updates the calendar entry.
      uid: `${booking.id}@${host}`,
      start: booking.startsAt,
      end: booking.endsAt,
      summary: `${t("emails.common.type")}: ${props.studioName}`,
      description: `${t("emails.common.manage")}: ${props.manageUrl}`,
      url: props.manageUrl,
    }),
  };
}

export async function sendBookingEmail(
  kind: BookingEmailKind,
  booking: Booking,
): Promise<SendEmailResult> {
  if (kind.startsWith("owner-")) {
    const variant: OwnerEmailVariant =
      kind === "owner-new" ? "new" : kind === "owner-rescheduled" ? "rescheduled" : "cancelled";
    const base = await customerProps(booking, OWNER_LOCALE);
    const t = emailT(OWNER_LOCALE);
    const greeting = t("emails.ownerNew.greeting", {
      name: booking.customerName,
      studioName: base.studioName,
      date: base.date,
      time: base.time,
    });
    const props: OwnerEmailProps = {
      ...base,
      variant,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      message: booking.message,
      customerWhatsappUrl: whatsappLink(booking.customerPhone, greeting),
      dashboardUrl: `${publicEnv.siteUrl}/admin/bookings`,
    };
    return sendEmail({
      to: serverEnv().OWNER_EMAIL,
      subject: t(ownerSubjectKey[variant], {
        name: booking.customerName,
        date: base.date,
        time: base.time,
      }),
      react: createElement(OwnerBookingEmail, props),
      replyTo: booking.customerEmail,
      templateName: kind,
    });
  }

  const locale = bookingLocale(booking);
  const props = await customerProps(booking, locale);
  const t = emailT(locale);
  const params = { studioName: props.studioName, date: props.date, time: props.time };
  const byKind = {
    received: {
      subject: customerConfirmationSubject,
      component: CustomerConfirmationEmail,
      ics: true,
    },
    confirmed: { subject: customerConfirmedSubject, component: CustomerConfirmedEmail, ics: true },
    rescheduled: {
      subject: customerRescheduledSubject,
      component: CustomerRescheduledEmail,
      ics: true,
    },
    cancelled: { subject: customerCancelledSubject, component: CustomerCancelledEmail, ics: false },
    reminder: { subject: customerReminderSubject, component: CustomerReminderEmail, ics: false },
  } as const;
  const spec = byKind[kind as keyof typeof byKind];
  return sendEmail({
    to: booking.customerEmail,
    subject: t(spec.subject, params),
    react: createElement(spec.component, props),
    attachments: spec.ics ? [icsAttachment(booking, props)] : undefined,
    templateName: kind,
  });
}
