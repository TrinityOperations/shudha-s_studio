import { describe, expect, it } from "vitest";
import {
  bookStepSchema,
  briefSchema,
  customOrderFormSchema,
  detailsStepSchema,
  occasionStepSchema,
  orderForStepSchema,
  productTypeStepSchema,
  quantityStepSchema,
  toBrief,
} from "./brief";

const TODAY = "2026-10-08";

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? [] : result.error!.issues.map((i) => i.message);
}

describe("productTypeStepSchema", () => {
  it("needs a type and accepts an empty or valid slug", () => {
    expect(productTypeStepSchema.safeParse({ productType: "  ", productSlug: "" }).success).toBe(
      false,
    );
    expect(
      productTypeStepSchema.safeParse({ productType: " Mugs ", productSlug: "eid-mug" }).data,
    ).toEqual({ productType: "Mugs", productSlug: "eid-mug" });
    expect(
      messages(productTypeStepSchema.safeParse({ productType: "Mugs", productSlug: "Bad Slug" })),
    ).toEqual(["errors.invalidInput"]);
    expect(
      productTypeStepSchema.safeParse({ productType: "x".repeat(81), productSlug: "" }).success,
    ).toBe(false);
  });
});

describe("occasionStepSchema", () => {
  it("trims and requires text", () => {
    expect(messages(occasionStepSchema.safeParse({ occasion: "" }))).toEqual(["errors.required"]);
    expect(occasionStepSchema.safeParse({ occasion: " Eid " }).data).toEqual({ occasion: "Eid" });
  });
});

describe("orderForStepSchema", () => {
  it("requires a 2–120 character business name only for business orders", () => {
    expect(messages(orderForStepSchema.safeParse({ orderFor: "", businessName: "" }))).toEqual([
      "errors.typeRequired",
    ]);
    expect(
      orderForStepSchema.safeParse({ orderFor: "personal", businessName: "ignored" }).data,
    ).toEqual({ orderFor: "personal", businessName: "" });
    expect(
      messages(orderForStepSchema.safeParse({ orderFor: "business", businessName: "" })),
    ).toEqual(["errors.required"]);
    expect(
      messages(orderForStepSchema.safeParse({ orderFor: "business", businessName: "A" })),
    ).toEqual(["errors.tooShort"]);
    expect(
      orderForStepSchema.safeParse({ orderFor: "business", businessName: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      orderForStepSchema.safeParse({ orderFor: "business", businessName: " Acme " }).data,
    ).toEqual({ orderFor: "business", businessName: "Acme" });
  });
});

describe("detailsStepSchema", () => {
  it("accepts blanks, enforces lengths and the language set", () => {
    expect(
      detailsStepSchema.safeParse({ names: "", dates: "", message: "", language: "en" }).success,
    ).toBe(true);
    expect(
      detailsStepSchema.safeParse({ names: "", dates: "", message: "", language: "fr" }).success,
    ).toBe(false);
    expect(
      detailsStepSchema.safeParse({
        names: "x".repeat(501),
        dates: "",
        message: "",
        language: "both",
      }).success,
    ).toBe(false);
    expect(
      detailsStepSchema.safeParse({
        names: "",
        dates: "",
        message: "x".repeat(2001),
        language: "bn",
      }).success,
    ).toBe(false);
  });
});

describe("quantityStepSchema", () => {
  const schema = quantityStepSchema(TODAY);
  it("coerces a whole number between 1 and 1000", () => {
    expect(schema.safeParse({ quantity: "12", neededBy: "" }).data).toEqual({
      quantity: 12,
      neededBy: "",
    });
    for (const bad of ["0", "1001", "1.5", "abc", ""]) {
      expect(messages(schema.safeParse({ quantity: bad, neededBy: "" }))).toEqual(["errors.range"]);
    }
  });
  it("accepts an empty, today's or a later real date in Melbourne terms", () => {
    expect(schema.safeParse({ quantity: "1", neededBy: TODAY }).success).toBe(true);
    expect(schema.safeParse({ quantity: "1", neededBy: "2027-02-28" }).success).toBe(true);
    expect(messages(schema.safeParse({ quantity: "1", neededBy: "2026-10-07" }))).toEqual([
      "errors.datePast",
    ]);
    expect(messages(schema.safeParse({ quantity: "1", neededBy: "2027-02-30" }))).toEqual([
      "errors.date",
    ]);
    expect(messages(schema.safeParse({ quantity: "1", neededBy: "next week" }))).toEqual([
      "errors.date",
    ]);
  });
});

describe("bookStepSchema", () => {
  it("is the booking form's contact and slot fields", () => {
    expect(Object.keys(bookStepSchema.shape).sort()).toEqual([
      "consultationType",
      "customerEmail",
      "customerName",
      "customerPhone",
      "slotStart",
      "turnstileToken",
    ]);
    const result = bookStepSchema.safeParse({
      customerName: "Asha",
      customerPhone: "0412 345 678",
      customerEmail: "asha@example.com",
      consultationType: "phone",
      slotStart: "2026-07-15T01:00:00.000Z",
      turnstileToken: "tok",
    });
    expect(result.data?.customerPhone).toBe("61412345678");
  });
});

describe("briefSchema and toBrief", () => {
  const input = {
    productType: "Mugs",
    productSlug: "",
    occasion: "Eid",
    orderFor: "business",
    businessName: "Acme",
    names: " Asha ",
    dates: "",
    message: "",
    language: "en",
    quantity: "3",
    neededBy: "",
  };

  it("validates all steps together, including the business rule", () => {
    expect(briefSchema(TODAY).safeParse(input).success).toBe(true);
    const bad = briefSchema(TODAY).safeParse({ ...input, businessName: "" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.path).toEqual(["businessName"]);
  });

  it("builds a brief without blank fields and without a business name for personal orders", () => {
    const parsed = briefSchema(TODAY).parse(input);
    expect(toBrief(parsed)).toEqual({
      productType: "Mugs",
      occasion: "Eid",
      orderFor: "business",
      businessName: "Acme",
      details: { language: "en", names: "Asha" },
      quantity: 3,
    });
    const personal = briefSchema(TODAY).parse({
      ...input,
      orderFor: "personal",
      dates: "12 Dec",
      message: "Hi",
      neededBy: "2027-01-01",
    });
    expect(toBrief(personal)).toEqual({
      productType: "Mugs",
      occasion: "Eid",
      orderFor: "personal",
      details: { language: "en", names: "Asha", dates: "12 Dec", message: "Hi" },
      quantity: 3,
      neededBy: "2027-01-01",
    });
  });

  it("customOrderFormSchema adds the booking fields", () => {
    const result = customOrderFormSchema(TODAY).safeParse({
      ...input,
      customerName: "",
      customerPhone: "0412 345 678",
      customerEmail: "asha@example.com",
      consultationType: "phone",
      slotStart: "2026-07-15T01:00:00.000Z",
      turnstileToken: "tok",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(["customerName"]);
  });
});
