import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { cleanupE2EProducts, ownerEmail, ownerPassword, signInAsOwner } from "./helpers";

const TITLE_PREFIX = "E2E Editor";

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

/** Removes objects the editor wrote under site-images/home/ during the test (paths it created). */
async function removeSiteImages(paths: string[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || paths.length === 0) return;
  await createClient(url, key, { auth: { persistSession: false } })
    .storage.from("site-images")
    .remove(paths);
}

function sitePaths(content: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o.path === "string" && o.bucket === "site-images") {
      out.push(o.path);
      if (typeof o.thumbPath === "string") out.push(o.thumbPath);
    }
    for (const child of Object.values(o)) walk(child);
  };
  walk(content);
  return out;
}

/**
 * The home page editor (docs/design.md): a product photo into a collage slot, a just-a-photo
 * upload into the portrait, a new product from an upload into a "new" tile, Save publishes,
 * Discard reverts. The chromium project drives it (the home key is shared state); mobile checks
 * the editor opens and a slot's panel works at 360px.
 */
test.describe("home page editor", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");

  let stamp: string;
  let sourceTitle: string;
  let newTitle: string;
  let previousHome: unknown;

  test.beforeEach(async ({}, testInfo) => {
    stamp = `${testInfo.project.name}-${Date.now()}`;
    sourceTitle = `${TITLE_PREFIX} Source ${stamp}`;
    newTitle = `${TITLE_PREFIX} Created ${stamp}`;
    previousHome = await withDb(async (c) => {
      const r = await c.query<{ value: unknown }>(
        `select value from site_settings where key = 'home'`,
      );
      return r.rows[0]?.value ?? null;
    });
  });

  test.afterEach(async () => {
    const current = await withDb(async (c) => {
      const r = await c.query<{ value: unknown }>(
        `select value from site_settings where key = 'home'`,
      );
      return r.rows[0]?.value ?? null;
    });
    const before = new Set(sitePaths(previousHome));
    await removeSiteImages(sitePaths(current).filter((p) => !before.has(p)));
    await withDb(async (c) => {
      if (previousHome === null) await c.query(`delete from site_settings where key = 'home'`);
      else
        await c.query(
          `insert into site_settings (key, value) values ('home', $1) on conflict (key) do update set value = excluded.value`,
          [JSON.stringify(previousHome)],
        );
    });
    await cleanupE2EProducts(TITLE_PREFIX, sourceTitle);
    await cleanupE2EProducts(TITLE_PREFIX, newTitle);
  });

  async function createProductWithPhoto(page: Page, title: string) {
    await page.goto("/admin/products/new");
    await page.getByLabel(/title \(english\)/i).fill(title);
    await page.getByRole("button", { name: /create draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles(path.join(__dirname, "fixtures", "photo.png"));
    await page
      .getByLabel(/alt text/i)
      .first()
      .fill("A test photo");
    await page.getByRole("button", { name: /^upload$/i }).click();
    await expect(page.getByRole("img", { name: "A test photo" }).first()).toBeVisible();
    await page.getByRole("combobox", { name: /status/i }).click();
    await page.getByRole("option", { name: /published/i }).click();
    await page.getByRole("button", { name: /save product/i }).click();
    await expect(page.getByText(/product saved/i)).toBeVisible();
  }

  test("place, upload, create a product, save and discard", async ({ page, context }, testInfo) => {
    test.setTimeout(240_000);
    const mobile = testInfo.project.name === "mobile";
    await signInAsOwner(page);

    if (mobile) {
      // 360px: the editor opens, a slot's button is reachable and the panel appears.
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto("/admin/home-editor");
      await expect(page.getByTestId("editing-bar")).toBeVisible();
      const slot = page.getByTestId("slot-portrait");
      await slot.scrollIntoViewIfNeeded();
      await slot.click();
      await expect(page.getByTestId("picker-sheet")).toBeVisible();
      await expect(page.getByRole("tab", { name: /upload/i })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("picker-sheet")).toHaveCount(0);
      return;
    }

    await createProductWithPhoto(page, sourceTitle);

    await page.goto("/admin/home-editor");
    await expect(page.getByTestId("editing-bar")).toBeVisible();
    await expect(page.getByTestId("editor-dirty")).toContainText(/everything is published/i);

    // 1. From products → collage slot 1.
    const collage = page.getByTestId("slot-collage.0");
    await collage.scrollIntoViewIfNeeded();
    await collage.focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByTestId("picker-sheet");
    await expect(sheet).toBeVisible();
    await sheet.getByLabel(/search products/i).fill(sourceTitle);
    const option = sheet.getByTestId("product-photo-option").first();
    await expect(option).toContainText(sourceTitle);
    await option.click();
    await expect(page.getByText(/photo placed/i)).toBeVisible();
    await expect(page.getByTestId("editor-dirty")).toContainText(/unsaved changes/i);
    await expect(page.locator('[data-slot-frame="collage.0"] img')).toHaveCount(1);

    // 2. Upload as just a photo → portrait.
    const portrait = page.getByTestId("slot-portrait");
    await portrait.scrollIntoViewIfNeeded();
    await portrait.click();
    await sheet.getByRole("tab", { name: /upload/i }).click();
    await sheet
      .locator("#editor-upload")
      .setInputFiles(path.join(__dirname, "fixtures", "photo.png"));
    await expect(sheet.getByTestId("crop-preview")).toBeVisible();
    await sheet.getByTestId("crop-preview").focus();
    await page.keyboard.press("ArrowRight");
    await sheet.getByTestId("choice-just-photo").click();
    await expect(page.getByText(/photo placed/i)).toBeVisible();
    await expect(page.locator('[data-slot-frame="portrait"] img')).toHaveCount(1);

    // 3. Upload as a new product → "new" tile 1 (publishes and places).
    const tile = page.getByTestId("slot-new.0");
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
    await sheet.getByRole("tab", { name: /upload/i }).click();
    await sheet
      .locator("#editor-upload")
      .setInputFiles(path.join(__dirname, "fixtures", "photo.png"));
    await sheet.getByRole("button", { name: /a new product/i }).click();
    await sheet.getByLabel(/title \(english\)/i).fill(newTitle);
    await sheet.getByRole("button", { name: /save and place/i }).click();
    await expect(page.getByText(/product created and placed/i)).toBeVisible();
    await expect(page.locator('[data-slot-frame="new.0"]')).toContainText(newTitle);

    // Not published yet: a visitor doesn't see the new product on the home page.
    const visitor = await context.browser()!.newPage();
    await visitor.goto("/");
    await expect(
      visitor
        .getByRole("list", { name: /new from the studio/i })
        .getByRole("link", { name: newTitle }),
    ).toHaveCount(0);

    // 4. Save → published.
    await page
      .getByTestId("editing-bar")
      .getByRole("button", { name: /^save$/i })
      .click();
    await expect(page.getByText(/home page published/i)).toBeVisible();
    await expect(page.getByTestId("editor-dirty")).toContainText(/everything is published/i);
    await visitor.goto("/");
    await expect(
      visitor
        .getByRole("list", { name: /new from the studio/i })
        .getByRole("link", { name: newTitle }),
    ).toBeVisible();
    await visitor.close();
    // The new product is on the Products page (owner session), then back to the editor.
    await page.goto("/admin/products");
    await expect(page.getByRole("link", { name: newTitle })).toBeVisible();
    await page.goto("/admin/home-editor");
    await expect(page.getByTestId("editing-bar")).toBeVisible();

    // 5. Change the portrait again, then Discard → back to the published copy.
    const portraitAgain = page.getByTestId("slot-portrait");
    await portraitAgain.scrollIntoViewIfNeeded();
    await portraitAgain.click();
    await sheet.getByRole("button", { name: /remove from this spot/i }).click();
    await expect(page.getByTestId("editor-dirty")).toContainText(/unsaved changes/i);
    await expect(page.locator('[data-slot-frame="portrait"] img')).toHaveCount(0);
    await page
      .getByTestId("editing-bar")
      .getByRole("button", { name: /discard changes/i })
      .click();
    await page.getByRole("button", { name: /^discard$/i }).click();
    await expect(page.getByText(/changes discarded/i)).toBeVisible();
    await expect(page.locator('[data-slot-frame="portrait"] img')).toHaveCount(1);
  });
});
