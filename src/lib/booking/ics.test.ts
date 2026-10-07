import { describe, expect, it } from "vitest";
import { buildIcs, escapeIcsText, foldIcsLine } from "./ics";

const event = {
  uid: "11111111-1111-4111-8111-111111111111@shudhas.studio",
  start: new Date("2026-07-15T01:00:00.000Z"),
  end: new Date("2026-07-15T01:30:00.000Z"),
  summary: "Consultation: Shudha's Studio",
  description:
    "Reschedule or cancel: https://shudhas.studio/booking/manage/abc\nSee you then, Asha; bring ideas",
  url: "https://shudhas.studio/booking/manage/abc",
  stamp: new Date("2026-07-01T00:00:00.000Z"),
};

describe("buildIcs", () => {
  const ics = buildIcs(event);
  const lines = ics.split("\r\n");

  it("is a PUBLISH calendar with one event in UTC", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("METHOD:PUBLISH");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("DTSTART:20260715T010000Z");
    expect(lines).toContain("DTEND:20260715T013000Z");
    expect(lines).toContain("DTSTAMP:20260701T000000Z");
    expect(lines).toContain(`UID:${event.uid}`);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes text and folds long lines", () => {
    expect(ics).toContain("SUMMARY:Consultation: Shudha's Studio");
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(
      "DESCRIPTION:Reschedule or cancel: https://shudhas.studio/booking/manage/abc\\nSee you then\\, Asha\; bring ideas",
    );
    for (const line of lines) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });

  it("escapeIcsText and foldIcsLine handle edge cases", () => {
    expect(escapeIcsText("a\\b;c,d\r\ne")).toBe("a\\\\b\;c\\,d\\ne");
    const bengali = "DESCRIPTION:" + "ঈদের মগ ".repeat(12);
    const folded = foldIcsLine(bengali);
    expect(folded.replace(/\r\n /g, "")).toBe(bengali);
    for (const part of folded.split("\r\n"))
      expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(75);
    expect(foldIcsLine("short")).toBe("short");
  });
});
