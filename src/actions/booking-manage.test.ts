import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      getBookingByManageToken: vi.fn(),
      getBookingProductTitle: vi.fn(),
      sendBookingEmail: vi.fn(),
      rescheduleBookingCore: vi.fn(),
      headers: vi.fn(),
    },
  };
});
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/db/queries/bookings", () => ({
  getBookingByManageToken: mocks.getBookingByManageToken,
  getBookingProductTitle: mocks.getBookingProductTitle,
}));
vi.mock("@/lib/booking/emails", () => ({ sendBookingEmail: mocks.sendBookingEmail }));
vi.mock("@/lib/booking/reschedule-booking", () => ({
  rescheduleBookingCore: mocks.rescheduleBookingCore,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

import { checkRateLimit, resetRateLimit } from "@/lib/booking/rate-limit";
import { cancelBooking, rescheduleBooking } from "./booking-manage";

const TOKEN = "33333333-3333-4333-8333-333333333333";
const booking = {
  id: "b1",
  status: "new",
  startsAt: new Date("2026-07-15T01:00:00.000Z"),
  endsAt: new Date("2026-07-15T01:30:00.000Z"),
  consultationType: "phone",
  productId: null,
  manageToken: TOKEN,
  customerEmail: "a@example.com",
};
let ip = 0;

beforeEach(() => {
  dbMock.reset();
  resetRateLimit();
  mocks.headers.mockResolvedValue(
    new Headers({ "x-nf-client-connection-ip": `203.0.113.${++ip}` }),
  );
  mocks.getBookingByManageToken.mockResolvedValue(booking);
  mocks.getBookingProductTitle.mockResolvedValue(null);
  mocks.sendBookingEmail.mockReset().mockResolvedValue({ ok: true });
  mocks.rescheduleBookingCore.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("cancelBooking", () => {
  it("rejects a malformed, unknown or expired token", async () => {
    expect(await cancelBooking("nope")).toMatchObject({
      ok: false,
      error: "errors.manageLinkInvalid",
    });
    mocks.getBookingByManageToken.mockResolvedValueOnce(null); // unknown, cancelled or in the past
    expect(await cancelBooking(TOKEN)).toMatchObject({
      ok: false,
      error: "errors.manageLinkInvalid",
    });
    expect(dbMock.methodCalls("update")).toHaveLength(0);
  });

  it("cancels, rotates the token, emails both sides and returns a summary", async () => {
    const updated = { ...booking, status: "cancelled", manageToken: "new-token" };
    dbMock.queueResults([updated]);
    const result = await cancelBooking(TOKEN);
    expect(result).toEqual({
      ok: true,
      data: {
        summary: {
          id: "b1",
          date: "Wednesday 15 July 2026",
          time: "11:00 am",
          consultationType: "phone",
          productTitle: null,
          productTitleBn: null,
        },
      },
    });
    const set = dbMock.methodCalls("set")[0]?.[0] as {
      status: string;
      manageToken: string;
      cancelledAt: Date;
    };
    expect(set.status).toBe("cancelled");
    expect(set.manageToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(set.manageToken).not.toBe(TOKEN);
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith("cancelled", updated);
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith("owner-cancelled", updated);
  });

  it("cancelling twice fails the second time because the token no longer matches", async () => {
    dbMock.queueResults([{ ...booking, status: "cancelled" }], []); // second update matches no row
    expect((await cancelBooking(TOKEN)).ok).toBe(true);
    mocks.getBookingByManageToken.mockResolvedValueOnce(null);
    expect(await cancelBooking(TOKEN)).toMatchObject({
      ok: false,
      error: "errors.manageLinkInvalid",
    });
  });

  it("uses its own rate-limit bucket", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-nf-client-connection-ip": "203.0.113.250" }));
    for (let i = 0; i < 5; i++) checkRateLimit("203.0.113.250"); // the booking bucket is full…
    dbMock.queueResults([{ ...booking, status: "cancelled" }]);
    expect((await cancelBooking(TOKEN)).ok).toBe(true); // …but manage still works
    for (let i = 0; i < 4; i++) checkRateLimit("manage:203.0.113.250");
    expect(await cancelBooking(TOKEN)).toMatchObject({ ok: false, error: "errors.rateLimited" });
  });
});

describe("rescheduleBooking", () => {
  const target = "2026-07-16T01:00:00.000Z";

  it("validates token and slot before any lookup", async () => {
    expect(await rescheduleBooking({ token: "bad", slotStart: target })).toMatchObject({
      ok: false,
      error: "errors.manageLinkInvalid",
    });
    expect(await rescheduleBooking({ token: TOKEN, slotStart: "soon" })).toMatchObject({
      ok: false,
      error: "errors.slotUnavailable",
    });
    expect(mocks.getBookingByManageToken).not.toHaveBeenCalled();
  });

  it("passes slotTaken through and does not rotate the token or email", async () => {
    mocks.rescheduleBookingCore.mockResolvedValue({ ok: false, error: "errors.slotTaken" });
    expect(await rescheduleBooking({ token: TOKEN, slotStart: target })).toMatchObject({
      ok: false,
      error: "errors.slotTaken",
    });
    expect(dbMock.methodCalls("update")).toHaveLength(0);
    expect(mocks.sendBookingEmail).not.toHaveBeenCalled();
  });

  it("moves the booking, rotates the token, and emails customer and owner with the new link", async () => {
    const moved = {
      ...booking,
      startsAt: new Date(target),
      endsAt: new Date("2026-07-16T01:30:00.000Z"),
    };
    mocks.rescheduleBookingCore.mockResolvedValue({ ok: true, booking: moved });
    const rotated = { ...moved, manageToken: "rotated" };
    dbMock.queueResults([rotated]);
    const result = await rescheduleBooking({ token: TOKEN, slotStart: target });
    expect(result).toMatchObject({
      ok: true,
      data: { summary: { date: "Thursday 16 July 2026", time: "11:00 am" } },
    });
    expect(mocks.rescheduleBookingCore).toHaveBeenCalledWith("b1", new Date(target));
    const set = dbMock.methodCalls("set")[0]?.[0] as { manageToken: string };
    expect(set.manageToken).not.toBe(TOKEN);
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith("rescheduled", rotated);
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith("owner-rescheduled", rotated);
  });
});
