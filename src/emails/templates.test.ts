import { render } from "@react-email/components";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { Locale } from "@/lib/i18n/locale";
import { CustomerCancelledEmail } from "./customer-cancelled";
import { CustomerConfirmationEmail } from "./customer-confirmation";
import { CustomerConfirmedEmail } from "./customer-confirmed";
import { CustomerReminderEmail } from "./customer-reminder";
import { CustomerRescheduledEmail } from "./customer-rescheduled";
import { OwnerCancelledByCustomerEmail } from "./owner-cancelled-by-customer";
import { OwnerBookingEmail } from "./owner-new-booking";
import type { CustomerEmailProps, OwnerEmailProps } from "./types";

const customer = (locale: Locale): CustomerEmailProps => ({
  locale,
  studioName: "Shudha's Studio",
  siteUrl: "https://shudhas.studio",
  customerName: "Asha",
  date: "Wednesday 15 July 2026",
  time: "11:00 am",
  consultationType: "phone",
  productTitle: "Eid Mug",
  manageUrl: "https://shudhas.studio/booking/manage/11111111-1111-4111-8111-111111111111",
  whatsappUrl: "https://wa.me/61412345678",
});
const owner = (locale: Locale, variant: OwnerEmailProps["variant"]): OwnerEmailProps => ({
  ...customer(locale),
  variant,
  customerPhone: "61412345678",
  customerEmail: "asha@example.com",
  message: "Names: Asha & Rafi\nDate: 20 Dec",
  customerWhatsappUrl: "https://wa.me/61412345678?text=Hi",
  dashboardUrl: "https://shudhas.studio/admin/bookings",
});

const templates: { name: string; make: (locale: Locale) => React.ReactElement }[] = [
  {
    name: "customer-confirmation",
    make: (l) => createElement(CustomerConfirmationEmail, customer(l)),
  },
  { name: "customer-confirmed", make: (l) => createElement(CustomerConfirmedEmail, customer(l)) },
  { name: "customer-reminder", make: (l) => createElement(CustomerReminderEmail, customer(l)) },
  {
    name: "customer-rescheduled",
    make: (l) => createElement(CustomerRescheduledEmail, customer(l)),
  },
  { name: "customer-cancelled", make: (l) => createElement(CustomerCancelledEmail, customer(l)) },
  { name: "owner-new", make: (l) => createElement(OwnerBookingEmail, owner(l, "new")) },
  {
    name: "owner-rescheduled",
    make: (l) => createElement(OwnerBookingEmail, owner(l, "rescheduled")),
  },
  {
    name: "owner-cancelled",
    make: (l) => createElement(OwnerCancelledByCustomerEmail, owner(l, "cancelled")),
  },
];

describe("email templates", () => {
  for (const template of templates) {
    it(`${template.name} renders in English and Bengali without raw keys`, async () => {
      const en = await render(template.make("en"));
      const bn = await render(template.make("bn"));
      const enText = await render(template.make("en"), { plainText: true });
      for (const output of [en, bn, enText]) {
        expect(output).not.toMatch(/emails\./);
        expect(output).not.toMatch(/booking\.type\./);
        expect(output).toContain("Asha");
        expect(output).toContain("11:00 am");
      }
      expect(en).toContain('lang="en"');
      expect(bn).toContain('lang="bn"');
      expect(bn).not.toBe(en);
      expect(bn).toMatch(/[ঀ-৿]/); // Bengali script present
      expect(enText.length).toBeGreaterThan(50);
    });
  }

  it("customer emails carry the manage link and the WhatsApp button only when a number is set", async () => {
    const withNumber = await render(createElement(CustomerConfirmationEmail, customer("en")));
    expect(withNumber).toContain("/booking/manage/11111111-1111-4111-8111-111111111111");
    expect(withNumber).toContain("https://wa.me/61412345678");
    const without = await render(
      createElement(CustomerConfirmationEmail, { ...customer("en"), whatsappUrl: null }),
    );
    expect(without).not.toContain("wa.me");
  });

  it("owner emails link to the customer on WhatsApp and by email and show the message", async () => {
    const html = await render(createElement(OwnerBookingEmail, owner("en", "new")));
    expect(html).toContain("https://wa.me/61412345678?text=Hi");
    expect(html).toContain("mailto:asha@example.com");
    expect(html).toContain("Names: Asha");
    expect(html).toContain("New booking");
    const cancelled = await render(createElement(OwnerBookingEmail, owner("en", "cancelled")));
    expect(cancelled).toContain("cancelled by the customer");
  });
});
