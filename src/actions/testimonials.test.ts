import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      requireOwner: vi.fn(),
      revalidatePath: vi.fn(),
      storeSiteImage: vi.fn(),
      removeStorageObjects: vi.fn(),
      findFirst: vi.fn(),
    },
  };
});
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/site-images.server", () => ({ storeSiteImage: mocks.storeSiteImage }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/storage.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage.server")>()),
  removeStorageObjects: mocks.removeStorageObjects,
}));

import {
  createTestimonial,
  deleteTestimonial,
  reorderTestimonials,
  setTestimonialPhoto,
  updateTestimonial,
} from "./testimonials";

const ID = "11111111-1111-4111-8111-111111111111";
const values = { authorName: "Asha", quote: "Lovely work.", quoteBn: "", visible: true };

beforeEach(() => {
  dbMock.reset();
  Object.assign(dbMock.db.query, { testimonials: { findFirst: mocks.findFirst } });
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
  mocks.removeStorageObjects.mockResolvedValue(undefined);
  mocks.storeSiteImage.mockResolvedValue({
    path: "testimonials/new.webp",
    thumbPath: "testimonials/new-thumb.webp",
    focus: { x: 0.5, y: 0.5 },
    bucket: "site-images",
  });
});

describe("testimonial actions", () => {
  it("creates, updates, hides and reorders", async () => {
    dbMock.queueResults([{ next: 0 }], [{ id: ID, ...values }]);
    expect((await createTestimonial(values)).ok).toBe(true);
    expect(dbMock.methodCalls("values")[0]?.[0]).toMatchObject({
      authorName: "Asha",
      sortOrder: 0,
    });

    dbMock.queueResults([{ id: ID, ...values, visible: false }]);
    expect((await updateTestimonial(ID, { ...values, visible: false })).ok).toBe(true);
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({ visible: false });

    dbMock.reset();
    expect((await reorderTestimonials({ ids: [ID] })).ok).toBe(true);
    expect(dbMock.methodCalls("set")[0]?.[0]).toEqual({ sortOrder: 0 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("rejects a blank name or quote", async () => {
    const result = await createTestimonial({ ...values, authorName: "", quote: "" });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.authorName).toEqual(["errors.required"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("stores a photo through the site-images pipeline and removes the old files", async () => {
    mocks.findFirst.mockResolvedValue({ id: ID, photoPath: "testimonials/old.webp" });
    const fd = new FormData();
    fd.set("id", ID);
    fd.set("file", new File([new Uint8Array(8)], "a.png", { type: "image/png" }));
    const result = await setTestimonialPhoto(fd);
    expect(result).toEqual({ ok: true, data: { photoPath: "testimonials/new.webp" } });
    expect(mocks.storeSiteImage).toHaveBeenCalledWith(expect.anything(), "testimonials", {
      x: 0.5,
      y: 0.5,
    });
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({ photoPath: "testimonials/new.webp" });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("site-images", [
      "testimonials/old.webp",
      "testimonials/old-thumb.webp",
    ]);
  });

  it("refuses a wrong type and an oversized photo before auth", async () => {
    const fd = new FormData();
    fd.set("id", ID);
    fd.set("file", new File([new Uint8Array(8)], "a.gif", { type: "image/gif" }));
    expect(await setTestimonialPhoto(fd)).toMatchObject({ ok: false, error: "errors.imageType" });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("deletes the row and its photo files", async () => {
    dbMock.queueResults([{ photoPath: "testimonials/old.webp" }]);
    expect((await deleteTestimonial(ID)).ok).toBe(true);
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("site-images", [
      "testimonials/old.webp",
      "testimonials/old-thumb.webp",
    ]);
  });
});
