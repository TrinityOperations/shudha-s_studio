import { expect, test, type Locator } from "@playwright/test";
import { Client } from "pg";
import { cleanupE2EProducts, ownerEmail, ownerPassword, signInAsOwner } from "./helpers";

const TITLE_PREFIX = "E2E Home";

/** Sets the studio WhatsApp number straight in the DB (the settings editor is slice #10). */
async function setContactNumber(number: string | null): Promise<unknown> {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return null;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const current = await client.query<{ value: unknown }>(
      `select value from site_settings where key = 'contact'`,
    );
    const previous = current.rows[0]?.value ?? null;
    if (number === null) {
      await client.query(`delete from site_settings where key = 'contact'`);
    } else {
      const value = { ...((previous as object) ?? { email: "" }), whatsappNumber: number };
      await client.query(
        `insert into site_settings (key, value) values ('contact', $1)
         on conflict (key) do update set value = excluded.value`,
        [JSON.stringify(value)],
      );
    }
    return previous;
  } finally {
    await client.end();
  }
}

async function restoreContact(previous: unknown) {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    if (previous === null) await client.query(`delete from site_settings where key = 'contact'`);
    else
      await client.query(
        `insert into site_settings (key, value) values ('contact', $1)
         on conflict (key) do update set value = excluded.value`,
        [JSON.stringify(previous)],
      );
  } finally {
    await client.end();
  }
}

/** Asserts `inner`'s bounding box lies inside `outer`'s (2px tolerance); skips when `inner` is absent. */
async function expectInside(inner: Locator, outer: Locator) {
  if ((await inner.count()) === 0) return;
  await inner.scrollIntoViewIfNeeded();
  const [a, b] = await Promise.all([inner.boundingBox(), outer.boundingBox()]);
  expect(a, "inner box").not.toBeNull();
  expect(b, "outer box").not.toBeNull();
  if (!a || !b) return;
  expect(a.x).toBeGreaterThanOrEqual(b.x - 2);
  expect(a.y).toBeGreaterThanOrEqual(b.y - 2);
  expect(a.x + a.width).toBeLessThanOrEqual(b.x + b.width + 2);
  expect(a.y + a.height).toBeLessThanOrEqual(b.y + b.height + 2);
}

/** Whether the owner has picked products for "New from the studio" (home key, published copy). */
async function hasNewPicks(): Promise<boolean> {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return false;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const r = await client.query<{ n: number }>(
      `select coalesce(jsonb_array_length(value -> 'published' -> 'newPicks'), 0)::int as n
       from site_settings where key = 'home'`,
    );
    return (r.rows[0]?.n ?? 0) > 0;
  } finally {
    await client.end();
  }
}

/**
 * PW-01..PW-04, PW-47 and the header from docs/design.md: hero, chips, occasion tiles, a
 * published product under "New from the studio", the collapsing header, the phone menu and the
 * WhatsApp button that appears once a number is set.
 */
test.describe("home page and site chrome", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");

  let productTitle: string;

  test.beforeEach(({}, testInfo) => {
    productTitle = `${TITLE_PREFIX} ${testInfo.project.name} ${Date.now()}`;
  });

  test.afterEach(async () => {
    await cleanupE2EProducts(TITLE_PREFIX, productTitle);
  });

  test("hero, sections, header collapse, menu and WhatsApp button", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000);
    const mobile = testInfo.project.name === "mobile";

    // A published product so "New from the studio" has something to show.
    await signInAsOwner(page);
    await page.goto("/admin/products/new");
    await page.getByLabel(/title \(english\)/i).fill(productTitle);
    await page.getByRole("button", { name: /create draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    await page.getByRole("combobox", { name: /status/i }).click();
    await page.getByRole("option", { name: /published/i }).click();
    await page.getByRole("button", { name: /save product/i }).click();
    await expect(page.getByText(/product saved/i)).toBeVisible();

    const visitor = await context.browser()!.newPage(
      // 1440 wide on desktop: the header shows the name next to the mark from 1400px.
      mobile
        ? { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true }
        : { viewport: { width: 1440, height: 900 } },
    );

    // The contact row is shared state, so only the mobile project (where the overlap check
    // matters) clears and sets it; the projects run in parallel.
    const previous = mobile ? await setContactNumber(null) : undefined;
    try {
      await visitor.goto("/");
      await expect(
        visitor.getByRole("heading", { level: 1, name: /be a reason for someone's happiness/i }),
      ).toBeVisible();
      if (mobile) await expect(visitor.getByTestId("whatsapp-button")).toHaveCount(0);
      const hero = visitor.getByTestId("hero");
      await expect(hero.getByRole("link", { name: /book a free consultation/i })).toHaveAttribute(
        "href",
        "/book",
      );
      await expect(hero.getByRole("link", { name: /start a custom order/i })).toHaveAttribute(
        "href",
        "/custom-order",
      );

      // Layout: the welcome card is visible and every fill image stays inside its own box
      // (a wrapper once broke the hero and made-for-you photos' containing blocks).
      await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
      await expectInside(hero.locator("img").first(), hero);
      const madeForYou = visitor.locator("#made-for-you");
      await expectInside(
        madeForYou.getByTestId("made-for-you-photo").locator("img").first(),
        madeForYou,
      );
      // Signature designs: on desktop the panel pins below the collapsed header while the cards
      // scroll past; on phones it scrolls away like everything else.
      const signature = visitor.getByTestId("signature-designs");
      if ((await signature.count()) > 0) {
        const panel = visitor.getByTestId("signature-panel");
        const firstCard = visitor.getByTestId("signature-cards").locator("li").first();
        await visitor.evaluate(() => {
          const section = document.querySelector('[data-testid="signature-designs"]');
          if (section)
            window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY });
        });
        await visitor.waitForTimeout(300);
        const panelBefore = (await panel.boundingBox())!.y;
        const cardBefore = (await firstCard.boundingBox())!.y;
        await visitor.evaluate(() => window.scrollBy({ top: 200 }));
        await visitor.waitForTimeout(300);
        const panelAfter = (await panel.boundingBox())!.y;
        const cardAfter = (await firstCard.boundingBox())!.y;
        expect(Math.round(cardBefore - cardAfter)).toBeGreaterThanOrEqual(195);
        if (mobile) {
          expect(Math.round(panelBefore - panelAfter)).toBeGreaterThanOrEqual(195);
        } else {
          const headerBottom =
            (await visitor.getByTestId("site-header").boundingBox())!.y +
            (await visitor.getByTestId("site-header").boundingBox())!.height;
          expect(Math.abs(panelAfter - headerBottom)).toBeLessThanOrEqual(2);
          expect(Math.abs(panelAfter - panelBefore)).toBeLessThan(200);
        }
      }

      // The layout checks scrolled; the header checks below start from the top.
      await visitor.evaluate(() => window.scrollTo({ top: 0 }));

      // Category chips and occasion tiles link into the catalogue.
      const chips = visitor.getByRole("navigation", { name: /shop by category/i });
      await expect(chips.getByRole("link").first()).toHaveAttribute(
        "href",
        /\/products\?category=/,
      );
      const occasions = visitor.getByRole("list", { name: /shop by occasion/i });
      await expect(occasions.getByRole("link").first()).toHaveAttribute(
        "href",
        /\/products\?occasion=/,
      );

      // "New from the studio" shows the owner's picks when she has chosen some (the home page
      // editor, slice #10), otherwise the newest published products, so the e2e product.
      const newRow = visitor.getByRole("list", { name: /new from the studio/i });
      if (await hasNewPicks()) {
        expect(await newRow.getByRole("link").count()).toBeGreaterThan(0);
      } else {
        await expect(newRow.getByRole("link", { name: productTitle })).toBeVisible();
      }

      // Header: name shown at the top, hidden once the hero is gone, back at the top.
      // Desktop markup comes first in the header, the phone markup second.
      const name = visitor.getByTestId("site-name").nth(mobile ? 1 : 0);
      const header = visitor.getByTestId("site-header");
      await expect(header).toHaveAttribute("data-collapsed", "false");
      await expect(name).toBeVisible();
      await visitor.mouse.wheel(0, 1200);
      await expect(header).toHaveAttribute("data-collapsed", "true");
      await expect(name).toHaveCSS("opacity", "0");
      await visitor.evaluate(() => window.scrollTo({ top: 0 }));
      await expect(header).toHaveAttribute("data-collapsed", "false");
      await expect(name).toHaveCSS("opacity", "1");

      // A page without a hero never collapses.
      await visitor.goto("/products");
      await expect(visitor.getByTestId("site-header")).toHaveAttribute("data-collapsed", "false");
      await expect(visitor.getByTestId("site-name").nth(mobile ? 1 : 0)).toBeVisible();

      if (mobile) {
        // Phone menu: opens, nav is there, Book works by keyboard.
        await visitor.getByTestId("header-menu").click();
        const sheet = visitor.getByRole("dialog");
        await expect(sheet.getByRole("link", { name: /all gifts/i })).toBeVisible();
        await sheet.getByRole("link", { name: /book a consultation/i }).focus();
        await visitor.keyboard.press("Enter");
        await expect(visitor).toHaveURL(/\/book$/);
      } else {
        // At 1280 the header still shows the name next to the mark (mark only below 1200).
        const narrow = await context.browser()!.newPage({ viewport: { width: 1280, height: 800 } });
        await narrow.goto("/");
        await expect(narrow.getByTestId("site-header")).toHaveAttribute("data-collapsed", "false");
        await expect(narrow.getByTestId("site-name").nth(0)).toBeVisible();
        await narrow.close();

        // Keyboard: Tab from the top reaches the Book pill in the header.
        await visitor.goto("/");
        for (let i = 0; i < 12; i++) {
          await visitor.keyboard.press("Tab");
          const focused = await visitor.evaluate(() => document.activeElement?.textContent?.trim());
          if (focused === "Book a consultation") break;
        }
        await expect(visitor.locator(":focus")).toHaveText(/book a consultation/i);
      }

      if (mobile) {
        // With a number set, the button appears, links to wa.me and never covers the footer's
        // last line at 360px.
        await setContactNumber("61412345678");
        await visitor.goto("/");
        const button = visitor.getByTestId("whatsapp-button");
        await expect(button).toBeVisible();
        await expect(button).toHaveAttribute("href", "https://wa.me/61412345678");
        const copyright = visitor.getByText(/© \d{4} .*melbourne/i);
        await copyright.scrollIntoViewIfNeeded();
        const [a, b] = await Promise.all([button.boundingBox(), copyright.boundingBox()]);
        expect(
          a && b && (a.y >= b.y + b.height || a.y + a.height <= b.y || a.x >= b.x + b.width),
        ).toBe(true);
      }
    } finally {
      if (mobile) await restoreContact(previous);
      await visitor.close();
    }
  });
});
