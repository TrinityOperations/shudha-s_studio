import { describe, expect, it } from "vitest";
import { whatsappNumberSchema } from "./validators/common";
import { normaliseWhatsAppNumber, whatsappLink, whatsappShareLink } from "./whatsapp";

describe("normaliseWhatsAppNumber", () => {
  it("turns Australian local numbers into international form", () => {
    expect(normaliseWhatsAppNumber("0412 345 678")).toBe("61412345678");
    expect(normaliseWhatsAppNumber("0412-345-678")).toBe("61412345678");
    expect(normaliseWhatsAppNumber("412345678")).toBe("61412345678");
    expect(normaliseWhatsAppNumber("(03) 9123 4567")).toBe("61391234567");
  });

  it("keeps international numbers, with + or 00", () => {
    expect(normaliseWhatsAppNumber("+61 412 345 678")).toBe("61412345678");
    expect(normaliseWhatsAppNumber("+880 1711-123456")).toBe("8801711123456");
    expect(normaliseWhatsAppNumber("00880 1711 123456")).toBe("8801711123456");
  });

  it("rejects empty, too short, too long and non-numeric input", () => {
    expect(normaliseWhatsAppNumber("")).toBeNull();
    expect(normaliseWhatsAppNumber(null)).toBeNull();
    expect(normaliseWhatsAppNumber("12345")).toBeNull();
    expect(normaliseWhatsAppNumber("+1234567890123456")).toBeNull();
    expect(normaliseWhatsAppNumber("call me")).toBeNull();
    expect(normaliseWhatsAppNumber("0412 345 678 ext 2")).toBeNull();
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link, encoding the message", () => {
    expect(whatsappLink("0412 345 678")).toBe("https://wa.me/61412345678");
    expect(whatsappLink("0412 345 678", "Hi Rina, about your booking & mug")).toBe(
      "https://wa.me/61412345678?text=Hi%20Rina%2C%20about%20your%20booking%20%26%20mug",
    );
    expect(whatsappLink("+61412345678", "সুধা স্টুডিও")).toBe(
      `https://wa.me/61412345678?text=${encodeURIComponent("সুধা স্টুডিও")}`,
    );
  });

  it("returns null for an invalid number and ignores a blank message", () => {
    expect(whatsappLink("nope", "hello")).toBeNull();
    expect(whatsappLink("0412345678", "   ")).toBe("https://wa.me/61412345678");
  });
});

describe("whatsappNumberSchema", () => {
  it("outputs the normalised number", () => {
    expect(whatsappNumberSchema.parse(" 0412 345 678 ")).toBe("61412345678");
  });

  it("uses i18n keys for errors", () => {
    expect(whatsappNumberSchema.safeParse("").error?.issues[0]?.message).toBe("errors.required");
    expect(whatsappNumberSchema.safeParse("abc").error?.issues[0]?.message).toBe(
      "errors.whatsappNumber",
    );
  });
});

describe("whatsappShareLink", () => {
  it("builds a recipient-less wa.me link with the text encoded", () => {
    expect(whatsappShareLink(" Eid mug https://example.com/products/eid-mug ")).toBe(
      "https://wa.me/?text=Eid%20mug%20https%3A%2F%2Fexample.com%2Fproducts%2Feid-mug",
    );
  });
});
