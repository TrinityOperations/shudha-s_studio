import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  cleanupE2EBookings,
  cleanupE2EProducts,
  ownerEmail,
  ownerPassword,
  signInAsOwner,
} from "./helpers";

const TITLE_PREFIX = "E2E Wizard";
const EMAIL_PREFIX = "e2e-wizard";
const workerIp = `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

/**
 * PW-50..PW-53: from a product page through all seven steps to a booking, then the owner sees the
 * structured brief. The mobile project runs the wizard at 360px. Projects pick different dates
 * (and the first time of the day, unlike the other specs) so they never race for one slot.
 */
test.describe("custom order wizard", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");
  test.use({ extraHTTPHeaders: { "x-nf-client-connection-ip": workerIp } });

  let productTitle: string;
  let email: string;
  let name: string;

  test.beforeEach(({}, testInfo) => {
    const stamp = `${testInfo.project.name}-${Date.now()}`;
    productTitle = `${TITLE_PREFIX} ${stamp}`;
    email = `${EMAIL_PREFIX}+${stamp}@example.com`;
    name = `E2E Wizard Customer ${stamp}`;
  });

  test.afterEach(async () => {
    await cleanupE2EBookings(email);
    await cleanupE2EProducts(TITLE_PREFIX, productTitle);
  });

  async function pickFirstTime(page: Page, index: number) {
    const dates = page.getByRole("group", { name: /choose a date/i }).getByRole("button");
    await dates.nth(index).click();
    const times = page.getByRole("radio", { name: /am|pm/i });
    expect(await times.count()).toBeGreaterThan(0);
    const radio = times.first();
    const id = await radio.getAttribute("id");
    await page.locator(`label[for="${id}"]`).click();
    await expect(radio).toBeChecked();
    return (await page.locator(`label[for="${id}"]`).textContent())!.trim();
  }

  test("product page → seven steps → booking → brief in the dashboard", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(150_000);
    const mobile = testInfo.project.name === "mobile";

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

    // A published product to start from (PW-51).
    await page.goto("/admin/products/new");
    await page.getByLabel(/title \(english\)/i).fill(productTitle);
    await page.getByRole("button", { name: /create draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    const slug = await page.getByLabel(/slug/i).inputValue();
    await page.getByRole("combobox", { name: /status/i }).click();
    await page.getByRole("option", { name: /published/i }).click();
    await page.getByRole("button", { name: /save product/i }).click();
    await expect(page.getByText(/product saved/i)).toBeVisible();

    // Visitor (360px on the mobile project).
    const visitor = await context.browser()!.newPage({
      extraHTTPHeaders: { "x-nf-client-connection-ip": workerIp },
      ...(mobile ? { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } : {}),
    });
    await visitor.goto(`/products/${slug}`);
    await visitor.getByRole("link", { name: /start a custom order/i }).click();
    await expect(visitor).toHaveURL(/\/custom-order\?product=/);
    await expect(
      visitor.getByRole("heading", { level: 1, name: /start a custom order/i }),
    ).toBeVisible();
    const next = visitor.getByRole("button", { name: /^next$/i });
    const back = visitor.getByRole("button", { name: /^back$/i });

    // 1. Product type: preselected from the product page.
    await expect(visitor.getByText("Step 1 of 7")).toBeVisible();
    await expect(visitor.getByRole("radio", { name: productTitle, exact: true })).toBeChecked();
    await expect(next).toBeEnabled();
    await next.click();

    // 2. Occasion: "Other" with free text.
    await expect(visitor.getByText("Step 2 of 7")).toBeVisible();
    await expect(next).toBeDisabled();
    await visitor.getByText("Other", { exact: true }).click();
    await expect(next).toBeDisabled();
    await visitor.getByLabel(/what are you celebrating/i).fill("Retirement");
    await expect(next).toBeEnabled();
    await next.click();

    // 3. Business order with a name; Back and forward keep everything (PW-53).
    await expect(visitor.getByText("Step 3 of 7")).toBeVisible();
    await visitor.getByText("A business order").click();
    await expect(next).toBeDisabled();
    await visitor.getByLabel(/business name/i).fill("Acme Pty Ltd");
    await expect(next).toBeEnabled();
    await back.click();
    await expect(visitor.getByText("Step 2 of 7")).toBeVisible();
    await expect(visitor.getByLabel(/what are you celebrating/i)).toHaveValue("Retirement");
    await next.click();
    await expect(visitor.getByLabel(/business name/i)).toHaveValue("Acme Pty Ltd");
    await next.click();

    // 4. Details.
    await expect(visitor.getByText("Step 4 of 7")).toBeVisible();
    await visitor.getByLabel(/names to include/i).fill("Asha and Rafi");
    await visitor.getByLabel(/message to print/i).fill("Happy retirement!");
    await visitor.getByText("Both", { exact: true }).click();
    await next.click();

    // 5. One photo, resized in the browser.
    await expect(visitor.getByText("Step 5 of 7")).toBeVisible();
    await visitor.locator("#photos").setInputFiles(path.join(__dirname, "fixtures", "photo.png"));
    await expect(visitor.getByText("1 of 3 added")).toBeVisible();
    await expect(visitor.getByRole("button", { name: /remove photo 1/i })).toBeVisible();
    await next.click();

    // 6. Quantity and needed-by.
    await expect(visitor.getByText("Step 6 of 7")).toBeVisible();
    const neededBy = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    await visitor.getByLabel(/quantity/i).fill("12");
    await visitor.getByLabel(/needed by/i).fill(neededBy);
    await next.click();

    // 7. Slot and contact details, then submit.
    await expect(visitor.getByText("Step 7 of 7")).toBeVisible();
    const chosenTime = await pickFirstTime(visitor, mobile ? 6 : 4);
    await visitor.getByRole("radio", { name: /phone call/i }).click();
    await visitor.getByLabel(/your name/i).fill(name);
    await visitor.getByLabel(/whatsapp number/i).fill("0412 345 678");
    await visitor.getByLabel(/^email/i).fill(email);
    await expect(visitor.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
    await visitor.getByRole("button", { name: /book and send brief/i }).click();

    const confirmation = visitor.getByTestId("booking-confirmation");
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText(name);
    await expect(confirmation).toContainText(chosenTime);
    await expect(confirmation).toContainText("Phone call");
    await expect(confirmation).toContainText(productTitle);
    const summary = visitor.getByTestId("brief-summary");
    for (const text of ["Retirement", "Acme Pty Ltd", "Asha and Rafi", "12", neededBy]) {
      await expect(summary).toContainText(text);
    }
    await visitor.close();

    // Owner: the brief on the booking (PW-52).
    await page.goto("/admin/bookings");
    await page.getByLabel(/search by name/i).fill(name);
    await expect(page).toHaveURL(/[?&]q=/);
    await expect(page.getByRole("link", { name })).toBeVisible();
    await page.getByRole("link", { name }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    const brief = page.locator('section[aria-labelledby="brief-heading"]');
    for (const text of [
      productTitle,
      "Retirement",
      "Business",
      "Acme Pty Ltd",
      "Asha and Rafi",
      "Happy retirement!",
      "both",
      "12",
      neededBy,
    ]) {
      await expect(brief).toContainText(text);
    }
    await expect(brief.locator("img")).toHaveCount(1);
  });
});
