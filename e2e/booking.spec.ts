import { expect, test } from "@playwright/test";
import {
  cleanupE2EBookings,
  cleanupE2EProducts,
  ownerEmail,
  ownerPassword,
  signInAsOwner,
} from "./helpers";

const TITLE_PREFIX = "E2E Booking";
const EMAIL_PREFIX = "e2e-booking";

/**
 * OD-21, PW-30..33, PW-38: the owner sets hours, a visitor books a slot, and that slot is gone.
 * The chromium and mobile projects pick different dates so they never race for one slot.
 */
test.describe("booking engine", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");

  let productTitle: string;
  let email: string;

  test.beforeEach(({}, testInfo) => {
    const stamp = `${testInfo.project.name}-${Date.now()}`;
    productTitle = `${TITLE_PREFIX} ${stamp}`;
    email = `${EMAIL_PREFIX}+${stamp}@example.com`;
  });

  test.afterEach(async () => {
    await cleanupE2EBookings(email);
    await cleanupE2EProducts(TITLE_PREFIX, productTitle);
  });

  test("owner sets hours; visitor books a slot; the slot disappears", async ({
    page,
    context,
  }, testInfo) => {
    await signInAsOwner(page);

    // Hours: Monday–Saturday 10:00–18:00 (the defaults, saved explicitly so the test owns them).
    await page.goto("/admin/availability");
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
      const row = page.getByRole("listitem").filter({ hasText: day });
      const toggle = row.getByRole("switch");
      if ((await toggle.getAttribute("aria-checked")) !== "true") await toggle.click();
    }
    await page.getByRole("button", { name: /save hours/i }).click();
    await expect(page.getByText(/hours saved/i)).toBeVisible();

    // A published product to book about.
    await page.goto("/admin/products/new");
    await page.getByLabel(/title \(english\)/i).fill(productTitle);
    await page.getByRole("button", { name: /create draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    const slug = await page.getByLabel(/slug/i).inputValue();
    await page.getByRole("combobox", { name: /status/i }).click();
    await page.getByRole("option", { name: /published/i }).click();
    await page.getByRole("button", { name: /save product/i }).click();
    await expect(page.getByText(/product saved/i)).toBeVisible();

    // Visitor
    const visitor = await context.browser()!.newPage();
    await visitor.goto(`/book?product=${slug}`);
    await expect(
      visitor.getByRole("heading", { level: 1, name: /book a consultation/i }),
    ).toBeVisible();
    await expect(visitor.getByRole("combobox", { name: /product of interest/i })).toContainText(
      productTitle,
    );

    // Pick a date per project (chromium: 2nd available, mobile: 3rd) and the last time of that day.
    const dateButtons = visitor.getByRole("group", { name: /choose a date/i }).getByRole("button");
    const dateIndex = testInfo.project.name === "mobile" ? 2 : 1;
    await dateButtons.nth(dateIndex).click();
    const timeRadios = visitor.getByRole("radio", { name: /am|pm/i });
    const count = await timeRadios.count();
    expect(count).toBeGreaterThan(0);
    const chosen = timeRadios.nth(count - 1);
    const chosenLabel = (await chosen.evaluate(
      (el) => document.querySelector(`label[for="${el.id}"]`)?.textContent,
    ))!.trim();
    const chosenDate = (await dateButtons.nth(dateIndex).textContent())!.trim();
    await visitor.getByText(chosenLabel, { exact: true }).click();
    await expect(chosen).toBeChecked();

    await visitor.getByLabel(/your name/i).fill("E2E Visitor");
    await visitor.getByLabel(/whatsapp number/i).fill("0412 345 678");
    await visitor.getByLabel(/^email/i).fill(email);
    await visitor.getByRole("radio", { name: /phone call/i }).click();
    await visitor.getByLabel(/message/i).fill("Booked by the e2e suite");
    await expect(visitor.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
    await visitor.getByRole("button", { name: /book consultation/i }).click();

    const confirmation = visitor.getByTestId("booking-confirmation");
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("E2E Visitor");
    await expect(confirmation).toContainText(chosenLabel);
    await expect(confirmation).toContainText("Phone call");
    await expect(confirmation).toContainText(productTitle);

    // The slot is no longer offered: either its date has no free times left (chip gone) or the
    // time is missing from that date.
    await visitor.goto("/book");
    const dateChip = visitor
      .getByRole("group", { name: /choose a date/i })
      .getByRole("button", { name: chosenDate, exact: true });
    if ((await dateChip.count()) > 0) {
      await dateChip.click();
      await expect(visitor.getByRole("radio", { name: chosenLabel, exact: true })).toHaveCount(0);
    } else {
      await expect(dateChip).toHaveCount(0);
    }
    await visitor.close();
  });
});
