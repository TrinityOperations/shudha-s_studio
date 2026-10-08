import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
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

/**
 * Deletes bookings whose customer email starts with `emailPrefix` (e2e bookings only), then any
 * photos the wizard stored for them under booking-uploads/<id>/ (needs the service-role key).
 */
export async function cleanupE2EBookings(emailPrefix: string): Promise<number> {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return 0;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let ids: string[] = [];
  try {
    const result = await client.query<{ id: string }>(
      `delete from bookings where customer_email like $1 returning id`,
      [`${emailPrefix.replace(/[\\%_]/g, "\\$&")}%`],
    );
    ids = result.rows.map((row) => row.id);
  } finally {
    await client.end();
  }
  await removeBookingUploads(ids);
  return ids.length;
}

async function removeBookingUploads(bookingIds: string[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || bookingIds.length === 0) return;
  const storage = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from("booking-uploads");
  for (const id of bookingIds) {
    const { data } = await storage.list(id);
    const paths = (data ?? []).map((object) => `${id}/${object.name}`);
    if (paths.length) await storage.remove(paths);
  }
}

/** Current manage token of the booking with this customer email (e2e bookings only). */
export async function getManageTokenByEmail(email: string): Promise<string | null> {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return null;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query<{ manage_token: string }>(
      `select manage_token from bookings where customer_email = $1 order by created_at desc limit 1`,
      [email],
    );
    return result.rows[0]?.manage_token ?? null;
  } finally {
    await client.end();
  }
}
