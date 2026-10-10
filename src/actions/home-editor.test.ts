import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      requireOwner: vi.fn(),
      revalidatePath: vi.fn(),
      getHomeSettingsFull: vi.fn(),
      removeUnreferencedSiteImages: vi.fn(),
      statSiteObject: vi.fn(),
      removeStorageObjects: vi.fn(),
      uploadStorageObject: vi.fn(),
      processProductImage: vi.fn(),
      ensureUniqueSlug: vi.fn(),
    },
  };
});
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/db/queries/settings", () => ({ getHomeSettingsFull: mocks.getHomeSettingsFull }));
vi.mock("@/lib/site-images.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/site-images.server")>()),
  removeUnreferencedSiteImages: mocks.removeUnreferencedSiteImages,
  statSiteObject: mocks.statSiteObject,
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/images", () => ({ processProductImage: mocks.processProductImage }));
vi.mock("@/lib/storage.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage.server")>()),
  removeStorageObjects: mocks.removeStorageObjects,
  uploadStorageObject: mocks.uploadStorageObject,
}));
vi.mock("@/lib/slug", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/slug")>()),
  ensureUniqueSlug: mocks.ensureUniqueSlug,
}));

import { defaultHomeContent, emptyProductInput } from "./test-helpers";
import {
  createProductFromEditor,
  discardHomeDraft,
  publishHome,
  recordHeroVideo,
  setHomeSlot,
} from "./home-editor";

const A = "11111111-1111-4111-8111-111111111111";
const image = {
  path: "home/p.webp",
  thumbPath: "home/p-thumb.webp",
  focus: { x: 0.5, y: 0.5 },
  bucket: "site-images" as const,
};

beforeEach(() => {
  dbMock.reset();
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
  mocks.getHomeSettingsFull.mockResolvedValue({
    draft: defaultHomeContent,
    published: defaultHomeContent,
  });
  mocks.removeUnreferencedSiteImages.mockResolvedValue(0);
  mocks.removeStorageObjects.mockResolvedValue(undefined);
  mocks.uploadStorageObject.mockResolvedValue(undefined);
  mocks.processProductImage.mockResolvedValue({
    full: Buffer.from("f"),
    thumb: Buffer.from("t"),
    width: 10,
    height: 10,
  });
  mocks.ensureUniqueSlug.mockResolvedValue("eid-mug");
});

function writtenHome() {
  return dbMock.methodCalls("values")[0]?.[0] as {
    key: string;
    value: { draft: unknown; published: unknown };
  };
}

describe("home editor draft and publish", () => {
  it("writes a slot change into the draft only and reports dirty", async () => {
    const result = await setHomeSlot({ slot: "portrait", value: image, shownProductIds: [] });
    expect(result).toEqual({ ok: true, data: { dirty: true } });
    const home = writtenHome();
    expect(home.key).toBe("home");
    expect(home.value.draft).toMatchObject({ portrait: image });
    expect(home.value.published).toEqual(defaultHomeContent);
    expect(mocks.removeUnreferencedSiteImages).toHaveBeenCalledWith(
      ["home/", "hero/"],
      new Set(["home/p.webp", "home/p-thumb.webp"]),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/home-editor");
  });

  it("rejects an unknown slot before auth", async () => {
    expect((await setHomeSlot({ slot: "nope", value: null, shownProductIds: [] })).ok).toBe(false);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("publish copies the draft over published; discard does the reverse", async () => {
    const draft = { ...defaultHomeContent, portrait: image };
    mocks.getHomeSettingsFull.mockResolvedValue({ draft, published: defaultHomeContent });
    expect(await publishHome()).toEqual({ ok: true, data: { dirty: false } });
    expect(writtenHome().value).toEqual({ draft, published: draft });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");

    dbMock.reset();
    expect(await discardHomeDraft()).toEqual({ ok: true, data: { dirty: false } });
    expect(writtenHome().value).toEqual({
      draft: defaultHomeContent,
      published: defaultHomeContent,
    });
  });

  it("records the hero video only when the object is a small mp4", async () => {
    mocks.statSiteObject.mockResolvedValue({ size: 100, mimetype: "video/quicktime" });
    const bad = await recordHeroVideo({ path: `hero/${A}.mp4` });
    expect(bad).toMatchObject({ ok: false, error: "errors.videoInvalid" });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("site-images", [`hero/${A}.mp4`]);
    expect((await recordHeroVideo({ path: "home/x.mp4" })).ok).toBe(false);

    mocks.statSiteObject.mockResolvedValue({ size: 5_000_000, mimetype: "video/mp4" });
    expect(await recordHeroVideo({ path: `hero/${A}.mp4` })).toEqual({
      ok: true,
      data: { dirty: true },
    });
    expect(writtenHome().value.draft).toMatchObject({ heroVideoPath: `hero/${A}.mp4` });
  });
});

describe("createProductFromEditor", () => {
  function form(over: Record<string, string> = {}, file?: File) {
    const fd = new FormData();
    fd.set(
      "values",
      JSON.stringify({
        ...emptyProductInput,
        title: "Eid mug",
        ...JSON.parse(over.values ?? "{}"),
      }),
    );
    fd.set("publish", over.publish ?? "1");
    fd.set("signature", over.signature ?? "0");
    fd.set("file", file ?? new File([new Uint8Array(8)], "a.png", { type: "image/png" }));
    return fd;
  }

  it("creates a published product with the photo as its first image", async () => {
    dbMock.queueResults([{ id: A }]);
    const result = await createProductFromEditor(form());
    expect(result).toMatchObject({
      ok: true,
      data: { id: A, path: expect.stringMatching(/^.*\.webp$/) },
    });
    const inserted = dbMock.methodCalls("values").map((a) => a[0] as Record<string, unknown>);
    expect(inserted[0]).toMatchObject({ title: "Eid mug", slug: "eid-mug", status: "published" });
    expect(inserted[0].publishedAt).toBeInstanceOf(Date);
    expect(inserted[inserted.length - 1]).toMatchObject({
      productId: A,
      alt: "Eid mug",
      sortOrder: 0,
    });
    expect(mocks.uploadStorageObject).toHaveBeenCalledTimes(2);
    expect(mocks.uploadStorageObject.mock.calls[0]?.[0]).toBe("product-images");
  });

  it("saves a draft without publishing and adds the signature tag when asked", async () => {
    dbMock.queueResults([{ id: "tag-1" }], [{ id: A }]);
    const result = await createProductFromEditor(form({ publish: "0", signature: "1" }));
    expect(result.ok).toBe(true);
    const inserted = dbMock.methodCalls("values").map((a) => a[0] as Record<string, unknown>);
    expect(inserted[0]).toMatchObject({ slug: "signature", name: "Signature" });
    expect(inserted[1]).toMatchObject({ status: "draft", publishedAt: null });
    const joins = inserted.flatMap((v) => (Array.isArray(v) ? v : [])) as Record<string, unknown>[];
    expect(joins.some((v) => v.tagId === "tag-1" && v.productId === A)).toBe(true);
  });

  it("validates like the product form and refuses a missing photo", async () => {
    const bad = await createProductFromEditor(form({ values: JSON.stringify({ title: "" }) }));
    if (bad.ok) throw new Error("expected failure");
    expect(bad.fieldErrors?.title).toEqual(["errors.required"]);
    const fd = form();
    fd.delete("file");
    expect(await createProductFromEditor(fd)).toMatchObject({
      ok: false,
      error: "errors.imageCount",
    });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("removes uploaded files when the database write fails", async () => {
    dbMock.queueResults([{ id: A }]);
    mocks.uploadStorageObject
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"));
    const result = await createProductFromEditor(form());
    expect(result).toMatchObject({ ok: false, error: "errors.uploadFailed" });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("product-images", [
      expect.stringMatching(/\.webp$/),
    ]);
  });
});
