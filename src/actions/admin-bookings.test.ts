import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      requireOwner: vi.fn(),
      getBookingById: vi.fn(),
      sendBookingEmail: vi.fn(),
      rescheduleBookingCore: vi.fn(),
      revalidatePath: vi.fn(),
      after: vi.fn(),
    },
  };
});
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/db/queries/bookings", () => ({ getBookingById: mocks.getBookingById }));
vi.mock("@/lib/booking/emails", () => ({ sendBookingEmail: mocks.sendBookingEmail }));
vi.mock("@/lib/booking/reschedule-booking", () => ({
  rescheduleBookingCore: mocks.rescheduleBookingCore,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/server", () => ({ after: mocks.after }));

import {
  cancelBooking,
  confirmBooking,
  markDone,
  rescheduleBooking,
  saveBookingNotes,
} from "./admin-bookings";

const ID = "11111111-1111-4111-8111-111111111111";
const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
const base = {
  id: ID,
  status: "new",
  startsAt: future,
  endsAt: new Date(future.getTime() + 1_800_000),
  customerEmail: "a@example.com",
};

/** Run whatever the action scheduled with after() and return the scheduled count. */
async function flushAfter() {
  for (const call of mocks.after.mock.calls) await (call[0] as () => Promise<void>)();
  return mocks.after.mock.calls.length;
}

beforeEach(() => {
  dbMock.reset();
  mocks.after.mockReset();
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
  mocks.sendBookingEmail.mockReset().mockResolvedValue({ ok: true });
  mocks.getBookingById.mockReset().mockResolvedValue(base);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("confirmBooking", () => {
  it("validates before auth", async () => {
    expect(await confirmBooking("nope")).toMatchObject({ ok: false, error: "errors.invalidInput" });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("confirms a new booking, emails the customer after the response, revalidates", async () => {
    dbMock.queueResults([{ ...base, status: "confirmed" }]);
    expect(await confirmBooking(ID)).toEqual({ ok: true, data: { status: "confirmed" } });
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({ status: "confirmed" });
    expect(await flushAfter()).toBe(1);
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith(
      "confirmed",
      expect.objectContaining({ status: "confirmed" }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/bookings", "layout");
  });

  it("is invalidStatus when the booking exists but is not new, notFound when it does not", async () => {
    dbMock.queueResults([]);
    mocks.getBookingById.mockResolvedValueOnce({ ...base, status: "confirmed" });
    expect(await confirmBooking(ID)).toMatchObject({ ok: false, error: "errors.invalidStatus" });
    dbMock.queueResults([]);
    mocks.getBookingById.mockResolvedValueOnce(null);
    expect(await confirmBooking(ID)).toMatchObject({ ok: false, error: "errors.bookingNotFound" });
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("a throwing email send is caught after the response", async () => {
    dbMock.queueResults([{ ...base, status: "confirmed" }]);
    mocks.sendBookingEmail.mockRejectedValueOnce(new Error("smtp"));
    expect((await confirmBooking(ID)).ok).toBe(true);
    await expect(flushAfter()).resolves.toBe(1);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("rescheduleBooking", () => {
  const target = new Date(future.getTime() + 24 * 60 * 60 * 1000).toISOString();

  it("rejects done, cancelled and past bookings without touching the core", async () => {
    mocks.getBookingById.mockResolvedValueOnce({ ...base, status: "done" });
    expect(await rescheduleBooking(ID, target)).toMatchObject({
      ok: false,
      error: "errors.invalidStatus",
    });
    mocks.getBookingById.mockResolvedValueOnce({ ...base, status: "cancelled" });
    expect(await rescheduleBooking(ID, target)).toMatchObject({
      ok: false,
      error: "errors.invalidStatus",
    });
    mocks.getBookingById.mockResolvedValueOnce({ ...base, status: "confirmed", startsAt: past });
    expect(await rescheduleBooking(ID, target)).toMatchObject({
      ok: false,
      error: "errors.bookingPast",
    });
    expect(mocks.rescheduleBookingCore).not.toHaveBeenCalled();
  });

  it("maps slotTaken from the core and sends nothing", async () => {
    mocks.rescheduleBookingCore.mockResolvedValue({ ok: false, error: "errors.slotTaken" });
    expect(await rescheduleBooking(ID, target)).toMatchObject({
      ok: false,
      error: "errors.slotTaken",
    });
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("moves the booking, keeps status, emails rescheduled", async () => {
    const moved = { ...base, status: "confirmed", startsAt: new Date(target) };
    mocks.getBookingById.mockResolvedValueOnce({ ...base, status: "confirmed" });
    mocks.rescheduleBookingCore.mockResolvedValue({ ok: true, booking: moved });
    expect(await rescheduleBooking(ID, target)).toEqual({ ok: true, data: { startsAt: target } });
    expect(mocks.rescheduleBookingCore).toHaveBeenCalledWith(ID, new Date(target), {
      ignoreMinNotice: true,
    });
    await flushAfter();
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith("rescheduled", moved);
    expect(dbMock.methodCalls("set")).toHaveLength(0); // no token rotation here
  });

  it("rejects an unparsable slot", async () => {
    expect(await rescheduleBooking(ID, "soon")).toMatchObject({
      ok: false,
      error: "errors.slotUnavailable",
    });
  });
});

describe("cancelBooking", () => {
  it("cancels new or confirmed and emails the customer", async () => {
    dbMock.queueResults([{ ...base, status: "cancelled" }]);
    expect(await cancelBooking(ID)).toEqual({ ok: true, data: { status: "cancelled" } });
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({ status: "cancelled" });
    await flushAfter();
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith(
      "cancelled",
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("refuses done (terminal) and already cancelled bookings", async () => {
    dbMock.queueResults([]);
    mocks.getBookingById.mockResolvedValueOnce({ ...base, status: "done" });
    expect(await cancelBooking(ID)).toMatchObject({ ok: false, error: "errors.invalidStatus" });
    dbMock.queueResults([]);
    mocks.getBookingById.mockResolvedValueOnce({ ...base, status: "cancelled" });
    expect(await cancelBooking(ID)).toMatchObject({ ok: false, error: "errors.invalidStatus" });
    expect(mocks.after).not.toHaveBeenCalled();
  });
});

describe("markDone", () => {
  it("marks a past confirmed booking done with no email", async () => {
    dbMock.queueResults([{ ...base, status: "done", startsAt: past }]);
    expect(await markDone(ID)).toEqual({ ok: true, data: { status: "done" } });
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("refuses a future booking (bookingPast) and a cancelled one (invalidStatus)", async () => {
    dbMock.queueResults([]);
    mocks.getBookingById.mockResolvedValueOnce({ ...base, status: "confirmed", startsAt: future });
    expect(await markDone(ID)).toMatchObject({ ok: false, error: "errors.bookingPast" });
    dbMock.queueResults([]);
    mocks.getBookingById.mockResolvedValueOnce({ ...base, status: "cancelled", startsAt: past });
    expect(await markDone(ID)).toMatchObject({ ok: false, error: "errors.invalidStatus" });
  });
});

describe("saveBookingNotes", () => {
  it("saves trimmed notes, stores null for empty, no email", async () => {
    dbMock.queueResults([{ id: ID }]);
    expect(await saveBookingNotes(ID, "  Bring samples ")).toEqual({
      ok: true,
      data: { notes: "Bring samples" },
    });
    expect(dbMock.methodCalls("set")[0]?.[0]).toEqual({ privateNotes: "Bring samples" });
    dbMock.queueResults([{ id: ID }]);
    await saveBookingNotes(ID, "   ");
    expect(dbMock.methodCalls("set")[1]?.[0]).toEqual({ privateNotes: null });
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("rejects notes over 2000 characters before auth", async () => {
    const result = await saveBookingNotes(ID, "x".repeat(2001));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.notes).toEqual(["errors.tooLong"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });
});
