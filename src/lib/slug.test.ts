import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { categories } from "@/db/schema";
import { ensureUniqueSlug, slugify, type SlugExecutor } from "./slug";

describe("slugify", () => {
  it("lowercases, strips accents and punctuation, collapses to single hyphens", () => {
    expect(slugify("Personalised Mug!")).toBe("personalised-mug");
    expect(slugify("  Eid   Gift -- Pack  ")).toBe("eid-gift-pack");
    expect(slugify("Café Crème")).toBe("cafe-creme");
    expect(slugify("Mum's Day 2026")).toBe("mum-s-day-2026");
  });

  it("returns an empty string for non-Latin input so callers can fall back", () => {
    expect(slugify("জন্মদিনের মগ")).toBe("");
    expect(slugify("---")).toBe("");
  });

  it("caps the length at 80 characters without a trailing hyphen", () => {
    const long = slugify("a ".repeat(100));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith("-")).toBe(false);
  });
});

function executorWith(rows: { id: string; slug: string }[]): SlugExecutor {
  const where = vi.fn(async () => rows);
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { select } as unknown as SlugExecutor;
}

describe("ensureUniqueSlug", () => {
  it("returns the base when nothing is taken", async () => {
    await expect(ensureUniqueSlug(categories, "mugs", undefined, executorWith([]))).resolves.toBe(
      "mugs",
    );
  });

  it("appends -2, -3, … skipping taken suffixes", async () => {
    const rows = [
      { id: "a", slug: "mugs" },
      { id: "b", slug: "mugs-2" },
      { id: "c", slug: "mugs-4" },
    ];
    await expect(ensureUniqueSlug(categories, "mugs", undefined, executorWith(rows))).resolves.toBe(
      "mugs-3",
    );
  });

  it("ignores the row being edited", async () => {
    const rows = [{ id: "me", slug: "mugs" }];
    await expect(ensureUniqueSlug(categories, "mugs", "me", executorWith(rows))).resolves.toBe(
      "mugs",
    );
  });

  it("falls back to 'item' for an empty base", async () => {
    await expect(ensureUniqueSlug(categories, "", undefined, executorWith([]))).resolves.toBe(
      "item",
    );
  });
});
