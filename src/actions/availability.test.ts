import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return { dbMock: createDbMock(), mocks: { requireOwner: vi.fn(), revalidatePath: vi.fn() } };
});
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  addBlockedPeriod,
  deleteBlockedPeriod,
  saveBookingSettings,
  saveWeeklyHours,
} from "./availability";

const days = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  active: weekday !== 0,
  startTime: "10:00",
  endTime: "18:00",
}));
const B1 = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  dbMock.reset();
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
});

describe("saveWeeklyHours", () => {
  it("validates before auth and reports the row with end before start", async () => {
    const bad = days.map((d) => (d.weekday === 3 ? { ...d, endTime: "09:00" } : d));
    const result = await saveWeeklyHours({ days: bad });
    expect(result).toMatchObject({ ok: false, error: "errors.invalidInput" });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("replaces all rules in one transaction and revalidates the booking page", async () => {
    expect(await saveWeeklyHours({ days })).toEqual({ ok: true, data: undefined });
    expect(mocks.requireOwner).toHaveBeenCalledOnce();
    expect(dbMock.db.transaction).toHaveBeenCalledOnce();
    expect(dbMock.methodCalls("delete")).toHaveLength(1);
    const inserted = dbMock.methodCalls("values")[0]?.[0] as unknown[];
    expect(inserted).toHaveLength(7);
    expect(inserted[0]).toEqual({
      weekday: 0,
      startTime: "10:00",
      endTime: "18:00",
      active: false,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/book");
  });
});

describe("saveBookingSettings", () => {
  it("rejects out-of-range values and an empty type list", async () => {
    const r = await saveBookingSettings({
      slotMinutes: 5,
      bufferMinutes: 0,
      horizonDays: 28,
      minNoticeHours: 24,
      consultationTypes: [],
    });
    if (r.ok) throw new Error("expected failure");
    expect(r.fieldErrors?.slotMinutes).toEqual(["errors.range"]);
    expect(r.fieldErrors?.consultationTypes).toEqual(["errors.typeRequired"]);
  });

  it("upserts the singleton row", async () => {
    const input = {
      slotMinutes: 45,
      bufferMinutes: 15,
      horizonDays: 14,
      minNoticeHours: 12,
      consultationTypes: ["video" as const],
    };
    expect(await saveBookingSettings(input)).toEqual({ ok: true, data: input });
    expect(dbMock.methodCalls("values")[0]?.[0]).toEqual({ id: 1, ...input });
    expect(dbMock.methodCalls("onConflictDoUpdate")).toHaveLength(1);
  });
});

describe("blocked periods", () => {
  it("adds a period, converting Melbourne wall-clock to UTC", async () => {
    dbMock.queueResults([{ id: B1 }]);
    const result = await addBlockedPeriod({
      startsAt: "2026-12-24T09:00",
      endsAt: "2026-12-27T18:00",
      reason: " Christmas ",
    });
    expect(result).toEqual({ ok: true, data: { id: B1 } });
    const values = dbMock.methodCalls("values")[0]?.[0] as {
      startsAt: Date;
      endsAt: Date;
      reason: string;
    };
    expect(values.startsAt.toISOString()).toBe("2026-12-23T22:00:00.000Z"); // AEDT, +11
    expect(values.endsAt.toISOString()).toBe("2026-12-27T07:00:00.000Z");
    expect(values.reason).toBe("Christmas");
  });

  it("rejects end before start before auth", async () => {
    const r = await addBlockedPeriod({
      startsAt: "2026-12-27T18:00",
      endsAt: "2026-12-24T09:00",
      reason: "",
    });
    if (r.ok) throw new Error("expected failure");
    expect(r.fieldErrors?.endsAt).toEqual(["errors.endBeforeStart"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("deletes and reports notFound otherwise", async () => {
    dbMock.queueResults([{ id: B1 }]);
    expect(await deleteBlockedPeriod(B1)).toEqual({ ok: true, data: undefined });
    dbMock.queueResults([]);
    expect(await deleteBlockedPeriod(B1)).toMatchObject({ ok: false, error: "errors.notFound" });
    expect(await deleteBlockedPeriod("nope")).toMatchObject({
      ok: false,
      error: "errors.invalidInput",
    });
  });
});
