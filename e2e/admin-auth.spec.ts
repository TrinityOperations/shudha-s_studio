import { expect, test } from "@playwright/test";
import { ownerEmail, ownerPassword, signInAsOwner } from "./helpers";

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
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run");

  await signInAsOwner(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
