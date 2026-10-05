import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/db", () => ({ db: { insert: mocks.insert } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { updateGeneralSettings } from "./settings";

describe("updateGeneralSettings", () => {
  beforeEach(() => {
    mocks.requireOwner.mockResolvedValue({ id: "owner", email: "owner@example.com" });
    mocks.onConflictDoUpdate.mockResolvedValue(undefined);
    mocks.values.mockReturnValue({ onConflictDoUpdate: mocks.onConflictDoUpdate });
    mocks.insert.mockReturnValue({ values: mocks.values });
  });

  it("returns field errors for invalid input and never touches auth or the database", async () => {
    const result = await updateGeneralSettings({ studioName: "  ", tagline: "", taglineBn: "" });
    expect(result).toMatchObject({ ok: false, error: "errors.invalidInput" });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.studioName).toEqual(["errors.required"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("requires the owner before writing", async () => {
    mocks.requireOwner.mockRejectedValue(new Error("NEXT_REDIRECT:/admin/login"));
    await expect(
      updateGeneralSettings({ studioName: "Studio", tagline: "", taglineBn: "" }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("trims, upserts the general row and revalidates the whole site", async () => {
    const result = await updateGeneralSettings({
      studioName: "  Shudha's Studio ",
      tagline: " Be a reason ",
      taglineBn: "",
    });
    expect(result).toEqual({
      ok: true,
      data: { studioName: "Shudha's Studio", tagline: "Be a reason", taglineBn: "" },
    });
    expect(mocks.values).toHaveBeenCalledWith({
      key: "general",
      value: { studioName: "Shudha's Studio", tagline: "Be a reason", taglineBn: "" },
    });
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
