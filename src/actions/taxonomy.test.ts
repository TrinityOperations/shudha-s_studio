import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      requireOwner: vi.fn(),
      ensureUniqueSlug: vi.fn<
        (table: unknown, base: string, excludeId?: string) => Promise<string>
      >(async (_table, base) => base),
      revalidatePath: vi.fn(),
    },
  };
});

vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/slug", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/slug")>()),
  ensureUniqueSlug: mocks.ensureUniqueSlug,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createTaxonomyItem,
  deleteTaxonomyItem,
  reorderTaxonomy,
  updateTaxonomyItem,
} from "./taxonomy";

const C1 = "11111111-1111-4111-8111-111111111111";
const C2 = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  dbMock.reset();
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
});

describe("createTaxonomyItem", () => {
  it("rejects an empty name before auth", async () => {
    const result = await createTaxonomyItem("category", { name: "  ", nameBn: "" });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.name).toEqual(["errors.required"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("creates a category at the end of the order with a unique slug", async () => {
    dbMock.queueResults(
      [{ maxSort: 3 }],
      [{ id: C1, slug: "gift-packs", name: "Gift packs", nameBn: null }],
    );
    const result = await createTaxonomyItem("category", { name: "Gift packs", nameBn: "" });
    expect(result).toEqual({
      ok: true,
      data: { id: C1, slug: "gift-packs", name: "Gift packs", nameBn: null },
    });
    expect(mocks.ensureUniqueSlug.mock.calls[0]?.[1]).toBe("gift-packs");
    expect(dbMock.methodCalls("values")[0]?.[0]).toEqual({
      name: "Gift packs",
      nameBn: null,
      slug: "gift-packs",
      sortOrder: 4,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("creates a tag without a sort order and keeps the Bengali name", async () => {
    dbMock.queueResults([
      { id: C1, slug: "calligraphy", name: "Calligraphy", nameBn: "ক্যালিগ্রাফি" },
    ]);
    const result = await createTaxonomyItem("tag", { name: "Calligraphy", nameBn: "ক্যালিগ্রাফি" });
    expect(result.ok).toBe(true);
    expect(dbMock.methodCalls("values")[0]?.[0]).toEqual({
      name: "Calligraphy",
      nameBn: "ক্যালিগ্রাফি",
      slug: "calligraphy",
    });
  });

  it("falls back to the kind as slug base for non-Latin names", async () => {
    dbMock.queueResults(
      [{ maxSort: null }],
      [{ id: C1, slug: "occasion", name: "ঈদ", nameBn: null }],
    );
    await createTaxonomyItem("occasion", { name: "ঈদ", nameBn: "" });
    expect(mocks.ensureUniqueSlug.mock.calls[0]?.[1]).toBe("occasion");
    expect(dbMock.methodCalls("values")[0]?.[0]).toMatchObject({ sortOrder: 0 });
  });
});

describe("updateTaxonomyItem", () => {
  it("renames without changing the slug", async () => {
    dbMock.queueResults([{ id: C1, slug: "mugs", name: "Mugs & cups", nameBn: "মগ" }]);
    const result = await updateTaxonomyItem("category", C1, { name: "Mugs & cups", nameBn: "মগ" });
    expect(result).toEqual({
      ok: true,
      data: { id: C1, slug: "mugs", name: "Mugs & cups", nameBn: "মগ" },
    });
    expect(dbMock.methodCalls("set")[0]?.[0]).toEqual({ name: "Mugs & cups", nameBn: "মগ" });
  });

  it("returns notFound when no row matched", async () => {
    dbMock.queueResults([]);
    expect(await updateTaxonomyItem("tag", C1, { name: "x", nameBn: "" })).toMatchObject({
      ok: false,
      error: "errors.notFound",
    });
  });
});

describe("deleteTaxonomyItem", () => {
  it("deletes and reports notFound otherwise", async () => {
    dbMock.queueResults([{ id: C1 }]);
    expect(await deleteTaxonomyItem("occasion", C1)).toEqual({ ok: true, data: undefined });
    dbMock.queueResults([]);
    expect(await deleteTaxonomyItem("occasion", C1)).toMatchObject({
      ok: false,
      error: "errors.notFound",
    });
  });

  it("rejects an unknown kind", async () => {
    expect(await deleteTaxonomyItem("colour" as "tag", C1)).toMatchObject({
      ok: false,
      error: "errors.invalidInput",
    });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });
});

describe("reorderTaxonomy", () => {
  it("requires the full id set", async () => {
    dbMock.queueResults([{ id: C1 }, { id: C2 }]);
    expect(await reorderTaxonomy({ kind: "category", ids: [C2] })).toMatchObject({
      ok: false,
      error: "errors.invalidInput",
    });
  });

  it("writes sortOrder by position", async () => {
    dbMock.queueResults([{ id: C1 }, { id: C2 }]);
    expect(await reorderTaxonomy({ kind: "occasion", ids: [C2, C1] })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(dbMock.methodCalls("set")).toEqual([[{ sortOrder: 0 }], [{ sortOrder: 1 }]]);
  });
});
