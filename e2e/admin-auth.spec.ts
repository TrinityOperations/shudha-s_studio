import { expect, test } from "@playwright/test";

test("public home page renders the studio name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("unauthenticated /admin redirects to the login page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
});

test("unauthenticated /admin/settings redirects and remembers the destination", async ({
  page,
}) => {
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fsettings$/);
});

// Needs the owner's credentials and Cloudflare's Turnstile test keys in the dev server env.
test("owner can sign in and reach the dashboard", async ({ page }) => {
  const email = process.env.E2E_OWNER_EMAIL;
  const password = process.env.E2E_OWNER_PASSWORD;
  test.skip(!email || !password, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");

  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
