import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { cleanupE2EProducts, ownerEmail, ownerPassword, signInAsOwner } from "./helpers";

const TITLE_PREFIX = "E2E Bengali";
const SHOTS = path.join(process.cwd(), "test-results", "bengali");
const BENGALI_DIGITS = /[০-৯]/;
const BENGALI_LETTERS = /[ঀ-৿]/;

/** Font families loaded by the page (document.fonts), lower-cased. */
async function loadedFontFamilies(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((f) => f.status === "loaded")
      .map((f) => f.family.toLowerCase());
  });
}

async function computedFamily(page: Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily.toLowerCase());
}

/**
 * PW-80..PW-82: the toggle persists (cookie, new tab, dashboard), `?lang=bn` is served directly in
 * Bengali with hreflang metadata, Bengali pages use Tiro Bangla headings and Noto Sans Bengali body
 * while English pages never load those fonts, dates use Bengali digits, and the home, product and
 * booking pages render in Bengali (captures in test-results/bengali, including WebKit).
 */
test.describe("English / Bengali", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");

  let productTitle: string;
  test.beforeEach(({}, testInfo) => {
    productTitle = `${TITLE_PREFIX} ${testInfo.project.name} ${Date.now()}`;
    mkdirSync(SHOTS, { recursive: true });
  });
  test.afterEach(async () => {
    await cleanupE2EProducts(TITLE_PREFIX, productTitle);
  });

  test("?lang=bn is served in Bengali with hreflang and the cookie follows", async ({ page }) => {
    await page.goto("/about?lang=bn");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/about\?lang=bn$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      /\/about$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="bn"]')).toHaveAttribute(
      "href",
      /\/about\?lang=bn$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/about$/,
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "bn_BD");
    // The clean URL now follows the cookie the proxy set.
    await page.goto("/about");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await page.goto("/about?lang=en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/about$/);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_AU");
  });

  test("the toggle persists across navigation, a new tab and the dashboard", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "one project is enough for the cookie");
    // Sign in first (the login helper reads English labels), then switch language on the site.
    await signInAsOwner(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    // English pages never load the Bengali web fonts (only the 10 KB accent subset).
    const enFonts = await loadedFontFamilies(page);
    expect(enFonts.some((f) => f.includes("noto sans bengali") || f === "tiro bangla")).toBe(false);

    await page
      .getByRole("button", { name: /language/i })
      .first()
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await page.goto("/products");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    const tab = await context.newPage();
    await tab.goto("/book");
    await expect(tab.locator("html")).toHaveAttribute("lang", "bn");
    await tab.close();

    // The dashboard follows the same cookie.
    await page.goto("/admin");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(BENGALI_LETTERS);
  });

  test("Bengali pages use the Bengali fonts and digits; captures at this project's width", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000);
    // A published product to open (the owner session lives in its own page).
    const owner = await context.newPage();
    await signInAsOwner(owner);
    await owner.goto("/admin/products/new");
    await owner.getByLabel(/title \(english\)/i).fill(productTitle);
    await owner.getByLabel(/title \(bengali\)/i).fill("পরীক্ষামূলক মগ");
    await owner.getByRole("button", { name: /create draft/i }).click();
    await expect(owner).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    const slug = await owner.getByLabel(/slug/i).inputValue();
    await owner.getByRole("combobox", { name: /status/i }).click();
    await owner.getByRole("option", { name: /published/i }).click();
    await owner.getByRole("button", { name: /save product/i }).click();
    await expect(owner.getByText(/product saved/i)).toBeVisible();
    // Reset the owner page's language so the shared cookie jar does not leak Bengali into it.
    await owner.close();

    const width = page.viewportSize()?.width ?? 0;
    const tag = `${testInfo.project.name}-${width}`;

    await page.goto("/?lang=bn");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    expect(await computedFamily(page, "h1")).toContain("tiro bangla");
    expect(await computedFamily(page, "body")).toContain("noto sans bengali");
    const bnFonts = await loadedFontFamilies(page);
    expect(bnFonts.some((f) => f.includes("noto sans bengali"))).toBe(true);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOTS, `home-${tag}.png`), fullPage: false });

    await page.goto(`/products/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("পরীক্ষামূলক মগ");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, `product-${tag}.png`), fullPage: false });

    await page.goto("/book");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    const dates = page.getByRole("group").getByRole("button");
    await expect(dates.first()).toContainText(BENGALI_DIGITS);
    await dates.first().click();
    await expect(page.getByRole("radio").first()).toBeAttached();
    const firstTime = page.locator('label[for^="slot-"]').first();
    await expect(firstTime).toContainText(BENGALI_DIGITS);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, `book-${tag}.png`), fullPage: false });

    // The catalogue card shows the Bengali title on a Bengali page (projects run in parallel, so
    // several products share this title; pick ours by slug).
    await page.goto("/products?lang=bn");
    await expect(page.locator(`a[href="/products/${slug}"]`).first()).toHaveText("পরীক্ষামূলক মগ");
  });
});
