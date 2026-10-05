import { expect, test, type Page } from "@playwright/test";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Client } from "pg";

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
const hasTurnstileTestKeys =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === "1x00000000000000000000AA" &&
  process.env.TURNSTILE_SECRET_KEY === "1x0000000000000000000000000000000AA";

async function fillBooking(page: Page, email: string) {
  await page.getByRole("radio").first().check({ force: true });
  await page.getByLabel(/^name$/i).fill("E2E Booking Customer");
  await page.getByLabel(/^phone$/i).fill("0400000000");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/consultation type/i).selectOption("phone");
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
}

test.describe("public booking flow (PW-30..PW-33, PW-38)", () => {
  test.setTimeout(90_000);
  test.skip(!databaseUrl, "Set DIRECT_DATABASE_URL or DATABASE_URL to run booking e2e");
  test.skip(
    !hasTurnstileTestKeys,
    "Use Cloudflare always-pass Turnstile test keys to run booking e2e",
  );

  let client: Client;
  let bookingDate: string;
  let startsAt: Date;
  let endsAt: Date;
  let originalSettings: Record<string, unknown> | undefined;
  let originalRules: Record<string, unknown>[];

  test.beforeEach(async ({}, testInfo) => {
    client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    originalSettings = (await client.query(`select * from booking_settings where id = 1`)).rows[0];
    originalRules = (await client.query(`select * from availability_rules order by weekday`)).rows;

    const projectOffset = testInfo.project.name === "mobile" ? 15 : 14;
    bookingDate = formatInTimeZone(
      addDays(new Date(), projectOffset),
      "Australia/Melbourne",
      "yyyy-MM-dd",
    );
    startsAt = fromZonedTime(`${bookingDate}T10:00:00`, "Australia/Melbourne");
    endsAt = fromZonedTime(`${bookingDate}T10:30:00`, "Australia/Melbourne");

    await client.query("begin");
    await client.query(
      `insert into booking_settings
        (id, slot_minutes, buffer_minutes, horizon_days, min_notice_hours, consultation_types)
       values (1, 30, 0, 28, 0, '{phone}'::consultation_type[])
       on conflict (id) do update set
         slot_minutes = excluded.slot_minutes,
         buffer_minutes = excluded.buffer_minutes,
         horizon_days = excluded.horizon_days,
         min_notice_hours = excluded.min_notice_hours,
         consultation_types = excluded.consultation_types`,
    );
    await client.query("delete from availability_rules");
    await client.query(
      `insert into availability_rules (weekday, start_time, end_time, active)
       select weekday, '10:00'::time, '10:30'::time, true
       from generate_series(0, 6) as weekday`,
    );
    await client.query(
      `delete from bookings
       where customer_email like 'e2e-booking-%@example.com'
          or (starts_at = $1 and ends_at = $2)`,
      [startsAt, endsAt],
    );
    await client.query("commit");
  });

  test.afterEach(async () => {
    try {
      await client.query("begin");
      await client.query(
        `delete from bookings where customer_email like 'e2e-booking-%@example.com'`,
      );
      await client.query("delete from availability_rules");
      for (const rule of originalRules) {
        await client.query(
          `insert into availability_rules
            (id, weekday, start_time, end_time, active, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            rule.id,
            rule.weekday,
            rule.start_time,
            rule.end_time,
            rule.active,
            rule.created_at,
            rule.updated_at,
          ],
        );
      }
      if (originalSettings) {
        await client.query(
          `update booking_settings set
             slot_minutes = $1,
             buffer_minutes = $2,
             horizon_days = $3,
             min_notice_hours = $4,
             consultation_types = $5,
             updated_at = $6
           where id = 1`,
          [
            originalSettings.slot_minutes,
            originalSettings.buffer_minutes,
            originalSettings.horizon_days,
            originalSettings.min_notice_hours,
            originalSettings.consultation_types,
            originalSettings.updated_at,
          ],
        );
      } else {
        await client.query("delete from booking_settings where id = 1");
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      await client.end();
    }
  });

  test("two simultaneous requests for one slot produce exactly one booking", async ({
    context,
    page: first,
  }) => {
    const second = await context.newPage();

    await Promise.all([first.goto("/book"), second.goto("/book")]);
    await Promise.all([
      fillBooking(first, "e2e-booking-first@example.com"),
      fillBooking(second, "e2e-booking-second@example.com"),
    ]);
    await Promise.all([
      first.getByRole("button", { name: /^book appointment$/i }).click(),
      second.getByRole("button", { name: /^book appointment$/i }).click(),
    ]);

    await expect
      .poll(async () => {
        const values = await Promise.all([
          first.getByRole("heading", { name: /appointment booked/i }).isVisible(),
          second.getByRole("heading", { name: /appointment booked/i }).isVisible(),
        ]);
        return values.filter(Boolean).length;
      })
      .toBe(1);

    const rows = await client.query<{ count: string }>(
      `select count(*)::text as count from bookings where starts_at = $1 and ends_at = $2`,
      [startsAt, endsAt],
    );
    expect(Number(rows.rows[0].count)).toBe(1);
  });
});
