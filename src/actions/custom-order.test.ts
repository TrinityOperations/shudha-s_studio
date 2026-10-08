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
      removeStorageObjects: vi.fn(),
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
  removeStorageObjects: mocks.removeStorageObjects,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/i18n", () => ({ getLocale: vi.fn(async () => "en") }));

import { resetRateLimit } from "@/lib/booking/rate-limit";
import { createCustomOrder } from "./custom-order";

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
  consultationType: "video",
};

const BASE: Record<string, string> = {
  productType: "Eid Mug",
  productSlug: "eid-mug",
  occasion: "Eid",
  orderFor: "business",
  businessName: "Acme Pty Ltd",
  names: "Asha, Rafi",
  dates: "",
  message: "  Eid Mubarak ",
  language: "both",
  quantity: "12",
  neededBy: "2999-01-01",
  customerName: "Asha",
  customerPhone: "0412 345 678",
  customerEmail: "asha@example.com",
  consultationType: "video",
  slotStart: START,
  turnstileToken: "tok",
};

function form(over: Record<string, string> = {}, photos: File[] = []) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...BASE, ...over })) fd.set(k, v);
  for (const photo of photos) fd.append("photos", photo);
  return fd;
}

function png(name = "x.png") {
  return new File([new Uint8Array(16)], name, { type: "image/png" });
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
  mocks.removeStorageObjects.mockResolvedValue(undefined);
});

describe("createCustomOrder", () => {
  it("checks Turnstile before anything else", async () => {
    mocks.verifyTurnstile.mockResolvedValue(false);
    expect(await createCustomOrder(form({ productType: "" }))).toMatchObject({
      ok: false,
      error: "errors.turnstile",
    });
    expect(mocks.createBookingCore).not.toHaveBeenCalled();
  });

  it("returns field errors for an invalid brief and does not book", async () => {
    const result = await createCustomOrder(
      form({ occasion: "", businessName: "", quantity: "0", neededBy: "2000-01-01" }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toBe("errors.invalidInput");
    expect(result.fieldErrors?.occasion).toEqual(["errors.required"]);
    expect(result.fieldErrors?.businessName).toEqual(["errors.required"]);
    expect(result.fieldErrors?.quantity).toEqual(["errors.range"]);
    expect(result.fieldErrors?.neededBy).toEqual(["errors.datePast"]);
    expect(mocks.createBookingCore).not.toHaveBeenCalled();
  });

  it("books with the structured brief attached and returns the summary", async () => {
    const result = await createCustomOrder(form());
    expect(result).toEqual({
      ok: true,
      data: {
        summary: {
          id: "b1",
          date: "Wednesday 15 July 2026",
          time: "11:00 am",
          consultationType: "video",
          productTitle: "Eid Mug",
          productTitleBn: "ঈদ মগ",
        },
      },
    });
    expect(mocks.createBookingCore).toHaveBeenCalledWith({
      startsAt: new Date(START),
      consultationType: "video",
      customerName: "Asha",
      customerPhone: "61412345678",
      customerEmail: "asha@example.com",
      productId: PRODUCT.id,
      message: "Eid Mubarak",
      locale: "en",
      brief: {
        productType: "Eid Mug",
        occasion: "Eid",
        orderFor: "business",
        businessName: "Acme Pty Ltd",
        details: { language: "both", names: "Asha, Rafi", message: "Eid Mubarak" },
        quantity: 12,
        neededBy: "2999-01-01",
      },
    });
    expect(dbMock.methodCalls("update")).toHaveLength(0);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/custom-order");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/book");
  });

  it("drops the business name for personal orders and ignores an unpublished product", async () => {
    await createCustomOrder(
      form({
        orderFor: "personal",
        productSlug: "draft-thing",
        productType: "A lamp",
        message: "",
      }),
    );
    expect(mocks.createBookingCore.mock.calls[0]?.[0]).toMatchObject({
      productId: null,
      message: null,
      brief: { productType: "A lamp", orderFor: "personal" },
    });
    expect(mocks.createBookingCore.mock.calls[0]?.[0].brief).not.toHaveProperty("businessName");
  });

  it("passes slotTaken through from the core", async () => {
    mocks.createBookingCore.mockResolvedValueOnce({ ok: false, error: "errors.slotTaken" });
    expect(await createCustomOrder(form())).toMatchObject({ ok: false, error: "errors.slotTaken" });
  });

  it("shares the booking rate bucket: the sixth attempt from one address is refused", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.9" }));
    for (let i = 0; i < 5; i++) expect((await createCustomOrder(form())).ok).toBe(true);
    expect(await createCustomOrder(form())).toMatchObject({
      ok: false,
      error: "errors.rateLimited",
    });
    expect(mocks.createBookingCore).toHaveBeenCalledTimes(5);
  });

  it("uploads each photo under the booking id and stores the paths in the brief", async () => {
    const result = await createCustomOrder(form({}, [png("a.png"), png("b.png")]));
    expect(result.ok).toBe(true);
    expect(mocks.uploadStorageObject).toHaveBeenCalledTimes(2);
    expect(mocks.uploadStorageObject).toHaveBeenCalledWith(
      "booking-uploads",
      expect.stringMatching(/^b1\/[0-9a-f-]{36}\.webp$/),
      Buffer.from("webp"),
      "image/webp",
    );
    const set = dbMock.methodCalls("set")[0]?.[0] as { brief: { photoPaths: string[] } };
    expect(set.brief).toMatchObject({ productType: "Eid Mug", orderFor: "business" });
    expect(set.brief.photoPaths).toHaveLength(2);
    expect(set.brief.photoPaths[0]).toMatch(/^b1\//);
  });

  it("keeps the booking, removes uploaded photos and warns when a later upload fails", async () => {
    mocks.uploadStorageObject
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("storage down"));
    const result = await createCustomOrder(form({}, [png("a.png"), png("b.png")]));
    expect(result).toMatchObject({ ok: true, data: { warning: "wizard.photos.failed" } });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("booking-uploads", [
      expect.stringMatching(/^b1\//),
    ]);
    expect(dbMock.methodCalls("set")).toHaveLength(0);
    expect(mocks.createBookingCore).toHaveBeenCalledTimes(1);
  });

  it("warns on a wrong type or too many photos without uploading anything", async () => {
    const gif = new File([new Uint8Array(8)], "x.gif", { type: "image/gif" });
    expect(await createCustomOrder(form({}, [gif]))).toMatchObject({
      ok: true,
      data: { warning: "errors.imageType" },
    });
    expect(await createCustomOrder(form({}, [png(), png(), png(), png()]))).toMatchObject({
      ok: true,
      data: { warning: "wizard.photos.tooMany" },
    });
    expect(mocks.uploadStorageObject).not.toHaveBeenCalled();
  });

  it("attaches the wishlist by slug only (ids ignored) and reports the count", async () => {
    const fd = form();
    for (const slug of ["lamp", WISHLIST_CARDS.frame.id, "draft-thing"]) {
      fd.append("wishlistSlugs", slug);
    }
    const result = await createCustomOrder(fd);
    expect(result).toMatchObject({ ok: true, data: { summary: { wishlistCount: 1 } } });
    expect(mocks.listPublishedProductsBySlugs).toHaveBeenCalledWith(["lamp", "draft-thing"]);
    expect(mocks.createBookingCore.mock.calls[0]?.[0]).toMatchObject({
      wishlistProductIds: [WISHLIST_CARDS.lamp.id],
    });
  });
});
