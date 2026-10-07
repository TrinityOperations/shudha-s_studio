import { expect, test, type Page } from "@playwright/test";
import { cleanupE2EBookings, getManageTokenByEmail } from "./helpers";

const EMAIL_PREFIX = "e2e-manage";

/**
 * PW-37: a visitor books, then uses the secret link to reschedule and cancel. The two projects
 * use different dates so they never fight over a slot. Needs DATABASE_URL for the token lookup.
 */
// One address per worker: locally every request shares an IP, so a long-lived dev server would
// otherwise hit the 5-per-hour booking limit. On Netlify this header is set by the platform.
const workerIp = `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

test.describe("booking manage link", () => {
  test.skip(!process.env.DATABASE_URL, "Needs DATABASE_URL to read the manage token");
  test.use({ extraHTTPHeaders: { "x-nf-client-connection-ip": workerIp } });

  let email: string;

  test.beforeEach(({}, testInfo) => {
    email = `${EMAIL_PREFIX}+${testInfo.project.name}-${Date.now()}@example.com`;
  });

  test.afterEach(async () => {
    await cleanupE2EBookings(email);
  });

  async function pickDate(page: Page, index: number) {
    const dates = page.getByRole("group", { name: /choose a date/i }).getByRole("button");
    await dates.nth(index).click();
    const times = page.getByRole("radio", { name: /am|pm/i });
    const count = await times.count();
    expect(count).toBeGreaterThan(0);
    const radio = times.nth(count - 1);
    const id = await radio.getAttribute("id");
    const label = (await page.locator(`label[for="${id}"]`).textContent())!.trim();
    await page.locator(`label[for="${id}"]`).click(); // the summary panel may show the same time
    await expect(radio).toBeChecked();
    return { date: (await dates.nth(index).textContent())!.trim(), time: label };
  }

  test("reschedule, then cancel; old links die, cancelled slot frees up", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const base = testInfo.project.name === "mobile" ? 5 : 3;

    // Book
    await page.goto("/book");
    const first = await pickDate(page, base);
    await page.getByLabel(/your name/i).fill("E2E Manager");
    await page.getByLabel(/whatsapp number/i).fill("0412 345 678");
    await page.getByLabel(/^email/i).fill(email);
    await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
    await page.getByRole("button", { name: /book consultation/i }).click();
    await expect(page.getByTestId("booking-confirmation")).toBeVisible();

    // Open the manage page with the token from the database
    const token = await getManageTokenByEmail(email);
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    await page.goto(`/booking/manage/${token}`);
    await expect(page.getByRole("heading", { level: 1, name: /your consultation/i })).toBeVisible();
    await expect(page.getByTestId("booking-summary")).toContainText(first.time);

    // Reschedule to the next available date
    const second = await pickDate(page, base + 1);
    await page.getByRole("button", { name: /move to this time/i }).click();
    const done = page.getByTestId("manage-done");
    await expect(done).toBeVisible();
    await expect(done).toContainText(second.time);

    // The old token is dead; the new one works
    const dead = await page.goto(`/booking/manage/${token}`);
    expect(dead?.status()).toBe(404);
    const token2 = await getManageTokenByEmail(email);
    expect(token2).not.toBe(token);
    await page.goto(`/booking/manage/${token2}`);
    await expect(page.getByTestId("booking-summary")).toContainText(second.time);

    // Cancel
    await page.getByRole("button", { name: /cancel this booking/i }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /cancel this booking/i })
      .click();
    await expect(page.getByTestId("manage-done")).toContainText(/booking cancelled/i);
    const deadAgain = await page.goto(`/booking/manage/${token2}`);
    expect(deadAgain?.status()).toBe(404);

    // The cancelled slot is offered again
    await page.goto("/book");
    await page
      .getByRole("group", { name: /choose a date/i })
      .getByRole("button", { name: second.date, exact: true })
      .click();
    await expect(page.getByRole("radio", { name: second.time, exact: true })).toHaveCount(1);
  });
});
