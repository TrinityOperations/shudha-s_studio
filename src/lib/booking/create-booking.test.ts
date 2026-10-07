import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      getBookingSettings: vi.fn(),
      getAvailabilityContext: vi.fn(),
      onBookingCreated: vi.fn(),
      execute: vi.fn(),
    },
  };
});

vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/db/queries/availability", () => ({
  getBookingSettings: mocks.getBookingSettings,
  getAvailabilityContext: mocks.getAvailabilityContext,
}));
vi.mock("./hooks", () => ({ onBookingCreated: mocks.onBookingCreated }));

import { DEFAULT_AVAILABILITY_RULES, DEFAULT_BOOKING_SETTINGS } from "./defaults";
import { createBookingCore, isExclusionViolation, type CreateBookingInput } from "./create-booking";
import { melbourneWallClock } from "./slots";

// The mock db has no execute(); the core calls tx.execute for the advisory lock.
(dbMock.db as unknown as { execute: unknown }).execute = mocks.execute;

const now = new Date("2026-07-14T23:00:00Z"); // Wed 15 Jul 09:00 Melbourne
const settings = { ...DEFAULT_BOOKING_SETTINGS, minNoticeHours: 0 };
const input: CreateBookingInput = {
  startsAt: melbourneWallClock("2026-07-15", "11:00"),
  consultationType: "phone",
  customerName: "Asha",
  customerPhone: "61412345678",
  customerEmail: "asha@example.com",
  productId: null,
  message: "Hi",
};
const row = {
  id: "b1",
  ...input,
  status: "new",
  endsAt: melbourneWallClock("2026-07-15", "11:30"),
};

beforeEach(() => {
  dbMock.reset();
  mocks.execute.mockResolvedValue(undefined);
  mocks.onBookingCreated.mockResolvedValue(undefined);
  mocks.getBookingSettings.mockResolvedValue(settings);
  mocks.getAvailabilityContext.mockResolvedValue({
    settings,
    rules: DEFAULT_AVAILABILITY_RULES,
    blockedPeriods: [],
    bookings: [],
  });
});

describe("createBookingCore", () => {
  it("rejects a start that the rules do not generate, before any transaction", async () => {
    const result = await createBookingCore(
      { ...input, startsAt: melbourneWallClock("2026-07-15", "11:10") },
      { now },
    );
    expect(result).toEqual({ ok: false, error: "errors.slotUnavailable" });
    expect(dbMock.db.transaction).not.toHaveBeenCalled();
  });

  it("rejects a slot that is already taken in the generated set (buffer included)", async () => {
    mocks.getAvailabilityContext.mockResolvedValue({
      settings,
      rules: DEFAULT_AVAILABILITY_RULES,
      blockedPeriods: [],
      bookings: [{ startsAt: input.startsAt, endsAt: row.endsAt }],
    });
    expect(await createBookingCore(input, { now })).toEqual({
      ok: false,
      error: "errors.slotUnavailable",
    });
  });

  it("locks, re-checks, inserts with status new and calls the hook", async () => {
    dbMock.queueResults([], [row]); // conflicts → none, insert returning → row
    const result = await createBookingCore(input, { now });
    expect(result).toEqual({ ok: true, booking: row });
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(dbMock.methodCalls("values")[0]?.[0]).toMatchObject({
      status: "new",
      locale: "en",
      consultationType: "phone",
      customerPhone: "61412345678",
      startsAt: input.startsAt,
      endsAt: row.endsAt,
    });
    expect(dbMock.methodCalls("values")[0]?.[0]).not.toHaveProperty("brief");
    expect(mocks.onBookingCreated).toHaveBeenCalledWith(row);
  });

  it("passes brief and wishlistProductIds through unchanged for #7 and #8", async () => {
    dbMock.queueResults([], [row]);
    const brief = { productType: "mug", quantity: 2 };
    const wishlistProductIds = ["11111111-1111-4111-8111-111111111111"];
    await createBookingCore({ ...input, brief, wishlistProductIds }, { now });
    expect(dbMock.methodCalls("values")[0]?.[0]).toMatchObject({ brief, wishlistProductIds });
  });

  it("returns slotTaken when the in-transaction re-check finds a conflict", async () => {
    dbMock.queueResults([{ id: "other" }]);
    expect(await createBookingCore(input, { now })).toEqual({
      ok: false,
      error: "errors.slotTaken",
    });
    expect(dbMock.methodCalls("insert")).toHaveLength(0);
  });

  it("maps the exclusion constraint (23P01) to slotTaken", async () => {
    dbMock.queueResults([]);
    const pgError = Object.assign(new Error("conflicting key value"), { code: "23P01" });
    dbMock.db.transaction.mockRejectedValueOnce(new Error("query failed", { cause: pgError }));
    expect(await createBookingCore(input, { now })).toEqual({
      ok: false,
      error: "errors.slotTaken",
    });
  });

  it("rethrows other database errors", async () => {
    dbMock.db.transaction.mockRejectedValueOnce(new Error("connection lost"));
    await expect(createBookingCore(input, { now })).rejects.toThrow("connection lost");
  });

  it("a failing hook never undoes the booking", async () => {
    dbMock.queueResults([], [row]);
    mocks.onBookingCreated.mockRejectedValueOnce(new Error("smtp down"));
    expect(await createBookingCore(input, { now })).toEqual({ ok: true, booking: row });
  });
});

describe("isExclusionViolation", () => {
  it("finds the code directly or nested in cause", () => {
    expect(isExclusionViolation({ code: "23P01" })).toBe(true);
    expect(isExclusionViolation(new Error("x", { cause: { cause: { code: "23P01" } } }))).toBe(
      true,
    );
    expect(isExclusionViolation({ code: "23505" })).toBe(false);
    expect(isExclusionViolation(null)).toBe(false);
  });
});
