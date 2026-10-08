import { describe, expect, it } from "vitest";
import { formatMelbourne } from "@/lib/time";
import { DEFAULT_AVAILABILITY_RULES, DEFAULT_BOOKING_SETTINGS } from "./defaults";
import {
  generateSlots,
  groupSlotsByMelbourneDate,
  isSlotAvailable,
  melbourneWallClock,
  type GenerateSlotsInput,
} from "./slots";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function base(overrides: Partial<GenerateSlotsInput> = {}): GenerateSlotsInput {
  // Wednesday 2026-07-15 09:00 Melbourne (AEST, UTC+10) = 2026-07-14T23:00Z
  const now = new Date("2026-07-14T23:00:00Z");
  return {
    rules: DEFAULT_AVAILABILITY_RULES,
    settings: { ...DEFAULT_BOOKING_SETTINGS, minNoticeHours: 0 },
    blockedPeriods: [],
    bookings: [],
    from: now,
    to: new Date(now.getTime() + 7 * DAY),
    now,
    ...overrides,
  };
}

const wall = (slot: { startsAt: Date }) => formatMelbourne(slot.startsAt, "yyyy-MM-dd HH:mm");
const lengths = (slots: { startsAt: Date; endsAt: Date }[]) =>
  slots.map((s) => (s.endsAt.getTime() - s.startsAt.getTime()) / MINUTE);

function expectWellFormed(slots: { startsAt: Date; endsAt: Date }[], slotMinutes: number) {
  const starts = slots.map((s) => s.startsAt.getTime());
  expect(new Set(starts).size).toBe(starts.length); // unique instants
  expect([...starts].sort((a, b) => a - b)).toEqual(starts); // ordered
  expect(new Set(lengths(slots))).toEqual(new Set([slotMinutes])); // never 0 or 90 minutes
  for (let i = 1; i < slots.length; i++) {
    expect(slots[i].startsAt.getTime()).toBeGreaterThanOrEqual(slots[i - 1].endsAt.getTime());
  }
}

describe("generateSlots: rules and window", () => {
  it("produces 16 half-hour slots for a 10:00–18:00 day and none on Sunday", () => {
    const slots = generateSlots(base());
    const byDay = groupSlotsByMelbourneDate(slots);
    const wednesday = byDay.find((d) => d.date === "2026-07-15")!;
    expect(wednesday.slots).toHaveLength(16);
    expect(wall(wednesday.slots[0])).toBe("2026-07-15 10:00");
    expect(wall(wednesday.slots.at(-1)!)).toBe("2026-07-15 17:30");
    expect(byDay.find((d) => d.date === "2026-07-19")).toBeUndefined(); // Sunday
    expectWellFormed(slots, 30);
  });

  it("hides slots inside the minimum notice and past the horizon", () => {
    const now = new Date("2026-07-14T23:00:00Z"); // Wed 09:00 Melbourne
    const slots = generateSlots(
      base({
        now,
        settings: { ...DEFAULT_BOOKING_SETTINGS, minNoticeHours: 24, horizonDays: 2 },
        to: new Date(now.getTime() + 30 * DAY),
      }),
    );
    // Earliest allowed instant is Thu 09:00, so Wednesday has nothing and Thursday starts at 10:00.
    expect(slots[0] && wall(slots[0])).toBe("2026-07-16 10:00");
    // Horizon ends Fri 09:00, so no Friday slots (they start at 10:00).
    expect(groupSlotsByMelbourneDate(slots).map((d) => d.date)).toEqual(["2026-07-16"]);
  });

  it("ignoreMinNotice keeps slots inside the notice window but still hides the past and keeps the horizon", () => {
    const now = new Date("2026-07-15T03:10:00Z"); // Wed 13:10 Melbourne
    const settings = { ...DEFAULT_BOOKING_SETTINGS, minNoticeHours: 24, horizonDays: 2 };
    const withNotice = generateSlots(base({ now, from: now, settings }));
    const without = generateSlots(base({ now, from: now, settings, ignoreMinNotice: true }));
    expect(wall(withNotice[0])).toBe("2026-07-16 13:30");
    expect(wall(without[0])).toBe("2026-07-15 13:30"); // today, after now
    expect(without.some((s) => s.startsAt < now)).toBe(false);
    expect(groupSlotsByMelbourneDate(without).map((d) => d.date)).toEqual([
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
    ]); // two days from Wed 13:10 ends Fri 13:10
    expect(wall(without.at(-1)!)).toBe("2026-07-17 12:30");
  });

  it("hides past slots when the notice is zero", () => {
    const now = new Date("2026-07-15T03:10:00Z"); // Wed 13:10 Melbourne
    const slots = generateSlots(base({ now, from: now }));
    expect(wall(slots[0])).toBe("2026-07-15 13:30");
  });

  it("ignores inactive rules and merges overlapping rules on one weekday", () => {
    const rules = [
      { weekday: 3, startTime: "10:00", endTime: "12:00", active: true },
      { weekday: 3, startTime: "11:00", endTime: "13:00", active: true },
      { weekday: 4, startTime: "10:00", endTime: "18:00", active: false },
    ];
    const slots = generateSlots(base({ rules }));
    const byDay = groupSlotsByMelbourneDate(slots);
    expect(byDay.map((d) => d.date)).toEqual(["2026-07-15"]);
    expect(byDay[0].slots.map(wall)).toEqual([
      "2026-07-15 10:00",
      "2026-07-15 10:30",
      "2026-07-15 11:00",
      "2026-07-15 11:30",
      "2026-07-15 12:00",
      "2026-07-15 12:30",
    ]);
  });

  it("does not emit a slot that would run past the end of the hours", () => {
    const rules = [{ weekday: 3, startTime: "10:00", endTime: "10:45", active: true }];
    const slots = generateSlots(base({ rules }));
    expect(slots.map(wall)).toEqual(["2026-07-15 10:00"]);
  });
});

describe("generateSlots: blocked periods, bookings and buffer", () => {
  it("removes slots that a blocked period partially overlaps", () => {
    const blocked = {
      startsAt: melbourneWallClock("2026-07-15", "10:45"),
      endsAt: melbourneWallClock("2026-07-15", "11:15"),
    };
    const slots = generateSlots(base({ blockedPeriods: [blocked] }));
    const day = groupSlotsByMelbourneDate(slots)[0];
    const times = day.slots.map((s) => formatMelbourne(s.startsAt, "HH:mm"));
    expect(times).not.toContain("10:30");
    expect(times).not.toContain("11:00");
    expect(times).toContain("10:00");
    expect(times).toContain("11:30");
  });

  it("removes a booked slot and, with a buffer, its neighbours on both sides", () => {
    const booking = {
      startsAt: melbourneWallClock("2026-07-15", "12:00"),
      endsAt: melbourneWallClock("2026-07-15", "12:30"),
    };
    const without = generateSlots(base({ bookings: [booking] }));
    expect(
      groupSlotsByMelbourneDate(without)[0].slots.map((s) => formatMelbourne(s.startsAt, "HH:mm")),
    ).not.toContain("12:00");
    const withBuffer = generateSlots(
      base({
        bookings: [booking],
        settings: { ...DEFAULT_BOOKING_SETTINGS, minNoticeHours: 0, bufferMinutes: 30 },
      }),
    );
    const times = groupSlotsByMelbourneDate(withBuffer)[0].slots.map((s) =>
      formatMelbourne(s.startsAt, "HH:mm"),
    );
    expect(times).not.toContain("11:30");
    expect(times).not.toContain("12:00");
    expect(times).not.toContain("12:30");
    expect(times).toContain("11:00");
    expect(times).toContain("13:00");
  });

  it("isSlotAvailable accepts a generated slot and rejects anything else", () => {
    const input = base();
    expect(isSlotAvailable(melbourneWallClock("2026-07-15", "10:00"), input)).toBe(true);
    expect(isSlotAvailable(melbourneWallClock("2026-07-15", "10:15"), input)).toBe(false);
    expect(isSlotAvailable(melbourneWallClock("2026-07-19", "10:00"), input)).toBe(false); // Sunday
    expect(isSlotAvailable(melbourneWallClock("2026-07-15", "18:00"), input)).toBe(false);
  });
});

describe("generateSlots: daylight-saving changeovers (Melbourne, 2026)", () => {
  const settings = { ...DEFAULT_BOOKING_SETTINGS, minNoticeHours: 0 };

  it("keeps 10:00–18:00 wall-clock on both sides of the 4 October forward change", () => {
    // AEST → AEDT: 02:00 on Sun 4 Oct 2026 becomes 03:00. Saturday 3 Oct is AEST, Monday 5 Oct is AEDT.
    const now = new Date("2026-10-02T22:00:00Z"); // Sat 3 Oct 08:00 AEST
    const slots = generateSlots(
      base({ now, from: now, to: new Date(now.getTime() + 4 * DAY), settings }),
    );
    const byDay = groupSlotsByMelbourneDate(slots);
    const sat = byDay.find((d) => d.date === "2026-10-03")!;
    const mon = byDay.find((d) => d.date === "2026-10-05")!;
    expect(sat.slots).toHaveLength(16);
    expect(mon.slots).toHaveLength(16);
    expect(wall(sat.slots[0])).toBe("2026-10-03 10:00");
    expect(wall(mon.slots[0])).toBe("2026-10-05 10:00");
    // Same wall-clock, different UTC offset.
    expect(sat.slots[0].startsAt.toISOString()).toBe("2026-10-03T00:00:00.000Z"); // +10
    expect(mon.slots[0].startsAt.toISOString()).toBe("2026-10-04T23:00:00.000Z"); // +11
    expectWellFormed(slots, 30);
  });

  it("skips the non-existent 02:00–03:00 hour on 4 October", () => {
    const rules = [{ weekday: 0, startTime: "01:00", endTime: "04:00", active: true }];
    const now = new Date("2026-10-03T12:00:00Z"); // Sat 3 Oct 22:00 AEST
    const slots = generateSlots(
      base({ rules, now, from: now, to: new Date(now.getTime() + DAY), settings }),
    );
    const labels = slots.map((s) => formatMelbourne(s.startsAt, "HH:mm"));
    // 01:00 and 01:30 exist (AEST); 02:xx does not; 03:00 and 03:30 exist (AEDT).
    expect(labels).toEqual(["01:00", "01:30", "03:00", "03:30"]);
    expectWellFormed(slots, 30);
  });

  it("includes the repeated 02:00–03:00 hour once per instant on 5 April", () => {
    // AEDT → AEST: 03:00 on Sun 5 Apr 2026 becomes 02:00 again.
    const rules = [{ weekday: 0, startTime: "01:00", endTime: "04:00", active: true }];
    const now = new Date("2026-04-04T12:00:00Z"); // Sat 4 Apr 23:00 AEDT
    const slots = generateSlots(
      base({ rules, now, from: now, to: new Date(now.getTime() + DAY), settings }),
    );
    // 01:00 AEDT → 04:00 AEST is four real hours: eight unique, contiguous 30-minute slots.
    expect(slots).toHaveLength(8);
    expectWellFormed(slots, 30);
    const labels = slots.map((s) => formatMelbourne(s.startsAt, "HH:mm"));
    expect(labels.filter((l) => l.startsWith("02:"))).toHaveLength(4); // 02:00/02:30 twice
    expect(slots[0].startsAt.toISOString()).toBe("2026-04-04T14:00:00.000Z");
    expect(slots.at(-1)!.endsAt.toISOString()).toBe("2026-04-04T18:00:00.000Z");
  });

  it("keeps 10:00–18:00 on both sides of the 5 April backward change", () => {
    const now = new Date("2026-04-03T22:00:00Z"); // Sat 4 Apr 09:00 AEDT
    const slots = generateSlots(
      base({ now, from: now, to: new Date(now.getTime() + 4 * DAY), settings }),
    );
    const byDay = groupSlotsByMelbourneDate(slots);
    const sat = byDay.find((d) => d.date === "2026-04-04")!;
    const mon = byDay.find((d) => d.date === "2026-04-06")!;
    expect(sat.slots.map(wall)[0]).toBe("2026-04-04 10:00");
    expect(mon.slots.map(wall)[0]).toBe("2026-04-06 10:00");
    expect(sat.slots[0].startsAt.toISOString()).toBe("2026-04-03T23:00:00.000Z"); // +11
    expect(mon.slots[0].startsAt.toISOString()).toBe("2026-04-06T00:00:00.000Z"); // +10
    expectWellFormed(slots, 30);
  });
});
