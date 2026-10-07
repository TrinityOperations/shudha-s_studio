/**
 * Real-database race (PW-32). Skipped unless RUN_DB_TESTS=1 because it writes to DATABASE_URL.
 * Seeds availability for a far-future Wednesday, fires two createBookingCore calls at once for the
 * same slot, and expects exactly one to win. Cleans up what it created.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

describe.skipIf(!run)("createBookingCore against Postgres", () => {
  const created: string[] = [];
  let ruleId: string | null = null;

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", override: true });
  });

  afterAll(async () => {
    const { db } = await import("@/db");
    const { availabilityRules, bookings } = await import("@/db/schema");
    const { inArray, eq } = await import("drizzle-orm");
    if (created.length) await db.delete(bookings).where(inArray(bookings.id, created));
    if (ruleId) await db.delete(availabilityRules).where(eq(availabilityRules.id, ruleId));
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  it("lets exactly one of two simultaneous bookings through", async () => {
    const { db } = await import("@/db");
    const { availabilityRules } = await import("@/db/schema");
    const { createBookingCore } = await import("./create-booking");
    const { melbourneWallClock } = await import("./slots");

    // A Wednesday at least 2 days out but inside any horizon >= 7 days; 06:00–07:00 so it never
    // collides with the real hours. Rule rows merge with existing ones for that weekday.
    const target = new Date();
    target.setUTCDate(target.getUTCDate() + 3);
    while (target.getUTCDay() !== 3) target.setUTCDate(target.getUTCDate() + 1);
    const date = target.toISOString().slice(0, 10);
    const [rule] = await db
      .insert(availabilityRules)
      .values({ weekday: 3, startTime: "06:00", endTime: "07:00", active: true })
      .returning({ id: availabilityRules.id });
    ruleId = rule.id;

    const startsAt = melbourneWallClock(date, "06:00");
    const input = {
      startsAt,
      consultationType: "phone" as const,
      customerName: "Race test",
      customerPhone: "61400000000",
      customerEmail: "race@example.com",
      productId: null,
      message: null,
    };
    const now = new Date(startsAt.getTime() - 48 * 60 * 60 * 1000); // satisfies any notice ≤ 48h

    const results = await Promise.all([
      createBookingCore({ ...input, customerName: "Race A" }, { now }),
      createBookingCore({ ...input, customerName: "Race B" }, { now }),
    ]);
    for (const r of results) if (r.ok) created.push(r.booking.id);

    const wins = results.filter((r) => r.ok);
    const losses = results.filter((r) => !r.ok);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);
    expect(losses[0]).toEqual({ ok: false, error: "errors.slotTaken" });
  }, 60_000);
});
