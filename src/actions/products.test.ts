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
      removeStorageObjects: vi.fn(),
      copyStorageObject: vi.fn(),
      revalidatePath: vi.fn(),
      redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
      }),
    },
  };
});

vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/slug", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/slug")>()),
  ensureUniqueSlug: mocks.ensureUniqueSlug,
}));
vi.mock("@/lib/storage.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage.server")>()),
  removeStorageObjects: mocks.removeStorageObjects,
  copyStorageObject: mocks.copyStorageObject,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { StorageError } from "@/lib/storage.server";
import { emptyProductInput, type ProductInput } from "@/lib/validators/products";
import {
  archiveProduct,
  bulkUpdateProducts,
  createProduct,
  deleteProduct,
  duplicateProduct,
  unarchiveProduct,
  updateProduct,
} from "./products";

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const OCC = "33333333-3333-4333-8333-333333333333";
const TAG = "44444444-4444-4444-8444-444444444444";

const validInput: ProductInput = {
  ...emptyProductInput,
  title: "Personalised Mug",
  occasionIds: [OCC],
  tagIds: [TAG],
  personalisationOptions: ["name", "photo"],
  personalisationNotes: "Up to 20 characters",
};

function setArg(index = 0) {
  return dbMock.methodCalls("set")[index]?.[0] as Record<string, unknown>;
}

beforeEach(() => {
  dbMock.reset();
  mocks.requireOwner.mockResolvedValue({ id: "owner", email: "owner@example.com" });
  mocks.removeStorageObjects.mockResolvedValue(undefined);
  mocks.copyStorageObject.mockResolvedValue(undefined);
});

describe("createProduct", () => {
  it("rejects invalid input before auth or the database", async () => {
    const result = await createProduct({ ...validInput, title: "", slug: "Bad Slug!" });
    expect(result).toMatchObject({ ok: false, error: "errors.invalidInput" });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.title).toEqual(["errors.required"]);
    expect(result.fieldErrors?.slug).toEqual(["errors.slugFormat"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
    expect(dbMock.db.transaction).not.toHaveBeenCalled();
  });

  it("saves a draft with a generated slug, joins, and redirects to the edit page", async () => {
    dbMock.queueResults([{ id: P1 }]);
    await expect(createProduct({ ...validInput, status: "published" })).rejects.toThrow(
      `NEXT_REDIRECT:/admin/products/${P1}`,
    );
    expect(mocks.requireOwner).toHaveBeenCalledOnce();
    expect(mocks.ensureUniqueSlug.mock.calls[0]?.[1]).toBe("personalised-mug");
    const inserted = dbMock.methodCalls("values");
    expect(inserted[0]?.[0]).toMatchObject({
      title: "Personalised Mug",
      slug: "personalised-mug",
      status: "draft",
      publishedAt: null,
      personalisation: { options: ["name", "photo"], notes: "Up to 20 characters" },
    });
    expect(inserted).toContainEqual([[{ productId: P1, occasionId: OCC }]]);
    expect(inserted).toContainEqual([[{ productId: P1, tagId: TAG }]]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("uses a custom slug when given", async () => {
    dbMock.queueResults([{ id: P1 }]);
    await expect(createProduct({ ...validInput, slug: "my-mug" })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.ensureUniqueSlug.mock.calls[0]?.[1]).toBe("my-mug");
  });
});

describe("updateProduct", () => {
  it("refuses to edit an archived product", async () => {
    dbMock.query.products.findFirst.mockResolvedValue({
      id: P1,
      status: "archived",
      publishedAt: null,
    });
    expect(await updateProduct(P1, validInput)).toEqual({
      ok: false,
      error: "errors.productArchived",
      fieldErrors: undefined,
    });
    expect(dbMock.db.transaction).not.toHaveBeenCalled();
  });

  it("returns notFound for an unknown id", async () => {
    dbMock.query.products.findFirst.mockResolvedValue(undefined);
    expect(await updateProduct(P1, validInput)).toMatchObject({
      ok: false,
      error: "errors.notFound",
    });
  });

  it("sets publishedAt the first time a product is published", async () => {
    dbMock.query.products.findFirst.mockResolvedValue({
      id: P1,
      status: "draft",
      publishedAt: null,
    });
    const result = await updateProduct(P1, { ...validInput, status: "published" });
    expect(result).toEqual({ ok: true, data: { id: P1, slug: "personalised-mug" } });
    expect(mocks.ensureUniqueSlug.mock.calls[0]?.[2]).toBe(P1);
    expect(setArg()).toMatchObject({ status: "published" });
    expect(setArg().publishedAt).toBeInstanceOf(Date);
  });

  it("keeps the original publishedAt when unpublishing and republishing", async () => {
    const first = new Date("2026-01-01T00:00:00Z");
    dbMock.query.products.findFirst.mockResolvedValue({
      id: P1,
      status: "published",
      publishedAt: first,
    });
    await updateProduct(P1, { ...validInput, status: "draft" });
    expect(setArg()).toMatchObject({ status: "draft", publishedAt: first });
  });
});

describe("archive / unarchive", () => {
  it("archives and reports notFound when nothing changed", async () => {
    dbMock.queueResults([{ id: P1 }]);
    expect(await archiveProduct(P1)).toEqual({ ok: true, data: undefined });
    expect(setArg()).toEqual({ status: "archived" });
    dbMock.queueResults([]);
    expect(await archiveProduct(P1)).toMatchObject({ ok: false, error: "errors.notFound" });
  });

  it("unarchive returns the product to draft", async () => {
    dbMock.queueResults([{ id: P1 }]);
    expect(await unarchiveProduct(P1)).toEqual({ ok: true, data: undefined });
    expect(setArg()).toEqual({ status: "draft" });
  });

  it("rejects a malformed id", async () => {
    expect(await archiveProduct("nope")).toMatchObject({ ok: false, error: "errors.invalidInput" });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });
});

describe("deleteProduct", () => {
  it("removes both storage objects per image, then the row", async () => {
    dbMock.queueResults(
      [
        { path: `${P1}/a.webp`, thumbPath: `${P1}/a-thumb.webp` },
        { path: `${P1}/b.webp`, thumbPath: `${P1}/b-thumb.webp` },
      ],
      [{ id: P1 }],
    );
    expect(await deleteProduct(P1)).toEqual({ ok: true, data: undefined });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("product-images", [
      `${P1}/a.webp`,
      `${P1}/a-thumb.webp`,
      `${P1}/b.webp`,
      `${P1}/b-thumb.webp`,
    ]);
    expect(dbMock.methodCalls("delete")).toHaveLength(1);
  });

  it("does not delete rows when storage removal fails", async () => {
    dbMock.queueResults([{ path: "x", thumbPath: "y" }]);
    mocks.removeStorageObjects.mockRejectedValue(new StorageError("boom"));
    expect(await deleteProduct(P1)).toMatchObject({ ok: false, error: "errors.storageFailed" });
    expect(dbMock.methodCalls("delete")).toHaveLength(0);
  });
});

describe("duplicateProduct", () => {
  it("creates a draft copy with its own slug, joins and copied image files", async () => {
    dbMock.query.products.findFirst.mockResolvedValue({
      id: P1,
      title: "Mug",
      titleBn: "মগ",
      description: "d",
      descriptionBn: null,
      materialNotes: null,
      materialNotesBn: null,
      personalisation: { options: ["name"], notes: "" },
      turnaroundDays: 5,
      categoryId: null,
      featured: true,
      status: "published",
      images: [
        {
          path: `${P1}/a.webp`,
          thumbPath: `${P1}/a-thumb.webp`,
          alt: "A",
          altBn: null,
          width: 10,
          height: 10,
          sortOrder: 0,
        },
      ],
      productOccasions: [{ occasionId: OCC }],
      productTags: [],
    });
    dbMock.queueResults([{ id: P2 }]);

    await expect(duplicateProduct(P1)).rejects.toThrow(`NEXT_REDIRECT:/admin/products/${P2}`);
    expect(mocks.ensureUniqueSlug.mock.calls[0]?.[1]).toBe("mug-copy");
    const values = dbMock.methodCalls("values");
    expect(values[0]?.[0]).toMatchObject({
      title: "Mug (copy)",
      status: "draft",
      publishedAt: null,
      featured: true,
    });
    expect(values).toContainEqual([[{ productId: P2, occasionId: OCC }]]);
    const imageRow = values
      .map((v) => v[0])
      .find((v) => (v as { thumbPath?: string }).thumbPath) as {
      path: string;
      thumbPath: string;
      productId: string;
    };
    expect(imageRow.productId).toBe(P2);
    expect(imageRow.path).toMatch(new RegExp(`^${P2}/[0-9a-f-]{36}\\.webp$`));
    expect(mocks.copyStorageObject).toHaveBeenCalledWith(
      "product-images",
      `${P1}/a.webp`,
      imageRow.path,
    );
    expect(mocks.copyStorageObject).toHaveBeenCalledWith(
      "product-images",
      `${P1}/a-thumb.webp`,
      imageRow.thumbPath,
    );
  });

  it("cleans up copied files and fails when a storage copy fails", async () => {
    dbMock.query.products.findFirst.mockResolvedValue({
      id: P1,
      title: "Mug",
      titleBn: null,
      description: "",
      descriptionBn: null,
      materialNotes: null,
      materialNotesBn: null,
      personalisation: { options: [], notes: "" },
      turnaroundDays: null,
      categoryId: null,
      featured: false,
      status: "draft",
      images: [
        { path: "a", thumbPath: "a-t", alt: "A", altBn: null, width: 1, height: 1, sortOrder: 0 },
      ],
      productOccasions: [],
      productTags: [],
    });
    dbMock.queueResults([{ id: P2 }]);
    mocks.copyStorageObject
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new StorageError("x"));
    expect(await duplicateProduct(P1)).toMatchObject({ ok: false, error: "errors.storageFailed" });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("product-images", [
      expect.stringMatching(/\.webp$/),
    ]);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("bulkUpdateProducts", () => {
  it("publishes only drafts and reports the count", async () => {
    dbMock.queueResults([{ id: P1 }, { id: P2 }]);
    expect(await bulkUpdateProducts({ ids: [P1, P2], action: "publish" })).toEqual({
      ok: true,
      data: { count: 2 },
    });
    expect(setArg()).toMatchObject({ status: "published" });
    expect(setArg().publishedAt).toBeDefined();
  });

  it("unpublishes to draft and archives", async () => {
    dbMock.queueResults([{ id: P1 }]);
    await bulkUpdateProducts({ ids: [P1], action: "unpublish" });
    expect(setArg(0)).toEqual({ status: "draft" });
    dbMock.queueResults([{ id: P1 }]);
    await bulkUpdateProducts({ ids: [P1], action: "archive" });
    expect(setArg(1)).toEqual({ status: "archived" });
  });

  it("delete removes every selected product's files before the rows", async () => {
    dbMock.queueResults(
      [
        { path: `${P1}/a.webp`, thumbPath: `${P1}/a-thumb.webp` },
        { path: `${P2}/b.webp`, thumbPath: `${P2}/b-thumb.webp` },
      ],
      [{ id: P1 }, { id: P2 }],
    );
    expect(await bulkUpdateProducts({ ids: [P1, P2], action: "delete" })).toEqual({
      ok: true,
      data: { count: 2 },
    });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("product-images", [
      `${P1}/a.webp`,
      `${P1}/a-thumb.webp`,
      `${P2}/b.webp`,
      `${P2}/b-thumb.webp`,
    ]);
    expect(dbMock.methodCalls("delete")).toHaveLength(1);
  });

  it("delete leaves rows alone when storage removal fails", async () => {
    dbMock.queueResults([{ path: "a", thumbPath: "b" }]);
    mocks.removeStorageObjects.mockRejectedValue(new StorageError("x"));
    expect(await bulkUpdateProducts({ ids: [P1], action: "delete" })).toMatchObject({
      ok: false,
      error: "errors.storageFailed",
    });
    expect(dbMock.methodCalls("delete")).toHaveLength(0);
  });

  it("rejects an empty selection or unknown action", async () => {
    expect(await bulkUpdateProducts({ ids: [], action: "publish" })).toMatchObject({ ok: false });
    expect(await bulkUpdateProducts({ ids: [P1], action: "explode" as "publish" })).toMatchObject({
      ok: false,
      error: "errors.invalidInput",
    });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });
});
