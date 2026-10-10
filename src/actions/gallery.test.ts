import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: {
      requireOwner: vi.fn(),
      verifyTurnstile: vi.fn(),
      headers: vi.fn(),
      after: vi.fn(),
      revalidatePath: vi.fn(),
      onGallerySubmitted: vi.fn(),
      getGallerySubmission: vi.fn(),
      storePendingPhoto: vi.fn(),
      publishPhoto: vi.fn(),
      ensurePrivateCopy: vi.fn(),
      removePublicFiles: vi.fn(),
      removeAllFiles: vi.fn(),
      removeStorageObjects: vi.fn(),
    },
  };
});
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: mocks.verifyTurnstile }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/gallery/hooks", () => ({ onGallerySubmitted: mocks.onGallerySubmitted }));
vi.mock("@/db/queries/gallery", () => ({ getGallerySubmission: mocks.getGallerySubmission }));
vi.mock("@/lib/gallery/storage", () => ({
  GALLERY_PENDING_BUCKET: "gallery-pending",
  storePendingPhoto: mocks.storePendingPhoto,
  publishPhoto: mocks.publishPhoto,
  ensurePrivateCopy: mocks.ensurePrivateCopy,
  removePublicFiles: mocks.removePublicFiles,
  removeAllFiles: mocks.removeAllFiles,
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/storage.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage.server")>()),
  removeStorageObjects: mocks.removeStorageObjects,
}));

import { resetRateLimit } from "@/lib/booking/rate-limit";
import {
  approveGallerySubmission,
  deleteGallerySubmission,
  hideGallerySubmission,
  submitGalleryPhoto,
} from "./gallery";

const ID = "11111111-1111-4111-8111-111111111111";
const UUID_RE = /^[0-9a-f-]{36}$/;
const png = () => new File([new Uint8Array(16)], "gift.png", { type: "image/png" });

function form(over: Record<string, string> = {}, photo: File | null = png()) {
  const fd = new FormData();
  const base = {
    firstName: "  Asha ",
    note: "Lovely\nnameplate",
    consent: "true",
    turnstileToken: "tok",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  if (photo) fd.set("photo", photo);
  return fd;
}

const row = (status: "pending" | "approved" | "hidden", over: Record<string, unknown> = {}) => ({
  id: ID,
  imagePath: `${ID}/full.webp`,
  thumbPath: `${ID}/thumb.webp`,
  publicImagePath: status === "approved" ? `${ID}/abc/full.webp` : null,
  publicThumbPath: status === "approved" ? `${ID}/abc/thumb.webp` : null,
  firstName: "Asha",
  note: null,
  consentGiven: true,
  status,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

let ip = 0;
beforeEach(() => {
  dbMock.reset();
  resetRateLimit();
  mocks.headers.mockResolvedValue(
    new Headers({ "x-nf-client-connection-ip": `198.51.100.${++ip}` }),
  );
  mocks.verifyTurnstile.mockResolvedValue(true);
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
  mocks.storePendingPhoto.mockImplementation(async (id: string) => ({
    full: `${id}/full.webp`,
    thumb: `${id}/thumb.webp`,
  }));
  mocks.publishPhoto.mockResolvedValue({
    full: `${ID}/new/full.webp`,
    thumb: `${ID}/new/thumb.webp`,
  });
  mocks.ensurePrivateCopy.mockImplementation(
    async (r: { imagePath: string; thumbPath: string }) => ({
      full: r.imagePath,
      thumb: r.thumbPath,
    }),
  );
  mocks.removePublicFiles.mockResolvedValue(undefined);
  mocks.removeAllFiles.mockResolvedValue(undefined);
  mocks.removeStorageObjects.mockResolvedValue(undefined);
  mocks.after.mockImplementation((fn: () => unknown) => fn());
});

describe("submitGalleryPhoto", () => {
  it("stores a pending row with two private files, trimmed text, and tells the owner", async () => {
    dbMock.queueResults([row("pending")]);
    expect(await submitGalleryPhoto(form())).toEqual({ ok: true, data: undefined });
    expect(mocks.storePendingPhoto).toHaveBeenCalledWith(
      expect.stringMatching(UUID_RE),
      expect.any(Buffer),
    );
    const inserted = dbMock.methodCalls("values")[0]?.[0] as Record<string, unknown>;
    expect(inserted).toMatchObject({
      imagePath: expect.stringMatching(/\/full\.webp$/),
      thumbPath: expect.stringMatching(/\/thumb\.webp$/),
      firstName: "Asha",
      note: "Lovely nameplate",
      consentGiven: true,
      status: "pending",
    });
    expect(inserted).not.toHaveProperty("publicImagePath");
    expect(mocks.onGallerySubmitted).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/gallery");
  });

  it("checks Turnstile first, then consent, then the photo", async () => {
    mocks.verifyTurnstile.mockResolvedValueOnce(false);
    expect(await submitGalleryPhoto(form())).toMatchObject({
      ok: false,
      error: "errors.turnstile",
    });
    const noConsent = await submitGalleryPhoto(form({ consent: "false" }));
    if (noConsent.ok) throw new Error("expected failure");
    expect(noConsent.fieldErrors?.consent).toEqual(["errors.consentRequired"]);
    expect(await submitGalleryPhoto(form({}, null))).toMatchObject({
      ok: false,
      error: "errors.photoRequired",
    });
    const gif = new File([new Uint8Array(8)], "x.gif", { type: "image/gif" });
    expect(await submitGalleryPhoto(form({}, gif))).toMatchObject({
      ok: false,
      error: "errors.imageType",
    });
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "x.png", { type: "image/png" });
    expect(await submitGalleryPhoto(form({}, big))).toMatchObject({
      ok: false,
      error: "errors.imageTooLarge",
    });
    expect(mocks.storePendingPhoto).not.toHaveBeenCalled();
    expect(dbMock.methodCalls("insert")).toHaveLength(0);
  });

  it("removes the files when the insert fails and never calls the hook", async () => {
    (dbMock.db as unknown as Record<string, Mock>).insert.mockImplementationOnce(() => {
      throw new Error("db down");
    });
    expect(await submitGalleryPhoto(form())).toMatchObject({ ok: false, error: "errors.unknown" });
    expect(mocks.removeStorageObjects).toHaveBeenCalledWith("gallery-pending", [
      expect.stringMatching(/\/full\.webp$/),
      expect.stringMatching(/\/thumb\.webp$/),
    ]);
    expect(mocks.onGallerySubmitted).not.toHaveBeenCalled();
  });

  it("rate-limits the sixth attempt from one address", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.9" }));
    for (let i = 0; i < 5; i++) {
      dbMock.queueResults([row("pending")]);
      expect((await submitGalleryPhoto(form())).ok).toBe(true);
    }
    expect(await submitGalleryPhoto(form())).toMatchObject({
      ok: false,
      error: "errors.rateLimited",
    });
  });
});

describe("approve / hide / delete", () => {
  it("approves a pending photo: copies into a fresh public folder and records the paths", async () => {
    mocks.getGallerySubmission.mockResolvedValue(row("pending"));
    dbMock.queueResults([{ id: ID }]);
    expect(await approveGallerySubmission(ID)).toEqual({ ok: true, data: undefined });
    expect(mocks.publishPhoto).toHaveBeenCalledWith(expect.objectContaining({ id: ID }));
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({
      publicImagePath: `${ID}/new/full.webp`,
      publicThumbPath: `${ID}/new/thumb.webp`,
      status: "approved",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/gallery");
  });

  it("refuses to approve an approved photo and removes the copy if the row changed underneath", async () => {
    mocks.getGallerySubmission.mockResolvedValue(row("approved"));
    expect(await approveGallerySubmission(ID)).toMatchObject({
      ok: false,
      error: "errors.invalidStatus",
    });
    expect(mocks.publishPhoto).not.toHaveBeenCalled();
    mocks.getGallerySubmission.mockResolvedValue(row("hidden"));
    dbMock.queueResults([]); // conditional update matched nothing
    expect(await approveGallerySubmission(ID)).toMatchObject({
      ok: false,
      error: "errors.invalidStatus",
    });
    expect(mocks.removePublicFiles).toHaveBeenCalledWith({
      publicImagePath: `${ID}/new/full.webp`,
      publicThumbPath: `${ID}/new/thumb.webp`,
    });
  });

  it("hides an approved photo: private copy first, then the public files go", async () => {
    const approved = row("approved");
    mocks.getGallerySubmission.mockResolvedValue(approved);
    dbMock.queueResults([{ id: ID }]);
    expect(await hideGallerySubmission(ID)).toEqual({ ok: true, data: undefined });
    expect(mocks.ensurePrivateCopy).toHaveBeenCalledWith(approved);
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({
      publicImagePath: null,
      publicThumbPath: null,
      status: "hidden",
    });
    expect(mocks.removePublicFiles).toHaveBeenCalledWith(approved);
  });

  it("hides a demo row (no pending copy) using the paths the private copy was written to", async () => {
    const demo = row("approved", {
      imagePath: "demo/gallery-1.webp",
      thumbPath: "demo/gallery-1-thumb.webp",
      publicImagePath: "demo/gallery-1.webp",
      publicThumbPath: "demo/gallery-1-thumb.webp",
    });
    mocks.getGallerySubmission.mockResolvedValue(demo);
    mocks.ensurePrivateCopy.mockResolvedValueOnce({
      full: `${ID}/full.webp`,
      thumb: `${ID}/thumb.webp`,
    });
    dbMock.queueResults([{ id: ID }]);
    expect((await hideGallerySubmission(ID)).ok).toBe(true);
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({
      imagePath: `${ID}/full.webp`,
      thumbPath: `${ID}/thumb.webp`,
      status: "hidden",
    });
    expect(mocks.removePublicFiles).toHaveBeenCalledWith(demo);
  });

  it("hides a pending photo as a plain reject: no files touched", async () => {
    mocks.getGallerySubmission.mockResolvedValue(row("pending"));
    dbMock.queueResults([{ id: ID }]);
    expect((await hideGallerySubmission(ID)).ok).toBe(true);
    expect(mocks.ensurePrivateCopy).not.toHaveBeenCalled();
    expect(mocks.removePublicFiles).not.toHaveBeenCalled();
    mocks.getGallerySubmission.mockResolvedValue(row("hidden"));
    expect(await hideGallerySubmission(ID)).toMatchObject({
      ok: false,
      error: "errors.invalidStatus",
    });
  });

  it("deletes from any status, files in both buckets included", async () => {
    const hidden = row("hidden");
    dbMock.queueResults([hidden]);
    expect(await deleteGallerySubmission(ID)).toEqual({ ok: true, data: undefined });
    expect(mocks.removeAllFiles).toHaveBeenCalledWith(hidden);
    dbMock.queueResults([]);
    expect(await deleteGallerySubmission(ID)).toMatchObject({
      ok: false,
      error: "errors.notFound",
    });
    expect((await deleteGallerySubmission("nope")).ok).toBe(false);
  });

  it("requires the owner before any review action", async () => {
    mocks.requireOwner.mockRejectedValue(new Error("NEXT_REDIRECT:/admin/login"));
    await expect(approveGallerySubmission(ID)).rejects.toThrow("NEXT_REDIRECT");
    await expect(hideGallerySubmission(ID)).rejects.toThrow("NEXT_REDIRECT");
    await expect(deleteGallerySubmission(ID)).rejects.toThrow("NEXT_REDIRECT");
    expect(dbMock.methodCalls("update")).toHaveLength(0);
  });
});
