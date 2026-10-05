import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      headers: vi.fn(),
      verifyTurnstile: vi.fn(),
      getAvailabilitySettings: vi.fn(),
      getAvailableSlots: vi.fn(),
      processProductImage: vi.fn(),
      uploadStorageObject: vi.fn(),
      removeStorageObjects: vi.fn(),
      onBookingCreated: vi.fn(),
    },
  };
});

vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: mocks.verifyTurnstile }));
vi.mock("@/db/queries/availability", () => ({
  getAvailabilitySettings: mocks.getAvailabilitySettings,
  getAvailableSlots: mocks.getAvailableSlots,
}));
vi.mock("@/lib/images", () => ({ processProductImage: mocks.processProductImage }));
vi.mock("@/lib/storage.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage.server")>()),
  uploadStorageObject: mocks.uploadStorageObject,
  removeStorageObjects: mocks.removeStorageObjects,
}));
vi.mock("@/lib/booking/created", () => ({ onBookingCreated: mocks.onBookingCreated }));

import { clearBookingRateLimits } from "@/lib/booking/rate-limit";
import { createBooking } from "./booking";

const startsAt = "2026-10-06T00:00:00.000Z";
const slot = {
  startsAt,
  endsAt: "2026-10-06T00:30:00.000Z",
  localDate: "2026-10-06",
  localTime: "11:00",
};

function validFormData() {
  const form = new FormData();
  form.set("startsAt", startsAt);
  form.set("customerName", "Alex Example");
  form.set("customerPhone", "0400000000");
  form.set("customerEmail", "alex@example.com");
  form.set("productId", "");
  form.set("message", "A custom gift");
  form.set("consultationType", "phone");
  form.set("turnstileToken", "token");
  return form;
}

beforeEach(() => {
  dbMock.reset();
  clearBookingRateLimits();
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.1" }));
  mocks.verifyTurnstile.mockResolvedValue(true);
  mocks.getAvailabilitySettings.mockResolvedValue({ consultationTypes: ["phone"] });
  mocks.getAvailableSlots.mockResolvedValue([slot]);
  mocks.removeStorageObjects.mockResolvedValue(undefined);
  mocks.uploadStorageObject.mockResolvedValue(undefined);
  mocks.onBookingCreated.mockResolvedValue(undefined);
});

describe("createBooking", () => {
  it("rejects invalid input before Turnstile or database work", async () => {
    const result = await createBooking(new FormData());
    expect(result).toMatchObject({ ok: false, error: "errors.invalidInput" });
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(dbMock.db.transaction).not.toHaveBeenCalled();
  });

  it("requires a valid Turnstile token", async () => {
    mocks.verifyTurnstile.mockResolvedValue(false);
    expect(await createBooking(validFormData())).toMatchObject({
      ok: false,
      error: "errors.turnstile",
    });
    expect(dbMock.db.transaction).not.toHaveBeenCalled();
  });

  it("recomputes the slot in the transaction and inserts server-derived end time", async () => {
    dbMock.queueResults([{ id: "11111111-1111-4111-8111-111111111111" }]);
    const result = await createBooking(validFormData());
    expect(result).toEqual({
      ok: true,
      data: { id: "11111111-1111-4111-8111-111111111111", startsAt },
    });
    expect(mocks.getAvailableSlots).toHaveBeenCalledWith(expect.any(Date), dbMock.db);
    expect(dbMock.methodCalls("values").at(-1)?.[0]).toMatchObject({
      startsAt: new Date(startsAt),
      endsAt: new Date(slot.endsAt),
      customerEmail: "alex@example.com",
    });
  });

  it("returns a stale-slot error when recomputation no longer finds it", async () => {
    mocks.getAvailableSlots.mockResolvedValue([]);
    expect(await createBooking(validFormData())).toMatchObject({
      ok: false,
      error: "booking.errors.slotUnavailable",
    });
  });

  it("translates the exclusion constraint into a slot-taken error", async () => {
    dbMock.db.transaction.mockRejectedValueOnce({
      code: "23P01",
      constraint: "bookings_no_overlap",
    });
    expect(await createBooking(validFormData())).toMatchObject({
      ok: false,
      error: "booking.errors.slotTaken",
    });
  });

  it("uploads a private processed reference image and removes it after a failed insert", async () => {
    const form = validFormData();
    form.set("referenceImage", new File(["image"], "idea.png", { type: "image/png" }));
    mocks.processProductImage.mockResolvedValue({
      full: Buffer.from("full"),
      thumb: Buffer.from("thumb"),
      width: 100,
      height: 100,
    });
    dbMock.db.transaction.mockRejectedValueOnce(new Error("database down"));
    expect(await createBooking(form)).toMatchObject({
      ok: false,
      error: "booking.errors.createFailed",
    });
    expect(mocks.uploadStorageObject).toHaveBeenCalledWith(
      "booking-uploads",
      expect.stringMatching(/^references\/.+\.webp$/),
      Buffer.from("full"),
      "image/webp",
    );
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("booking-uploads", [
      expect.stringMatching(/^references\/.+\.webp$/),
    ]);
  });
});
