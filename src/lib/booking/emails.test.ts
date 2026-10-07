import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  getGeneralSettings: vi.fn(),
  getContactSettings: vi.fn(),
  getBookingProductTitle: vi.fn(),
}));

vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/db/queries/settings", () => ({
  getGeneralSettings: mocks.getGeneralSettings,
  getContactSettings: mocks.getContactSettings,
}));
vi.mock("@/db/queries/bookings", () => ({ getBookingProductTitle: mocks.getBookingProductTitle }));
vi.mock("@/db", () => ({ db: {} }));

import type { Booking } from "@/db/schema";
import { manageUrlFor, sendBookingEmail } from "./emails";

const booking: Booking = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "new",
  consultationType: "phone",
  startsAt: new Date("2026-07-15T01:00:00.000Z"),
  endsAt: new Date("2026-07-15T01:30:00.000Z"),
  customerName: "Asha",
  customerPhone: "61412345678",
  customerEmail: "asha@example.com",
  locale: "bn",
  productId: "22222222-2222-4222-8222-222222222222",
  message: "Hi",
  referenceImagePath: null,
  brief: null,
  wishlistProductIds: [],
  privateNotes: null,
  manageToken: "33333333-3333-4333-8333-333333333333",
  confirmedAt: null,
  cancelledAt: null,
  reminderSentAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  mocks.sendEmail.mockReset().mockResolvedValue({ ok: true, dryRun: true });
  mocks.getGeneralSettings.mockResolvedValue({
    studioName: "Shudha's Studio",
    tagline: "",
    taglineBn: "",
  });
  mocks.getContactSettings.mockResolvedValue({ whatsappNumber: "61400000000", email: "" });
  mocks.getBookingProductTitle.mockResolvedValue({ title: "Eid Mug", titleBn: "ঈদ মগ" });
});

describe("sendBookingEmail", () => {
  it("builds the manage URL from NEXT_PUBLIC_SITE_URL", () => {
    expect(manageUrlFor(booking)).toBe(
      "http://localhost:3000/booking/manage/33333333-3333-4333-8333-333333333333",
    );
  });

  it("sends the customer's 'received' email in their locale with the ics attached", async () => {
    await sendBookingEmail("received", booking);
    const call = mocks.sendEmail.mock.calls[0][0];
    expect(call.to).toBe("asha@example.com");
    expect(call.subject).toContain("15"); // Bengali subject with the date
    expect(call.subject).not.toMatch(/emails\./);
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments[0].filename).toBe("consultation.ics");
    expect(call.attachments[0].content).toContain(
      "UID:11111111-1111-4111-8111-111111111111@localhost:3000",
    );
    expect(call.react.props).toMatchObject({
      locale: "bn",
      productTitle: "ঈদ মগ",
      whatsappUrl: "https://wa.me/61400000000",
    });
  });

  it("reschedule keeps the same ics UID; cancelled and reminder carry no attachment", async () => {
    await sendBookingEmail("rescheduled", booking);
    expect(mocks.sendEmail.mock.calls[0][0].attachments[0].content).toContain(
      "UID:11111111-1111-4111-8111-111111111111@",
    );
    await sendBookingEmail("cancelled", booking);
    await sendBookingEmail("reminder", booking);
    expect(mocks.sendEmail.mock.calls[1][0].attachments).toBeUndefined();
    expect(mocks.sendEmail.mock.calls[2][0].attachments).toBeUndefined();
  });

  it("sends owner emails in English to OWNER_EMAIL with reply-to the customer and a prefilled WhatsApp link", async () => {
    await sendBookingEmail("owner-new", booking);
    const call = mocks.sendEmail.mock.calls[0][0];
    expect(call.to).toBe("Owner@Example.com");
    expect(call.replyTo).toBe("asha@example.com");
    expect(call.subject).toBe("New booking: Asha, Wednesday 15 July 2026 11:00 am");
    expect(call.react.props).toMatchObject({
      locale: "en",
      variant: "new",
      productTitle: "Eid Mug",
      customerEmail: "asha@example.com",
    });
    expect(call.react.props.customerWhatsappUrl).toMatch(
      /^https:\/\/wa\.me\/61412345678\?text=Hi%20Asha/,
    );
    await sendBookingEmail("owner-rescheduled", booking);
    await sendBookingEmail("owner-cancelled", booking);
    expect(mocks.sendEmail.mock.calls[1][0].react.props.variant).toBe("rescheduled");
    expect(mocks.sendEmail.mock.calls[2][0].subject).toMatch(/^Cancelled: Asha/);
  });

  it("leaves the WhatsApp button out when the studio number is unset", async () => {
    mocks.getContactSettings.mockResolvedValue({ whatsappNumber: "", email: "" });
    await sendBookingEmail("confirmed", booking);
    expect(mocks.sendEmail.mock.calls[0][0].react.props.whatsappUrl).toBeNull();
  });
});
