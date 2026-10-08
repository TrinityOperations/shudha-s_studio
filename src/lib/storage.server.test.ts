import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createSignedUrl: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ storage: { from: mocks.from } }),
}));

import { createSignedStorageUrl } from "./storage.server";

beforeEach(() => {
  mocks.from.mockReturnValue({ createSignedUrl: mocks.createSignedUrl });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("createSignedStorageUrl", () => {
  it("asks Storage for a signed URL on the right bucket, path and expiry", async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://x/signed" },
      error: null,
    });
    expect(await createSignedStorageUrl("booking-uploads", "b1/a.webp", 600)).toBe(
      "https://x/signed",
    );
    expect(mocks.from).toHaveBeenCalledWith("booking-uploads");
    expect(mocks.createSignedUrl).toHaveBeenCalledWith("b1/a.webp", 600);
  });

  it("returns null and logs when Storage fails", async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: null, error: { message: "Object not found" } });
    expect(await createSignedStorageUrl("booking-uploads", "missing.webp", 600)).toBeNull();
    expect(console.error).toHaveBeenCalledOnce();
  });
});
