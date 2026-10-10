import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { ownerEmail, ownerPassword, signInAsOwner } from "./helpers";

const EMAIL_PREFIX = "e2e-contact";
const workerIp = `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T | null> {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return null;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * PW-42, PW-45, PW-46, OD-33: the contact form stores a message (the owner email is a dry run
 * locally, covered by the unit test), the announcement strip toggles, the legal pages and the
 * branded 404 render.
 */
test.describe("content pages and announcement", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");
  test.use({ extraHTTPHeaders: { "x-nf-client-connection-ip": workerIp } });

  let email: string;
  test.beforeEach(({}, testInfo) => {
    email = `${EMAIL_PREFIX}+${testInfo.project.name}-${Date.now()}@example.com`;
  });
  test.afterEach(async () => {
    await withDb((c) => c.query(`delete from contact_messages where email = $1`, [email]));
  });

  test("contact form, legal pages and 404", async ({ page }, testInfo) => {
    const mobile = testInfo.project.name === "mobile";
    if (mobile) await page.setViewportSize({ width: 360, height: 740 });

    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1, name: /contact/i })).toBeVisible();
    await page.getByLabel(/your name/i).fill("E2E Visitor");
    await page.getByLabel(/^email/i).fill(email);
    await page.getByLabel(/whatsapp number/i).fill("0412 345 678");
    await page.getByLabel(/^message/i).fill("Hello from the e2e suite, a nameplate please.");
    await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByTestId("contact-sent")).toContainText("E2E Visitor");
    const stored = await withDb((c) =>
      c.query<{ phone: string | null }>(`select phone from contact_messages where email = $1`, [
        email,
      ]),
    );
    expect(stored?.rows[0]?.phone).toBe("61412345678");

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: /privacy/i })).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1, name: /terms/i })).toBeVisible();
    await page.goto("/how-it-works");
    await expect(page.getByRole("heading", { level: 2, name: /pickup or post/i })).toBeVisible();
    await expect(page.locator("#delivery")).toBeVisible();
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: /nothing here/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to the home page/i })).toBeVisible();
  });

  test("the announcement strip toggles on and off", async ({ page, context }, testInfo) => {
    // Shared setting: only the chromium project drives it; mobile checks the pages above.
    test.skip(testInfo.project.name !== "chromium", "one project owns the announcement row");
    const previous = await withDb(async (c) => {
      const r = await c.query<{ value: unknown }>(
        `select value from site_settings where key = 'announcement'`,
      );
      return r.rows[0]?.value ?? null;
    });
    try {
      await signInAsOwner(page);
      await page.goto("/admin/settings/announcement");
      const enabled = page.getByRole("switch", { name: /show the announcement strip/i });
      if ((await enabled.getAttribute("aria-checked")) !== "true") await enabled.click();
      if ((await page.getByLabel(/^text$/i).count()) === 0) {
        await page.getByRole("button", { name: /add a message/i }).click();
      }
      await page
        .getByLabel(/^text$/i)
        .first()
        .fill("E2E announcement: Eid orders close Friday");
      await page.getByRole("button", { name: /^save$/i }).click();
      await expect(page.getByText(/announcement saved/i)).toBeVisible();
      // The toast lingers; wait for it to go so the second save's toast is unambiguous.
      await expect(page.getByText(/announcement saved/i)).toBeHidden({ timeout: 15_000 });

      const visitor = await context.browser()!.newPage();
      await visitor.goto("/");
      await expect(visitor.getByTestId("announcement-strip")).toContainText("E2E announcement");

      await enabled.click();
      await page.getByRole("button", { name: /^save$/i }).click();
      await expect(page.getByText(/announcement saved/i)).toBeVisible();
      await visitor.goto("/");
      await expect(visitor.getByTestId("announcement-strip")).toHaveCount(0);
      await visitor.close();
    } finally {
      await withDb(async (c) => {
        if (previous === null)
          await c.query(`delete from site_settings where key = 'announcement'`);
        else
          await c.query(
            `insert into site_settings (key, value) values ('announcement', $1) on conflict (key) do update set value = excluded.value`,
            [JSON.stringify(previous)],
          );
      });
    }
  });
});
