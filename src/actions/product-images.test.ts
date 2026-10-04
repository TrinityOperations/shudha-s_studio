import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      requireOwner: vi.fn(),
      processProductImage: vi.fn(),
      uploadStorageObject: vi.fn(),
      removeStorageObjects: vi.fn(),
      revalidatePath: vi.fn(),
    },
  };
});

vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/images", () => ({ processProductImage: mocks.processProductImage }));
vi.mock("@/lib/storage.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage.server")>()),
  uploadStorageObject: mocks.uploadStorageObject,
  removeStorageObjects: mocks.removeStorageObjects,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { StorageError } from "@/lib/storage.server";
import {
  deleteProductImage,
  reorderProductImages,
  updateProductImageAlt,
  uploadProductImages,
} from "./product-images";

const PRODUCT = "11111111-1111-4111-8111-111111111111";
const IMG1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const IMG2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makeForm(
  files: { name: string; type: string; size?: number }[],
  alts: string[],
  altsBn: string[] = [],
) {
  const fd = new FormData();
  fd.set("productId", PRODUCT);
  files.forEach((f) =>
    fd.append("files", new File([new Uint8Array(f.size ?? 16)], f.name, { type: f.type })),
  );
  alts.forEach((a) => fd.append("alt", a));
  altsBn.forEach((a) => fd.append("altBn", a));
  return fd;
}

beforeEach(() => {
  dbMock.reset();
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
  mocks.processProductImage.mockResolvedValue({
    full: Buffer.from("full"),
    thumb: Buffer.from("thumb"),
    width: 1600,
    height: 1200,
  });
  mocks.uploadStorageObject.mockResolvedValue(undefined);
  mocks.removeStorageObjects.mockResolvedValue(undefined);
});

describe("uploadProductImages", () => {
  it("requires English alt text for every file before touching auth", async () => {
    const result = await uploadProductImages(
      makeForm([{ name: "a.jpg", type: "image/jpeg" }], [""]),
    );
    expect(result).toMatchObject({ ok: false, error: "errors.altRequired" });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("rejects disallowed types and oversized files", async () => {
    expect(
      await uploadProductImages(makeForm([{ name: "a.gif", type: "image/gif" }], ["A gif"])),
    ).toMatchObject({ ok: false, error: "errors.imageType" });
    expect(
      await uploadProductImages(
        makeForm([{ name: "big.png", type: "image/png", size: 10 * 1024 * 1024 + 1 }], ["Big"]),
      ),
    ).toMatchObject({ ok: false, error: "errors.imageTooLarge" });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("rejects a mismatch between files and alt fields", async () => {
    expect(
      await uploadProductImages(
        makeForm(
          [
            { name: "a.jpg", type: "image/jpeg" },
            { name: "b.jpg", type: "image/jpeg" },
          ],
          ["only one"],
        ),
      ),
    ).toMatchObject({ ok: false, error: "errors.altRequired" });
  });

  it("returns notFound for an unknown product", async () => {
    dbMock.query.products.findFirst.mockResolvedValue(undefined);
    expect(
      await uploadProductImages(makeForm([{ name: "a.jpg", type: "image/jpeg" }], ["A"])),
    ).toMatchObject({ ok: false, error: "errors.notFound" });
  });

  it("processes, uploads full + thumb and inserts rows after the current max sortOrder", async () => {
    dbMock.query.products.findFirst.mockResolvedValue({ id: PRODUCT });
    dbMock.queueResults([{ maxSort: 1 }]);
    const result = await uploadProductImages(
      makeForm(
        [
          { name: "a.jpg", type: "image/jpeg" },
          { name: "b.png", type: "image/png" },
        ],
        ["Front", "Back"],
        ["সামনে", ""],
      ),
    );
    expect(result).toEqual({ ok: true, data: { uploaded: 2 } });
    expect(mocks.processProductImage).toHaveBeenCalledTimes(2);
    expect(mocks.uploadStorageObject).toHaveBeenCalledTimes(4);
    const [path, body, type] = mocks.uploadStorageObject.mock.calls[0].slice(1);
    expect(path).toMatch(new RegExp(`^${PRODUCT}/[0-9a-f-]{36}\\.webp$`));
    expect(body).toEqual(Buffer.from("full"));
    expect(type).toBe("image/webp");
    expect(mocks.uploadStorageObject.mock.calls[1][1]).toMatch(/-thumb\.webp$/);

    const rows = dbMock.methodCalls("values").map((v) => v[0] as Record<string, unknown>);
    expect(rows[0]).toMatchObject({
      productId: PRODUCT,
      alt: "Front",
      altBn: "সামনে",
      width: 1600,
      height: 1200,
      sortOrder: 2,
    });
    expect(rows[1]).toMatchObject({ alt: "Back", altBn: null, sortOrder: 3 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("cleans up the partial upload and reports storageFailed when storage rejects", async () => {
    dbMock.query.products.findFirst.mockResolvedValue({ id: PRODUCT });
    dbMock.queueResults([{ maxSort: null }]);
    mocks.uploadStorageObject
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new StorageError("full disk"));
    const result = await uploadProductImages(
      makeForm([{ name: "a.jpg", type: "image/jpeg" }], ["A"]),
    );
    expect(result).toMatchObject({ ok: false, error: "errors.storageFailed" });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("product-images", [
      expect.stringMatching(/\.webp$/),
    ]);
    expect(dbMock.methodCalls("values")).toHaveLength(0);
  });
});

describe("updateProductImageAlt", () => {
  it("validates, updates and returns the alt text", async () => {
    dbMock.queueResults([{ id: IMG1 }]);
    expect(await updateProductImageAlt(IMG1, { alt: " Front ", altBn: "" })).toEqual({
      ok: true,
      data: { alt: "Front", altBn: "" },
    });
    expect(dbMock.methodCalls("set")[0]?.[0]).toEqual({ alt: "Front", altBn: null });
  });

  it("rejects empty alt text with a field error", async () => {
    const result = await updateProductImageAlt(IMG1, { alt: "", altBn: "" });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.alt).toEqual(["errors.altRequired"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });
});

describe("deleteProductImage", () => {
  it("removes both objects then the row", async () => {
    dbMock.query.productImages.findFirst.mockResolvedValue({
      id: IMG1,
      path: "p/a.webp",
      thumbPath: "p/a-thumb.webp",
    });
    expect(await deleteProductImage(IMG1)).toEqual({ ok: true, data: undefined });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("product-images", [
      "p/a.webp",
      "p/a-thumb.webp",
    ]);
    expect(dbMock.methodCalls("delete")).toHaveLength(1);
  });

  it("keeps the row when storage removal fails", async () => {
    dbMock.query.productImages.findFirst.mockResolvedValue({ id: IMG1, path: "a", thumbPath: "b" });
    mocks.removeStorageObjects.mockRejectedValue(new StorageError("x"));
    expect(await deleteProductImage(IMG1)).toMatchObject({
      ok: false,
      error: "errors.storageFailed",
    });
    expect(dbMock.methodCalls("delete")).toHaveLength(0);
  });
});

describe("reorderProductImages", () => {
  it("rejects an id list that does not match the product's images", async () => {
    dbMock.queueResults([{ id: IMG1 }, { id: IMG2 }]);
    expect(await reorderProductImages({ productId: PRODUCT, ids: [IMG1] })).toMatchObject({
      ok: false,
      error: "errors.invalidInput",
    });
    expect(dbMock.db.transaction).not.toHaveBeenCalled();
  });

  it("writes the new sortOrder for every image", async () => {
    dbMock.queueResults([{ id: IMG1 }, { id: IMG2 }]);
    expect(await reorderProductImages({ productId: PRODUCT, ids: [IMG2, IMG1] })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(dbMock.methodCalls("set")).toEqual([[{ sortOrder: 0 }], [{ sortOrder: 1 }]]);
  });
});
