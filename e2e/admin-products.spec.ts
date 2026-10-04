import { expect, test } from "@playwright/test";
import { cleanupE2EProducts, ownerEmail, ownerPassword, signInAsOwner } from "./helpers";

const TITLE_PREFIX = "E2E Mug";

// Image upload is covered by unit tests; this walks the product lifecycle through the UI.
test.describe("product management (OD-10, OD-13)", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");

  let title: string;

  test.beforeEach(({}, testInfo) => {
    // Unique per project too, so the chromium and mobile runs never share a row.
    title = `${TITLE_PREFIX} ${testInfo.project.name} ${Date.now()}`;
  });

  // The happy path deletes its own product; this catches whatever a failed run left behind.
  test.afterEach(async () => {
    await cleanupE2EProducts(TITLE_PREFIX, title);
  });

  test("create → edit → publish → archive → delete", async ({ page }) => {
    await signInAsOwner(page);

    // Create a draft
    await page.goto("/admin/products/new");
    await page.getByLabel(/title \(english\)/i).fill(title);
    await expect(page.getByLabel(/slug/i)).toHaveValue(/^e2e-mug-[a-z]+-\d+$/);
    await page.getByRole("button", { name: /create draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: /edit product/i })).toBeVisible();

    // Edit and publish
    await page.getByLabel(/description \(english\)/i).fill("Made in the e2e suite.");
    await page.getByRole("combobox", { name: /status/i }).click();
    await page.getByRole("option", { name: /published/i }).click();
    await page.getByRole("button", { name: /save product/i }).click();
    await expect(page.getByText(/product saved/i)).toBeVisible();
    await expect(page.getByText(/first published/i)).toBeVisible();

    // List shows it as published
    await page.goto("/admin/products");
    const row = page.getByRole("row").filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row.getByText(/^published$/i)).toBeVisible();

    // Archive from the row menu
    await row.getByRole("button", { name: new RegExp(`actions for ${title}`, "i") }).click();
    await page.getByRole("menuitem", { name: /^archive$/i }).click();
    await expect(page.getByText(/product archived/i)).toBeVisible();
    await expect(row.getByText(/^archived$/i)).toBeVisible();

    // Delete with confirmation
    await row.getByRole("button", { name: new RegExp(`actions for ${title}`, "i") }).click();
    await page.getByRole("menuitem", { name: /^delete$/i }).click();
    await expect(page.getByRole("alertdialog")).toContainText(title);
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(/product deleted/i)).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
  });
});
