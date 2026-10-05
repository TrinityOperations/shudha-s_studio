import { describe, expect, it } from "vitest";
import { generateSlots } from "./slots";

const allDays = (startTime = "10:00", endTime = "12:00") =>
  Array.from({ length: 7 }, (_, weekday) => ({ weekday, startTime, endTime, active: true }));

const sunday = (startTime: string, endTime: string) => [
  { weekday: 0, startTime, endTime, active: true },
];

const settings = {
  slotMinutes: 30,
  bufferMinutes: 0,
  horizonDays: 0,
  minNoticeHours: 0,
};

describe("generateSlots", () => {
  it("filters notice, blocked periods, and existing bookings", () => {
    const now = new Date("2026-06-01T00:15:00Z"); // 10:15 Melbourne
    const slots = generateSlots({
      now,
      settings: { ...settings, minNoticeHours: 1 },
      rules: allDays(),
      blockedPeriods: [
        { startsAt: new Date("2026-06-01T01:30:00Z"), endsAt: new Date("2026-06-01T02:00:00Z") },
      ],
      bookings: [
        { startsAt: new Date("2026-06-01T01:00:00Z"), endsAt: new Date("2026-06-01T01:30:00Z") },
      ],
    });
    expect(slots).toEqual([]);
  });

  it("applies the buffer after existing bookings", () => {
    const slots = generateSlots({
      now: new Date("2026-06-01T00:00:00Z"),
      settings: { ...settings, bufferMinutes: 15 },
      rules: allDays("10:00", "12:30"),
      bookings: [
        { startsAt: new Date("2026-06-01T00:00:00Z"), endsAt: new Date("2026-06-01T00:30:00Z") },
      ],
    });
    expect(slots.map((slot) => slot.localTime)).toEqual(["10:45", "11:30"]);
  });

  it("drops nonexistent Melbourne wall times at spring-forward", () => {
    const slots = generateSlots({
      now: new Date("2026-10-03T12:00:00Z"),
      settings: { ...settings, horizonDays: 1 },
      rules: sunday("01:00", "04:00"),
    });
    expect(slots.map((slot) => slot.localTime)).toEqual(["01:00", "01:30", "03:00", "03:30"]);
  });

  it("generates each wall-clock choice once at fall-back", () => {
    const slots = generateSlots({
      now: new Date("2026-04-04T12:00:00Z"),
      settings: { ...settings, horizonDays: 1 },
      rules: sunday("01:00", "04:00"),
    });
    expect(slots.map((slot) => slot.localTime)).toEqual([
      "01:00",
      "01:30",
      "02:00",
      "02:30",
      "03:00",
      "03:30",
    ]);
    expect(new Set(slots.map((slot) => slot.startsAt))).toHaveLength(6);
  });
});
