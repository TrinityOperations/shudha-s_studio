import { describe, expect, it, vi } from "vitest";
import { isOwnerEmail } from "./owner";

describe("isOwnerEmail", () => {
  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(isOwnerEmail("OWNER@example.com", "owner@Example.com")).toBe(true);
    expect(isOwnerEmail("  owner@example.com ", "owner@example.com")).toBe(true);
  });

  it("rejects other addresses, empty values and a missing OWNER_EMAIL", () => {
    expect(isOwnerEmail("someone@example.com", "owner@example.com")).toBe(false);
    expect(isOwnerEmail("", "owner@example.com")).toBe(false);
    expect(isOwnerEmail(null, "owner@example.com")).toBe(false);
  });

  it("rejects everyone when OWNER_EMAIL is not configured", () => {
    vi.stubEnv("OWNER_EMAIL", "");
    expect(isOwnerEmail("owner@example.com")).toBe(false);
    vi.unstubAllEnvs();
  });

  it("falls back to process.env.OWNER_EMAIL", () => {
    expect(isOwnerEmail("owner@example.com")).toBe(true);
  });
});
