import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      getBookingSettings: vi.fn(),
      getAvailabilityContext: vi.fn(),
      getBookingById: vi.fn(),
      execute: vi.fn(),
    },
  };
});
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/db/queries/availability", () => ({
  getBookingSettings: mocks.getBookingSettings,
  getAvailabilityContext: mocks.getAvailabilityContext,
}));
vi.mock("@/db/queries/bookings", () => ({ getBookingById: mocks.getBookingById }));

import { DEFAULT_AVAILABILITY_RULES, DEFAULT_BOOKING_SETTINGS } from "./defaults";
import { rescheduleBookingCore } from "./reschedule-booking";
import { melbourneWallClock } from "./slots";

(dbMock.db as unknown as { execute: unknown }).execute = mocks.execute;

const now = new Date("2026-07-14T23:00:00Z"); // Wed 15 Jul 09:00 Melbourne
const settings = { ...DEFAULT_BOOKING_SETTINGS, minNoticeHours: 0 };
const existing = {
  id: "b1",
  status: "new",
  startsAt: melbourneWallClock("2026-07-15", "11:00"),
  endsAt: melbourneWallClock("2026-07-15", "11:30"),
  reminderSentAt: new Date("2026-07-14T00:00:00Z"),
};

beforeEach(() => {
  dbMock.reset();
  mocks.execute.mockResolvedValue(undefined);
  mocks.getBookingSettings.mockResolvedValue(settings);
  mocks.getBookingById.mockResolvedValue(existing);
  mocks.getAvailabilityContext.mockResolvedValue({
    settings,
    rules: DEFAULT_AVAILABILITY_RULES,
    blockedPeriods: [],
    bookings: [{ startsAt: existing.startsAt, endsAt: existing.endsAt }], // itself
  });
});

describe("rescheduleBookingCore", () => {
  it("returns notFound for a missing or cancelled booking", async () => {
    mocks.getBookingById.mockResolvedValueOnce(null);
    expect(await rescheduleBookingCore("b1", existing.startsAt, { now })).toEqual({
      ok: false,
      error: "errors.notFound",
    });
    mocks.getBookingById.mockResolvedValueOnce({ ...existing, status: "cancelled" });
    expect(await rescheduleBookingCore("b1", existing.startsAt, { now })).toEqual({
      ok: false,
      error: "errors.notFound",
    });
  });

  it("ignores its own interval so an adjacent slot is available, and updates start/end", async () => {
    const target = melbourneWallClock("2026-07-15", "11:30");
    const updated = {
      ...existing,
      startsAt: target,
      endsAt: melbourneWallClock("2026-07-15", "12:00"),
    };
    dbMock.queueResults([], [updated]);
    const result = await rescheduleBookingCore("b1", target, { now });
    expect(result).toEqual({ ok: true, booking: updated });
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({ startsAt: target });
    expect(dbMock.methodCalls("set")[0]?.[0]).not.toHaveProperty("reminderSentAt"); // < 24h away
  });

  it("clears reminder_sent_at when the new start is more than 24h away", async () => {
    const target = melbourneWallClock("2026-07-17", "10:00");
    dbMock.queueResults([], [{ ...existing, startsAt: target }]);
    await rescheduleBookingCore("b1", target, { now });
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({ reminderSentAt: null });
  });

  it("respects the minimum notice unless ignoreMinNotice is set (owner reschedule)", async () => {
    const strict = { ...settings, minNoticeHours: 24 };
    mocks.getBookingSettings.mockResolvedValue(strict);
    mocks.getAvailabilityContext.mockResolvedValue({
      settings: strict,
      rules: DEFAULT_AVAILABILITY_RULES,
      blockedPeriods: [],
      bookings: [],
    });
    const soon = melbourneWallClock("2026-07-15", "15:00"); // 6h after now
    expect(await rescheduleBookingCore("b1", soon, { now })).toEqual({
      ok: false,
      error: "errors.slotUnavailable",
    });
    dbMock.queueResults([], [{ ...existing, startsAt: soon }]);
    expect((await rescheduleBookingCore("b1", soon, { now, ignoreMinNotice: true })).ok).toBe(true);
  });

  it("rejects a start the rules do not generate, or one another booking holds", async () => {
    expect(
      await rescheduleBookingCore("b1", melbourneWallClock("2026-07-15", "11:10"), { now }),
    ).toEqual({ ok: false, error: "errors.slotUnavailable" });
    mocks.getAvailabilityContext.mockResolvedValueOnce({
      settings,
      rules: DEFAULT_AVAILABILITY_RULES,
      blockedPeriods: [],
      bookings: [
        { startsAt: existing.startsAt, endsAt: existing.endsAt },
        {
          startsAt: melbourneWallClock("2026-07-15", "12:00"),
          endsAt: melbourneWallClock("2026-07-15", "12:30"),
        },
      ],
    });
    expect(
      await rescheduleBookingCore("b1", melbourneWallClock("2026-07-15", "12:00"), { now }),
    ).toEqual({ ok: false, error: "errors.slotUnavailable" });
  });

  it("maps an in-transaction conflict and the exclusion constraint to slotTaken", async () => {
    dbMock.queueResults([{ id: "other" }]);
    expect(
      await rescheduleBookingCore("b1", melbourneWallClock("2026-07-15", "12:00"), { now }),
    ).toEqual({ ok: false, error: "errors.slotTaken" });
    dbMock.db.transaction.mockRejectedValueOnce(new Error("x", { cause: { code: "23P01" } }));
    expect(
      await rescheduleBookingCore("b1", melbourneWallClock("2026-07-15", "12:00"), { now }),
    ).toEqual({ ok: false, error: "errors.slotTaken" });
  });
});
