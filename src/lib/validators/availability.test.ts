import { describe, expect, it } from "vitest";
import { blockedPeriodSchema, bookingSettingsSchema, weeklyHoursSchema } from "./availability";

const day = (
  weekday: number,
  over: Partial<{ active: boolean; startTime: string; endTime: string }> = {},
) => ({
  weekday,
  active: true,
  startTime: "10:00",
  endTime: "18:00",
  ...over,
});

describe("weeklyHoursSchema", () => {
  it("accepts seven rows and ignores times on inactive days", () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((w) =>
      day(w, w === 0 ? { active: false, startTime: "18:00", endTime: "10:00" } : {}),
    );
    expect(weeklyHoursSchema.safeParse({ days }).success).toBe(true);
  });

  it("rejects end before start on an active day, and the wrong number of rows", () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((w) => day(w, w === 2 ? { endTime: "09:00" } : {}));
    const r = weeklyHoursSchema.safeParse({ days });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({
      message: "errors.endBeforeStart",
      path: ["days", 2, "endTime"],
    });
    expect(weeklyHoursSchema.safeParse({ days: days.slice(0, 6) }).success).toBe(false);
    expect(
      weeklyHoursSchema.safeParse({ days: days.map((d) => ({ ...d, endTime: "25:00" })) }).error
        ?.issues[0]?.message,
    ).toBe("errors.datetime");
  });
});

describe("bookingSettingsSchema", () => {
  const valid = {
    slotMinutes: 30,
    bufferMinutes: 0,
    horizonDays: 28,
    minNoticeHours: 24,
    consultationTypes: ["phone"],
  };
  it("enforces the ranges and at least one consultation type", () => {
    expect(bookingSettingsSchema.safeParse(valid).success).toBe(true);
    expect(
      bookingSettingsSchema.safeParse({ ...valid, slotMinutes: 10 }).error?.issues[0]?.message,
    ).toBe("errors.range");
    expect(
      bookingSettingsSchema.safeParse({ ...valid, horizonDays: 91 }).error?.issues[0]?.message,
    ).toBe("errors.range");
    expect(
      bookingSettingsSchema.safeParse({ ...valid, bufferMinutes: 7.5 }).error?.issues[0]?.message,
    ).toBe("errors.range");
    expect(
      bookingSettingsSchema.safeParse({ ...valid, consultationTypes: [] }).error?.issues[0]
        ?.message,
    ).toBe("errors.typeRequired");
  });
});

describe("blockedPeriodSchema", () => {
  it("accepts datetime-local strings with or without seconds and requires end after start", () => {
    expect(
      blockedPeriodSchema.safeParse({
        startsAt: "2026-12-24T09:00",
        endsAt: "2026-12-27T18:00:00",
        reason: "Christmas",
      }).success,
    ).toBe(true);
    const r = blockedPeriodSchema.safeParse({
      startsAt: "2026-12-24T09:00",
      endsAt: "2026-12-24T09:00",
      reason: "",
    });
    expect(r.error?.issues[0]).toMatchObject({
      message: "errors.endBeforeStart",
      path: ["endsAt"],
    });
    expect(
      blockedPeriodSchema.safeParse({
        startsAt: "24/12/2026 9am",
        endsAt: "2026-12-27T18:00",
        reason: "",
      }).error?.issues[0]?.message,
    ).toBe("errors.datetime");
  });
});
