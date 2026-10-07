import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: { listReminderCandidates: vi.fn(), sendBookingEmail: vi.fn() },
  };
});
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/db/queries/bookings", () => ({ listReminderCandidates: mocks.listReminderCandidates }));
vi.mock("./emails", () => ({ sendBookingEmail: mocks.sendBookingEmail }));

import { runReminderJob } from "./reminders";

const now = new Date("2026-07-14T00:00:00Z");

beforeEach(() => {
  dbMock.reset();
  mocks.sendBookingEmail.mockReset().mockResolvedValue({ ok: true });
});

describe("runReminderJob", () => {
  it("asks for bookings starting 23–25 hours from now", async () => {
    mocks.listReminderCandidates.mockResolvedValue([]);
    expect(await runReminderJob(now)).toEqual({ claimed: 0, sent: 0, failed: 0 });
    const [from, to] = mocks.listReminderCandidates.mock.calls[0];
    expect(from.toISOString()).toBe("2026-07-14T23:00:00.000Z");
    expect(to.toISOString()).toBe("2026-07-15T01:00:00.000Z");
  });

  it("claims each row before sending and only sends what it claimed", async () => {
    mocks.listReminderCandidates.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    dbMock.queueResults([{ id: "a", customerEmail: "a@x" }], []); // b was claimed by someone else
    expect(await runReminderJob(now)).toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(mocks.sendBookingEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith("reminder", {
      id: "a",
      customerEmail: "a@x",
    });
    expect(dbMock.methodCalls("set")[0]?.[0]).toEqual({ reminderSentAt: now });
  });

  it("a second run with nothing left to claim sends nothing", async () => {
    mocks.listReminderCandidates.mockResolvedValue([{ id: "a" }]);
    dbMock.queueResults([]);
    expect(await runReminderJob(now)).toEqual({ claimed: 0, sent: 0, failed: 0 });
    expect(mocks.sendBookingEmail).not.toHaveBeenCalled();
  });

  it("counts a failed send and releases the claim for the next run", async () => {
    mocks.listReminderCandidates.mockResolvedValue([{ id: "a" }]);
    dbMock.queueResults([{ id: "a" }], []);
    mocks.sendBookingEmail.mockResolvedValue({ ok: false, error: "boom" });
    expect(await runReminderJob(now)).toEqual({ claimed: 1, sent: 0, failed: 1 });
    expect(dbMock.methodCalls("set")).toEqual([
      [{ reminderSentAt: now }],
      [{ reminderSentAt: null }],
    ]);
  });
});
