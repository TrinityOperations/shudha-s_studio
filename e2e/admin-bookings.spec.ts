import { expect, test, type Page } from "@playwright/test";
import { cleanupE2EBookings, ownerEmail, ownerPassword, signInAsOwner } from "./helpers";

const EMAIL_PREFIX = "e2e-adminbook";
const workerIp = `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

/**
 * OD-20, OD-22..OD-24: a visitor books; the owner finds it, notes it, confirms, reschedules,
 * sees it on the calendar and cancels it. Projects use different dates so they never race.
 */
test.describe("booking management", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");
  test.use({ extraHTTPHeaders: { "x-nf-client-connection-ip": workerIp } });

  let email: string;
  let name: string;

  test.beforeEach(({}, testInfo) => {
    const stamp = `${testInfo.project.name}-${Date.now()}`;
    email = `${EMAIL_PREFIX}+${stamp}@example.com`;
    name = `E2E Owner Flow ${stamp}`;
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
    await page.locator(`label[for="${id}"]`).click();
    await expect(radio).toBeChecked();
    return (await dates.nth(index).textContent())!.trim();
  }

  /**
   * Reschedule picker: the owner's chips can start a day earlier than the visitor's (minimum
   * notice is ignored for her), so indices don't line up. Pick by label instead: the first chip at
   * or after `startIndex` that isn't the booked date, and its first time, which can't be the
   * booking's own slot.
   */
  async function pickOtherDate(page: Page, bookedDate: string, startIndex: number) {
    const dates = page.getByRole("group", { name: /choose a date/i }).getByRole("button");
    const count = await dates.count();
    let index = startIndex;
    while (index < count && (await dates.nth(index).textContent())!.trim() === bookedDate) index++;
    expect(index, "a free date other than the booked one").toBeLessThan(count);
    await dates.nth(index).click();
    const times = page.getByRole("radio", { name: /am|pm/i });
    expect(await times.count()).toBeGreaterThan(0);
    const radio = times.first();
    const id = await radio.getAttribute("id");
    await page.locator(`label[for="${id}"]`).click();
    await expect(radio).toBeChecked();
    return (await dates.nth(index).textContent())!.trim();
  }

  test("list, detail, notes, confirm, reschedule, calendar, cancel", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000);
    const base = testInfo.project.name === "mobile" ? 9 : 7;

    // Visitor books
    const visitor = await context
      .browser()!
      .newPage({ extraHTTPHeaders: { "x-nf-client-connection-ip": workerIp } });
    await visitor.goto("/book");
    const bookedDate = await pickDate(visitor, base);
    await visitor.getByLabel(/your name/i).fill(name);
    await visitor.getByLabel(/whatsapp number/i).fill("0412 345 678");
    await visitor.getByLabel(/^email/i).fill(email);
    await expect(visitor.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
    await visitor.getByRole("button", { name: /book consultation/i }).click();
    await expect(visitor.getByTestId("booking-confirmation")).toBeVisible();
    await visitor.close();

    // Owner: list → detail
    await signInAsOwner(page);
    await page.goto("/admin/bookings");
    await page.getByLabel(/search by name/i).fill(name);
    await expect(page).toHaveURL(/[?&]q=/); // the search box updates the URL after a short delay
    await expect(page.getByRole("link", { name })).toBeVisible();
    await page.getByRole("link", { name }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    const detailUrl = page.url();
    await expect(page.getByTestId("booking-status").first()).toHaveText(/new/i);
    await expect(page.getByRole("link", { name: /reply on whatsapp/i })).toHaveAttribute(
      "href",
      /wa\.me\/61412345678\?text=/,
    );
    await expect(page.getByText(/no custom order brief/i)).toBeVisible();
    await expect(page.getByText(/no wishlist attached/i)).toBeVisible();

    // Notes
    await page.getByRole("textbox", { name: /private notes/i }).fill("Wants gold lettering");
    await page.getByRole("button", { name: /save notes/i }).click();
    await expect(page.getByText(/notes saved/i)).toBeVisible();

    // Confirm
    await page.getByRole("button", { name: /confirm booking/i }).click();
    await expect(page.getByText(/booking confirmed/i)).toBeVisible();
    await expect(page.getByTestId("booking-status").first()).toHaveText(/confirmed/i);

    // Reschedule to another date
    const newDate = await pickOtherDate(page, bookedDate, base + 1);
    expect(newDate).not.toBe(bookedDate);
    await page.getByRole("button", { name: /^move booking$/i }).click();
    await expect(page.getByText(/booking moved/i)).toBeVisible();
    await expect(page.locator("header")).toContainText(newDate.split(" ")[1]); // day number

    // Calendar shows the day with a count
    const month = new Date().toISOString().slice(0, 7);
    await page.goto(`/admin/bookings?view=calendar&month=${month}`);
    const dayLinks = page.locator("table a[aria-label*='booking']");
    expect(await dayLinks.count()).toBeGreaterThan(0);

    // Cancel → Cancelled tab
    await page.goto(detailUrl);
    await page.getByRole("button", { name: /^cancel booking$/i }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /^cancel booking$/i })
      .click();
    await expect(page.getByText(/booking cancelled/i)).toBeVisible();
    await page.goto(`/admin/bookings?tab=cancelled&q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("link", { name })).toBeVisible();
    await expect(page.getByTestId("booking-status").first()).toHaveText(/cancelled/i);
  });
});
