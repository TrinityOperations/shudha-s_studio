import { expect, test } from "@playwright/test";
import { cleanupE2EProducts, ownerEmail, ownerPassword, signInAsOwner } from "./helpers";

const TITLE_PREFIX = "E2E Catalogue";

/**
 * PW-10..14, PW-21, PW-48: as the owner, publish one priced product and leave one draft; as a
 * visitor, filter, search, open the product page and confirm the draft is not public.
 */
test.describe("public catalogue (PW-10..PW-15, PW-21, PW-48)", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");

  let publishedTitle: string;
  let draftTitle: string;

  test.beforeEach(({}, testInfo) => {
    const stamp = `${testInfo.project.name} ${Date.now()}`;
    publishedTitle = `${TITLE_PREFIX} Mug ${stamp}`;
    draftTitle = `${TITLE_PREFIX} Draft ${stamp}`;
  });

  test.afterEach(async () => {
    await cleanupE2EProducts(TITLE_PREFIX, publishedTitle);
    await cleanupE2EProducts(TITLE_PREFIX, draftTitle);
  });

  test("filter, search, product page, price, delivery note, draft hidden", async ({
    page,
    context,
  }) => {
    await signInAsOwner(page);

    // Published product with a price and a category
    await page.goto("/admin/products/new");
    await page.getByLabel(/title \(english\)/i).fill(publishedTitle);
    await page.getByLabel(/description \(english\)/i).fill("A mug from the e2e suite");
    await page.getByLabel(/starting price/i).fill("25");
    await page.getByRole("combobox", { name: /^category/i }).click();
    const firstCategory = page.getByRole("option").nth(1); // 0 is "None"
    const categoryName = (await firstCategory.textContent())!.trim();
    await firstCategory.click();
    await page.getByRole("button", { name: /create draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    const publishedSlug = await page.getByLabel(/slug/i).inputValue();
    await page.getByRole("combobox", { name: /status/i }).click();
    await page.getByRole("option", { name: /published/i }).click();
    await page.getByRole("button", { name: /save product/i }).click();
    await expect(page.getByText(/product saved/i)).toBeVisible();

    // Draft product
    await page.goto("/admin/products/new");
    await page.getByLabel(/title \(english\)/i).fill(draftTitle);
    await page.getByRole("button", { name: /create draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    const draftSlug = await page.getByLabel(/slug/i).inputValue();

    // Visitor: fresh context, no session
    const visitor = await context.browser()!.newPage();
    await visitor.goto("/products");
    await expect(visitor.getByRole("heading", { level: 1, name: /products/i })).toBeVisible();

    // Filter by the category: the panel starts collapsed on every width
    await visitor.getByText(/^filter products$/i).click();
    await visitor
      .getByRole("group", { name: /^category$/i })
      .getByLabel(categoryName, { exact: true })
      .check();
    await expect(visitor).toHaveURL(/\/products\?category=[a-z0-9-]+/);
    await expect(visitor.getByRole("link", { name: publishedTitle })).toBeVisible();
    await expect(visitor.getByRole("link", { name: draftTitle })).toHaveCount(0);

    // Search keeps the category filter and the URL carries both
    await visitor.getByLabel(/search products/i).fill("e2e suite");
    await visitor.getByLabel(/search products/i).press("Enter");
    await expect(visitor).toHaveURL(/category=.*q=e2e\+suite|q=e2e\+suite.*category=/);
    await expect(visitor.getByRole("link", { name: publishedTitle })).toBeVisible();

    // Product page: price, delivery note, book link
    await visitor.getByRole("link", { name: publishedTitle }).click();
    await expect(visitor).toHaveURL(new RegExp(`/products/${publishedSlug}$`));
    await expect(visitor.getByRole("heading", { level: 1, name: publishedTitle })).toBeVisible();
    // Related cards may carry prices too; the product header comes first in the DOM.
    await expect(visitor.getByText("From $25").first()).toBeVisible();
    await expect(visitor.getByText(/pickup or postal delivery across australia/i)).toBeVisible();
    await expect(visitor.getByRole("link", { name: /book an appointment/i })).toHaveAttribute(
      "href",
      `/book?product=${publishedSlug}`,
    );

    // Draft slug is not public
    const response = await visitor.goto(`/products/${draftSlug}`);
    expect(response?.status()).toBe(404);
    await visitor.close();
  });
});
