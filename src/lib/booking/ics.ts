/**
 * Minimal iCalendar file for the customer's confirmation (PW-34). No dependency: one event,
 * METHOD:PUBLISH, UTC times. The same UID on a reschedule updates the event in the calendar.
 */
export type IcsEvent = {
  /** Stable id, e.g. `${bookingId}@${host}` */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  url?: string;
  /** Defaults to now */
  stamp?: Date;
};

export const ICS_FILENAME = "consultation.ics";
export const ICS_CONTENT_TYPE = "text/calendar";

function utc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/** RFC 5545 text escaping. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets with CRLF + space (RFC 5545 §3.1). */
export function foldIcsLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cursor = 0;
  let first = true;
  while (cursor < bytes.length) {
    const limit = first ? 75 : 74;
    let take = Math.min(limit, bytes.length - cursor);
    // Never split a multi-byte character.
    while (take > 0 && cursor + take < bytes.length && (bytes[cursor + take] & 0xc0) === 0x80)
      take--;
    parts.push((first ? "" : " ") + bytes.subarray(cursor, cursor + take).toString("utf8"));
    cursor += take;
    first = false;
  }
  return parts.join("\r\n");
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shudha's Studio//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${utc(event.stamp ?? new Date())}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(event.end)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(event.url ? [`URL:${escapeIcsText(event.url)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
