import { expect, test, type Page } from "@playwright/test";
import {
  cleanupE2EBookings,
  cleanupE2EProducts,
  ownerEmail,
  ownerPassword,
  signInAsOwner,
} from "./helpers";

const TITLE_PREFIX = "E2E Wishlist";
const EMAIL_PREFIX = "e2e-wishlist";
const workerIp = `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

/**
 * PW-60..PW-62: save two products, survive a reload, remove one, open a shared link that also
 * names a draft (skipped), save it, attach the list to a booking, and see it in the dashboard.
 * Projects pick different dates (first time of the day) so they never race for one slot.
 */
test.describe("wishlist", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");
  test.use({ extraHTTPHeaders: { "x-nf-client-connection-ip": workerIp } });

  let titleA: string;
  let titleB: string;
  let draftTitle: string;
  let email: string;
  let name: string;

  test.beforeEach(({}, testInfo) => {
    const stamp = `${testInfo.project.name}-${Date.now()}`;
    titleA = `${TITLE_PREFIX} Frame ${stamp}`;
    titleB = `${TITLE_PREFIX} Lamp ${stamp}`;
    draftTitle = `${TITLE_PREFIX} Draft ${stamp}`;
    email = `${EMAIL_PREFIX}+${stamp}@example.com`;
    name = `E2E Wishlist Customer ${stamp}`;
  });

  test.afterEach(async () => {
    await cleanupE2EBookings(email);
    for (const title of [titleA, titleB, draftTitle]) await cleanupE2EProducts(TITLE_PREFIX, title);
  });

  async function createProduct(page: Page, title: string, publish: boolean) {
    await page.goto("/admin/products/new");
    await page.getByLabel(/title \(english\)/i).fill(title);
    await page.getByRole("button", { name: /create draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    const slug = await page.getByLabel(/slug/i).inputValue();
    if (publish) {
      await page.getByRole("combobox", { name: /status/i }).click();
      await page.getByRole("option", { name: /published/i }).click();
      await page.getByRole("button", { name: /save product/i }).click();
      await expect(page.getByText(/product saved/i)).toBeVisible();
    }
    return slug;
  }

  async function pickFirstTime(page: Page, index: number) {
    const dates = page.getByRole("group", { name: /choose a date/i }).getByRole("button");
    await dates.nth(index).click();
    const times = page.getByRole("radio", { name: /am|pm/i });
    expect(await times.count()).toBeGreaterThan(0);
    const radio = times.first();
    const id = await radio.getAttribute("id");
    await page.locator(`label[for="${id}"]`).click();
    await expect(radio).toBeChecked();
  }

  test("save, reload, remove, shared link, attach to a booking, dashboard", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000);
    const mobile = testInfo.project.name === "mobile";

    await signInAsOwner(page);
    await page.goto("/admin/availability");
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
      const row = page.getByRole("listitem").filter({ hasText: day });
      const toggle = row.getByRole("switch");
      if ((await toggle.getAttribute("aria-checked")) !== "true") await toggle.click();
    }
    await page.getByRole("button", { name: /save hours/i }).click();
    await expect(page.getByText(/hours saved/i)).toBeVisible();

    const slugA = await createProduct(page, titleA, true);
    const slugB = await createProduct(page, titleB, true);
    const draftSlug = await createProduct(page, draftTitle, false);

    // Visitor: save both from the catalogue (the heart never opens the product page).
    const visitor = await context.browser()!.newPage({
      extraHTTPHeaders: { "x-nf-client-connection-ip": workerIp },
      ...(mobile ? { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } : {}),
    });
    await visitor.goto(`/products?q=${encodeURIComponent(TITLE_PREFIX)}`);
    for (const title of [titleA, titleB]) {
      const heart = visitor.getByRole("button", { name: `Save: ${title}` });
      await heart.click();
      await expect(visitor.getByRole("button", { name: `Saved: ${title}` })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    await expect(visitor).toHaveURL(/\/products\?q=/);

    // The list survives a reload and the product page shows the saved state.
    await visitor.reload();
    await expect(visitor.getByRole("button", { name: `Saved: ${titleA}` })).toBeVisible();
    await visitor.goto(`/products/${slugA}`);
    await expect(visitor.getByRole("button", { name: /^saved$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Own list: two tiles, remove one.
    await visitor.goto("/wishlist");
    await expect(visitor.getByTestId("wishlist-tile")).toHaveCount(2);
    await visitor.getByRole("button", { name: `Remove ${titleB} from your wishlist` }).click();
    await expect(visitor.getByTestId("wishlist-tile")).toHaveCount(1);
    await expect(visitor.getByTestId("wishlist-tile")).toContainText(titleA);
    await expect(visitor.getByTestId("wishlist-share-url")).toContainText(
      `/wishlist?items=${slugA}`,
    );

    // Shared link: the draft is skipped; saving merges into the local list.
    await visitor.goto(`/wishlist?items=${slugB},${draftSlug},not%20a%20slug`);
    const shared = visitor.getByTestId("shared-wishlist");
    await expect(shared.getByTestId("wishlist-tile")).toHaveCount(1);
    await expect(shared).toContainText(titleB);
    await expect(shared).not.toContainText(draftTitle);
    await visitor.getByRole("button", { name: /save these to my list/i }).click();
    await expect(visitor.getByText(/added 1 products to your wishlist/i)).toBeVisible();
    await visitor.goto("/wishlist");
    await expect(visitor.getByTestId("wishlist-tile")).toHaveCount(2);

    // Book with the list attached.
    await visitor.getByRole("link", { name: /book a chat about these/i }).click();
    await expect(visitor).toHaveURL(/\/book\?wishlist=1$/);
    const attach = visitor.getByRole("checkbox", { name: /attach my wishlist \(2 items\)/i });
    await expect(attach).toBeChecked();
    await expect(visitor.getByTestId("wishlist-attach")).toContainText(titleA);
    await pickFirstTime(visitor, mobile ? 8 : 10);
    await visitor.getByLabel(/your name/i).fill(name);
    await visitor.getByLabel(/whatsapp number/i).fill("0412 345 678");
    await visitor.getByLabel(/^email/i).fill(email);
    await expect(visitor.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
    await visitor.getByRole("button", { name: /book consultation/i }).click();
    const confirmation = visitor.getByTestId("booking-confirmation");
    await expect(confirmation).toBeVisible();
    await expect(confirmation.getByTestId("confirmation-wishlist")).toContainText("2 wishlist");

    // Book again without attaching: the list is still in the browser, the box is unticked.
    await visitor.goto("/book");
    const attachAgain = visitor.getByRole("checkbox", { name: /attach my wishlist \(2 items\)/i });
    await expect(attachAgain).not.toBeChecked();
    await pickFirstTime(visitor, mobile ? 11 : 12);
    await visitor.getByLabel(/your name/i).fill(`${name} plain`);
    await visitor.getByLabel(/whatsapp number/i).fill("0412 345 678");
    await visitor.getByLabel(/^email/i).fill(email);
    await expect(visitor.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
    await visitor.getByRole("button", { name: /book consultation/i }).click();
    const plain = visitor.getByTestId("booking-confirmation");
    await expect(plain).toBeVisible();
    await expect(plain.getByTestId("confirmation-wishlist")).toHaveCount(0);
    await visitor.close();

    // Owner: the attached list shows on the first booking, nothing on the second.
    await page.goto("/admin/bookings");
    await page.getByLabel(/search by name/i).fill(name);
    await expect(page).toHaveURL(/[?&]q=/);
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    const wishlist = page.locator('section[aria-labelledby="wishlist-heading"]');
    await expect(wishlist).toContainText(titleA);
    await expect(wishlist).toContainText(titleB);
    await expect(wishlist.getByRole("link")).toHaveCount(2);

    await page.goto("/admin/bookings");
    await page.getByLabel(/search by name/i).fill(`${name} plain`);
    await expect(page).toHaveURL(/[?&]q=/);
    await page.getByRole("link", { name: `${name} plain` }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    await expect(page.locator('section[aria-labelledby="wishlist-heading"]')).toContainText(
      /no wishlist/i,
    );
  });
});
