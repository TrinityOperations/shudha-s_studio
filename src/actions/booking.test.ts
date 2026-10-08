import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      verifyTurnstile: vi.fn(),
      createBookingCore: vi.fn(),
      listPublishedProductOptions: vi.fn(),
      listPublishedProductsBySlugs: vi.fn(),
      processReferenceImage: vi.fn(),
      uploadStorageObject: vi.fn(),
      revalidatePath: vi.fn(),
      headers: vi.fn(),
    },
  };
});

vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: mocks.verifyTurnstile }));
vi.mock("@/lib/booking/create-booking", () => ({ createBookingCore: mocks.createBookingCore }));
vi.mock("@/db/queries/catalogue", () => ({
  listPublishedProductOptions: mocks.listPublishedProductOptions,
  listPublishedProductsBySlugs: mocks.listPublishedProductsBySlugs,
}));
vi.mock("@/lib/images", () => ({ processReferenceImage: mocks.processReferenceImage }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/storage.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage.server")>()),
  uploadStorageObject: mocks.uploadStorageObject,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/i18n", () => ({ getLocale: vi.fn(async () => "bn") }));

import { resetRateLimit } from "@/lib/booking/rate-limit";
import { createBooking } from "./booking";

const START = "2026-07-15T01:00:00.000Z"; // Wed 11:00 Melbourne
const PRODUCT = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "eid-mug",
  title: "Eid Mug",
  titleBn: "ঈদ মগ",
};
const booking = {
  id: "b1",
  startsAt: new Date(START),
  endsAt: new Date("2026-07-15T01:30:00.000Z"),
  consultationType: "phone",
};

function form(over: Record<string, string | File> = {}) {
  const fd = new FormData();
  const base: Record<string, string> = {
    customerName: "Asha",
    customerPhone: "0412 345 678",
    customerEmail: "asha@example.com",
    consultationType: "phone",
    productSlug: "eid-mug",
    slotStart: START,
    message: "  Hello ",
    turnstileToken: "tok",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  return fd;
}

const WISHLIST_CARDS = {
  frame: { id: "22222222-2222-4222-8222-222222222222", slug: "frame" },
  lamp: { id: "33333333-3333-4333-8333-333333333333", slug: "lamp" },
};

/** Published lookup stand-in: only "frame" and "lamp" exist; order follows the request. */
function publishedBySlugs(slugs: string[]) {
  return slugs
    .filter((slug): slug is keyof typeof WISHLIST_CARDS => slug in WISHLIST_CARDS)
    .map((slug) => WISHLIST_CARDS[slug]);
}

let ipCounter = 0;
beforeEach(() => {
  dbMock.reset();
  resetRateLimit();
  mocks.headers.mockResolvedValue(
    new Headers({ "x-nf-client-connection-ip": `198.51.100.${++ipCounter}` }),
  );
  mocks.verifyTurnstile.mockResolvedValue(true);
  mocks.listPublishedProductOptions.mockResolvedValue([PRODUCT]);
  mocks.listPublishedProductsBySlugs.mockImplementation(async (slugs: string[]) =>
    publishedBySlugs(slugs),
  );
  mocks.createBookingCore.mockResolvedValue({ ok: true, booking });
  mocks.processReferenceImage.mockResolvedValue({
    data: Buffer.from("webp"),
    width: 10,
    height: 10,
  });
  mocks.uploadStorageObject.mockResolvedValue(undefined);
});

describe("createBooking", () => {
  it("checks Turnstile before anything else", async () => {
    mocks.verifyTurnstile.mockResolvedValue(false);
    expect(await createBooking(form({ customerName: "" }))).toMatchObject({
      ok: false,
      error: "errors.turnstile",
    });
    expect(mocks.createBookingCore).not.toHaveBeenCalled();
  });

  it("returns field errors and does not count towards the rate limit", async () => {
    const result = await createBooking(form({ customerPhone: "nope", customerEmail: "x" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.customerPhone).toEqual(["errors.whatsappNumber"]);
    expect(result.fieldErrors?.customerEmail).toEqual(["errors.email"]);
    expect(mocks.createBookingCore).not.toHaveBeenCalled();
  });

  it("books with the normalised number, resolved product and a Melbourne summary", async () => {
    const result = await createBooking(form());
    expect(result).toEqual({
      ok: true,
      data: {
        summary: {
          id: "b1",
          date: "Wednesday 15 July 2026",
          time: "11:00 am",
          consultationType: "phone",
          productTitle: "Eid Mug",
          productTitleBn: "ঈদ মগ",
        },
      },
    });
    expect(mocks.createBookingCore).toHaveBeenCalledWith({
      startsAt: new Date(START),
      consultationType: "phone",
      customerName: "Asha",
      customerPhone: "61412345678",
      customerEmail: "asha@example.com",
      productId: PRODUCT.id,
      message: "Hello",
      locale: "bn",
    });
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith("tok", `198.51.100.${ipCounter}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/book");
  });

  it("ignores an unknown or unpublished product slug and an empty message", async () => {
    await createBooking(form({ productSlug: "draft-thing", message: "" }));
    expect(mocks.createBookingCore.mock.calls[0]?.[0]).toMatchObject({
      productId: null,
      message: null,
    });
  });

  it("passes slotTaken and slotUnavailable through from the core", async () => {
    mocks.createBookingCore.mockResolvedValueOnce({ ok: false, error: "errors.slotTaken" });
    expect(await createBooking(form())).toMatchObject({ ok: false, error: "errors.slotTaken" });
    mocks.createBookingCore.mockResolvedValueOnce({ ok: false, error: "errors.slotUnavailable" });
    expect(await createBooking(form())).toMatchObject({
      ok: false,
      error: "errors.slotUnavailable",
    });
  });

  it("rate-limits the sixth valid attempt from one address", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "10.0.0.1, 203.0.113.5" }));
    for (let i = 0; i < 5; i++) expect((await createBooking(form())).ok).toBe(true);
    expect(await createBooking(form())).toMatchObject({ ok: false, error: "errors.rateLimited" });
    expect(mocks.createBookingCore).toHaveBeenCalledTimes(5);
  });

  it("stores the reference image under the booking id and records the path", async () => {
    const file = new File([new Uint8Array(32)], "ref.jpg", { type: "image/jpeg" });
    const result = await createBooking(form({ referenceImage: file }));
    expect(result.ok).toBe(true);
    expect(mocks.uploadStorageObject).toHaveBeenCalledWith(
      "booking-uploads",
      expect.stringMatching(/^b1\/[0-9a-f-]{36}\.webp$/),
      Buffer.from("webp"),
      "image/webp",
    );
    expect(dbMock.methodCalls("set")[0]?.[0]).toEqual({
      referenceImagePath: expect.stringMatching(/^b1\//),
    });
  });

  it("keeps the booking and returns a warning when the image is rejected or the upload fails", async () => {
    const gif = new File([new Uint8Array(8)], "x.gif", { type: "image/gif" });
    expect(await createBooking(form({ referenceImage: gif }))).toMatchObject({
      ok: true,
      data: { warning: "errors.imageType" },
    });
    mocks.uploadStorageObject.mockRejectedValueOnce(new Error("storage down"));
    const png = new File([new Uint8Array(8)], "x.png", { type: "image/png" });
    expect(await createBooking(form({ referenceImage: png }))).toMatchObject({
      ok: true,
      data: { warning: "booking.form.imageFailed" },
    });
    expect(mocks.createBookingCore).toHaveBeenCalledTimes(2);
  });

  it("attaches wishlist slugs as published product ids, dropping unknown and draft ones", async () => {
    const fd = form();
    for (const slug of ["frame", "draft-thing", "lamp", "frame"]) fd.append("wishlistSlugs", slug);
    const result = await createBooking(fd);
    expect(result).toMatchObject({ ok: true, data: { summary: { wishlistCount: 2 } } });
    expect(mocks.listPublishedProductsBySlugs).toHaveBeenCalledWith([
      "frame",
      "draft-thing",
      "lamp",
    ]);
    expect(mocks.createBookingCore.mock.calls[0]?.[0]).toMatchObject({
      wishlistProductIds: [WISHLIST_CARDS.frame.id, WISHLIST_CARDS.lamp.id],
    });
  });

  it("never accepts ids in the wishlist field and caps the attached list at 20", async () => {
    const fd = form();
    fd.append("wishlistSlugs", WISHLIST_CARDS.frame.id);
    fd.append("wishlistSlugs", "../../etc");
    await createBooking(fd);
    expect(mocks.listPublishedProductsBySlugs).not.toHaveBeenCalled();
    expect(mocks.createBookingCore.mock.calls[0]?.[0]).not.toHaveProperty("wishlistProductIds");

    const many = form();
    for (let i = 0; i < 30; i++) many.append("wishlistSlugs", `product-${i}`);
    await createBooking(many);
    expect(mocks.listPublishedProductsBySlugs.mock.calls[0]?.[0]).toHaveLength(20);
  });
});
