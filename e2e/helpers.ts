import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

export const ownerEmail = process.env.E2E_OWNER_EMAIL;
export const ownerPassword = process.env.E2E_OWNER_PASSWORD;

/**
 * Deletes the product this test created (`title`) plus any product with the same prefix left
 * behind by an earlier failed run. Siblings from the parallel chromium/mobile projects are only a
 * few seconds old, so the 10-minute cutoff keeps them out of reach. Rows cascade to images and
 * joins; e2e products never upload files, so storage needs no cleanup.
 */
export async function cleanupE2EProducts(prefix: string, title: string): Promise<number> {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return 0;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(
      `delete from products
       where title = $1
          or (title like $2 and created_at < now() - interval '10 minutes')`,
      [title, `${prefix.replace(/[\\%_]/g, "\\$&")}%`],
    );
    return result.rowCount ?? 0;
  } finally {
    await client.end();
  }
}

/** Signs in as the owner. Needs Cloudflare's Turnstile test keys in the dev server env. */
export async function signInAsOwner(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/^email/i).fill(ownerEmail!);
  await page.getByLabel(/^password/i).fill(ownerPassword!);
  // The widget issues its token asynchronously; submitting before it lands fails validation silently.
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Deletes bookings whose customer email starts with `emailPrefix` (e2e bookings only). */
export async function cleanupE2EBookings(emailPrefix: string): Promise<number> {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return 0;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`delete from bookings where customer_email like $1`, [
      `${emailPrefix.replace(/[\\%_]/g, "\\$&")}%`,
    ]);
    return result.rowCount ?? 0;
  } finally {
    await client.end();
  }
}
