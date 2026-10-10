import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  storeSiteImage: vi.fn(),
  createHeroVideoUploadTarget: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/site-images.server", () => ({
  storeSiteImage: mocks.storeSiteImage,
  createHeroVideoUploadTarget: mocks.createHeroVideoUploadTarget,
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createHeroVideoUpload, uploadSiteImage } from "./site-images";

function form(file: File | null, over: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ purpose: "home", focusX: "0.2", focusY: "0.7", ...over }))
    fd.set(k, v);
  if (file) fd.set("file", file);
  return fd;
}

beforeEach(() => {
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
  mocks.storeSiteImage.mockResolvedValue({
    path: "home/x.webp",
    thumbPath: "home/x-thumb.webp",
    focus: { x: 0.2, y: 0.7 },
    bucket: "site-images",
  });
  mocks.createHeroVideoUploadTarget.mockResolvedValue({
    path: "hero/v.mp4",
    token: "t",
    signedUrl: "https://x",
  });
});

describe("uploadSiteImage", () => {
  it("rejects a bad purpose, a wrong type and an oversized file before auth", async () => {
    const png = new File([new Uint8Array(8)], "a.png", { type: "image/png" });
    expect((await uploadSiteImage(form(png, { purpose: "nope" }))).ok).toBe(false);
    const gif = new File([new Uint8Array(8)], "a.gif", { type: "image/gif" });
    expect(await uploadSiteImage(form(gif))).toMatchObject({
      ok: false,
      error: "errors.imageType",
    });
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "a.png", { type: "image/png" });
    expect(await uploadSiteImage(form(big))).toMatchObject({
      ok: false,
      error: "errors.imageTooLarge",
    });
    expect(await uploadSiteImage(form(null))).toMatchObject({
      ok: false,
      error: "errors.imageCount",
    });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("stores the photo with the crop focus under the right prefix", async () => {
    const png = new File([new Uint8Array(8)], "a.png", { type: "image/png" });
    const result = await uploadSiteImage(form(png));
    expect(result).toMatchObject({
      ok: true,
      data: { path: "home/x.webp", focus: { x: 0.2, y: 0.7 } },
    });
    expect(mocks.storeSiteImage).toHaveBeenCalledWith(expect.anything(), "home", {
      x: 0.2,
      y: 0.7,
    });
    await uploadSiteImage(form(png, { purpose: "testimonial" }));
    expect(mocks.storeSiteImage).toHaveBeenLastCalledWith(
      expect.anything(),
      "testimonials",
      expect.anything(),
    );
  });

  it("hands out a signed upload target for the hero video", async () => {
    expect(await createHeroVideoUpload()).toEqual({
      ok: true,
      data: { path: "hero/v.mp4", token: "t", signedUrl: "https://x" },
    });
    expect(mocks.requireOwner).toHaveBeenCalled();
  });
});
