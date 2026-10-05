import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  verifyTurnstile: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { signInWithPassword: mocks.signInWithPassword, signOut: mocks.signOut },
  })),
}));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: mocks.verifyTurnstile }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { signIn, signOut } from "./auth";

const valid = {
  email: "owner@example.com", // OWNER_EMAIL in vitest.setup.ts is "Owner@Example.com"
  password: "correct horse",
  turnstileToken: "token",
};

describe("signIn", () => {
  beforeEach(() => {
    mocks.verifyTurnstile.mockResolvedValue(true);
    mocks.signInWithPassword.mockResolvedValue({ error: null });
  });

  it("rejects invalid input with field errors before touching Turnstile or Supabase", async () => {
    const result = await signIn({ ...valid, email: "not-an-email", password: "" });
    expect(result).toMatchObject({ ok: false, error: "errors.invalidInput" });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.email).toEqual(["errors.email"]);
    expect(result.fieldErrors?.password).toEqual(["errors.required"]);
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects an absolute URL in next", async () => {
    const result = await signIn({ ...valid, next: "https://evil.example" });
    expect(result.ok).toBe(false);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("fails when Turnstile does not verify", async () => {
    mocks.verifyTurnstile.mockResolvedValue(false);
    const result = await signIn(valid);
    expect(result).toEqual({ ok: false, error: "errors.turnstile", fieldErrors: undefined });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("refuses a non-owner email without calling Supabase", async () => {
    const result = await signIn({ ...valid, email: "someone@example.com" });
    expect(result).toMatchObject({ ok: false, error: "errors.invalidCredentials" });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns invalidCredentials when Supabase rejects the password", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login" } });
    const result = await signIn(valid);
    expect(result).toMatchObject({ ok: false, error: "errors.invalidCredentials" });
  });

  it("signs the owner in (case-insensitive email) and redirects to /admin", async () => {
    await expect(signIn({ ...valid, email: "OWNER@EXAMPLE.COM" })).rejects.toThrow(
      "NEXT_REDIRECT:/admin",
    );
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "OWNER@EXAMPLE.COM",
      password: valid.password,
    });
  });

  it("honours a safe next path", async () => {
    await expect(signIn({ ...valid, next: "/admin/settings" })).rejects.toThrow(
      "NEXT_REDIRECT:/admin/settings",
    );
  });
});

describe("signOut", () => {
  it("signs out of Supabase and redirects to the login page", async () => {
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
