import { describe, expect, it } from "vitest";
import { bookingFormSchema, emptyBookingForm } from "./booking";

const valid = {
  ...emptyBookingForm,
  customerName: "Asha",
  customerPhone: "0412 345 678",
  customerEmail: "asha@example.com",
  slotStart: "2026-07-15T00:00:00.000Z",
  turnstileToken: "tok",
};

describe("bookingFormSchema", () => {
  it("normalises an Australian mobile into the WhatsApp form", () => {
    const r = bookingFormSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.customerPhone).toBe("61412345678");
  });

  it("rejects a bad WhatsApp number with the shared key", () => {
    const r = bookingFormSchema.safeParse({ ...valid, customerPhone: "abc" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("errors.whatsappNumber");
  });

  it("requires a slot and rejects an unparsable one", () => {
    expect(bookingFormSchema.safeParse({ ...valid, slotStart: "" }).error?.issues[0]?.message).toBe(
      "errors.slotRequired",
    );
    expect(
      bookingFormSchema.safeParse({ ...valid, slotStart: "soon" }).error?.issues[0]?.message,
    ).toBe("errors.slotUnavailable");
  });

  it("allows an empty product slug but not an invalid one, and needs a known type", () => {
    expect(bookingFormSchema.safeParse({ ...valid, productSlug: "" }).success).toBe(true);
    expect(bookingFormSchema.safeParse({ ...valid, productSlug: "Bad Slug" }).success).toBe(false);
    expect(
      bookingFormSchema.safeParse({ ...valid, consultationType: "carrier-pigeon" }).error?.issues[0]
        ?.message,
    ).toBe("errors.typeRequired");
    expect(
      bookingFormSchema.safeParse({ ...valid, turnstileToken: "" }).error?.issues[0]?.message,
    ).toBe("errors.turnstile");
  });
});
