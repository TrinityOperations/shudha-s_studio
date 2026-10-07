import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendBookingEmail: vi.fn() }));
vi.mock("./emails", () => ({ sendBookingEmail: mocks.sendBookingEmail }));

import type { Booking } from "@/db/schema";
import { onBookingCreated } from "./hooks";

const booking = { id: "b1", customerEmail: "a@example.com" } as unknown as Booking;

beforeEach(() => {
  mocks.sendBookingEmail.mockReset().mockResolvedValue({ ok: true });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("onBookingCreated", () => {
  it("sends the customer 'received' email and the owner notification", async () => {
    await onBookingCreated(booking);
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith("received", booking);
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith("owner-new", booking);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs a failed send and swallows a throw", async () => {
    mocks.sendBookingEmail
      .mockResolvedValueOnce({ ok: false, error: "boom" })
      .mockResolvedValueOnce({ ok: true });
    await expect(onBookingCreated(booking)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(1);
    mocks.sendBookingEmail.mockRejectedValue(new Error("network"));
    await expect(onBookingCreated(booking)).resolves.toBeUndefined();
  });
});
