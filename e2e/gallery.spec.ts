import path from "node:path";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { ownerEmail, ownerPassword, signInAsOwner } from "./helpers";

const workerIp = `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

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

/** Deletes the test's rows and their files in both buckets. */
async function cleanup(firstName: string) {
  const rows = await withDb((c) =>
    c.query<{
      id: string;
      image_path: string;
      thumb_path: string;
      public_image_path: string | null;
      public_thumb_path: string | null;
    }>(
      `delete from gallery_submissions where first_name = $1 returning id, image_path, thumb_path, public_image_path, public_thumb_path`,
      [firstName],
    ),
  );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rows || !url || !key) return;
  const storage = createClient(url, key, { auth: { persistSession: false } }).storage;
  const pending = rows.rows.flatMap((r) => [r.image_path, r.thumb_path]);
  const pub = rows.rows
    .flatMap((r) => [r.public_image_path, r.public_thumb_path])
    .filter((p): p is string => !!p);
  if (pending.length) await storage.from("gallery-pending").remove(pending);
  if (pub.length) await storage.from("gallery-images").remove(pub);
}

/**
 * PW-70..PW-72, OD-32: a visitor submits a photo by keyboard, it stays private; the owner approves
 * it (on the mobile project too), it appears on /gallery and the home row; hide removes it from
 * both and the public URL stops serving; delete removes the row.
 */
test.describe("customer gallery", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");
  test.use({ extraHTTPHeaders: { "x-nf-client-connection-ip": workerIp } });

  let firstName: string;
  test.beforeEach(({}, testInfo) => {
    firstName = `E2E ${testInfo.project.name} ${Date.now().toString(36)}`;
  });
  test.afterEach(async () => {
    await cleanup(firstName);
  });

  test("submit → private → approve → public → hide → gone → delete", async ({ page, context }) => {
    test.setTimeout(300_000);

    // Visitor submits with the keyboard only.
    await page.goto("/gallery");
    await page.getByTestId("gallery-share").focus();
    await page.keyboard.press("Enter");
    const form = page.getByTestId("gallery-form");
    await expect(form).toBeVisible();
    await form
      .getByLabel(/your photo/i)
      .setInputFiles(path.join(__dirname, "fixtures", "photo.png"));
    await form.getByLabel("First name (optional)").fill(firstName);
    await form.getByLabel(/a few words/i).fill("Our wedding\nnameplate");
    // Consent is required: submitting without it shows the message.
    await form.getByRole("checkbox", { name: /i agree/i }).focus();
    await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
    await form.getByRole("button", { name: /send photo/i }).focus();
    await page.keyboard.press("Enter");
    await expect(form.getByText(/please tick the box/i)).toBeVisible();
    await form.getByRole("checkbox", { name: /i agree/i }).focus();
    await page.keyboard.press("Space");
    await form.getByRole("button", { name: /send photo/i }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("gallery-sent")).toBeVisible();
    await page.keyboard.press("Escape");

    // Private: nothing public yet, nowhere.
    const row = await withDb((c) =>
      c.query<{ id: string; status: string; public_image_path: string | null; note: string }>(
        `select id, status, public_image_path, note from gallery_submissions where first_name = $1`,
        [firstName],
      ),
    );
    expect(row?.rows[0]).toMatchObject({
      status: "pending",
      public_image_path: null,
      note: "Our wedding nameplate",
    });
    await page.goto("/gallery");
    await expect(page.getByText(firstName)).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByText(firstName)).toHaveCount(0);

    // Owner approves.
    const owner = await context.newPage();
    await signInAsOwner(owner);
    await owner.goto("/admin/gallery");
    await expect(owner.getByTestId("gallery-badge")).toBeVisible();
    const card = owner.getByTestId("review-card").filter({ hasText: firstName });
    await expect(card).toBeVisible();
    await expect(card.locator("img")).toHaveAttribute("src", /gallery-pending/);
    await card.getByRole("button", { name: /approve/i }).click();
    await expect(owner.getByText(/photo approved/i)).toBeVisible();

    await page.goto("/gallery");
    const tile = page.getByTestId("gallery-tile").filter({ hasText: firstName });
    await expect(tile).toBeVisible();
    await expect(tile).toContainText("Our wedding nameplate");
    const publicUrl = await tile.locator("a").getAttribute("href");
    expect(publicUrl).toMatch(/gallery-images/);
    expect((await page.request.get(publicUrl!)).status()).toBe(200);
    await page.goto("/");
    await expect(page.getByText(firstName)).toBeVisible();

    // Owner hides: gone from both, and the old public URL no longer serves.
    await owner.goto("/admin/gallery?tab=approved");
    await owner
      .getByTestId("review-card")
      .filter({ hasText: firstName })
      .getByRole("button", { name: /^hide$/i })
      .click();
    await expect(owner.getByText(/photo hidden/i)).toBeVisible();
    await page.goto("/gallery");
    await expect(page.getByText(firstName)).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByText(firstName)).toHaveCount(0);
    // Supabase purges its CDN on delete within about a minute; a missing object answers 400/404.
    await expect
      .poll(async () => (await page.request.get(publicUrl!)).status(), {
        timeout: 120_000,
        intervals: [2_000, 5_000],
      })
      .not.toBe(200);

    // Hidden tab still has it (private copy), then delete.
    await owner.goto("/admin/gallery?tab=hidden");
    const hiddenCard = owner.getByTestId("review-card").filter({ hasText: firstName });
    await expect(hiddenCard).toBeVisible();
    await hiddenCard.getByRole("button", { name: /delete/i }).click();
    await owner
      .getByRole("button", { name: /^delete$/i })
      .last()
      .click();
    await expect(owner.getByText(/photo deleted/i)).toBeVisible();
    const gone = await withDb((c) =>
      c.query(`select id from gallery_submissions where first_name = $1`, [firstName]),
    );
    expect(gone?.rowCount).toBe(0);
    await owner.close();
  });
});
