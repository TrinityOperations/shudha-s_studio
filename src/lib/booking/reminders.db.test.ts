/**
 * Real-database idempotency check for the reminder claim (PW-36). Skipped unless RUN_DB_TESTS=1.
 * Inserts one booking ~24 h out, runs the job twice at once with sending mocked, and expects a
 * single claim in total. Cleans up its booking.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";
const mocks = vi.hoisted(() => ({ sendBookingEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock("./emails", () => ({ sendBookingEmail: mocks.sendBookingEmail }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

describe.skipIf(!run)("runReminderJob against Postgres", () => {
  let bookingId: string | null = null;

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", override: true });
  });

  afterAll(async () => {
    const { db } = await import("@/db");
    const { bookings } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    if (bookingId) await db.delete(bookings).where(eq(bookings.id, bookingId));
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  it("claims each booking exactly once across two simultaneous runs", async () => {
    const { db } = await import("@/db");
    const { bookings } = await import("@/db/schema");
    const { runReminderJob } = await import("./reminders");

    // 24h ahead at an odd second so it never collides with real or e2e slots.
    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 7_000);
    const [row] = await db
      .insert(bookings)
      .values({
        consultationType: "phone",
        startsAt,
        endsAt: new Date(startsAt.getTime() + 5 * 60_000),
        customerName: "Reminder race",
        customerPhone: "61400000001",
        customerEmail: "reminder-race@example.com",
      })
      .returning({ id: bookings.id });
    bookingId = row.id;

    const [a, b] = await Promise.all([runReminderJob(now), runReminderJob(now)]);
    expect(a.claimed + b.claimed).toBe(1);
    expect(a.sent + b.sent).toBe(1);
    expect(mocks.sendBookingEmail).toHaveBeenCalledTimes(1);

    const again = await runReminderJob(now);
    expect(again).toEqual({ claimed: 0, sent: 0, failed: 0 });
  }, 60_000);
});
