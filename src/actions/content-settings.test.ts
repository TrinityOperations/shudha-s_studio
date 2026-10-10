import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return { dbMock: createDbMock(), mocks: { requireOwner: vi.fn(), revalidatePath: vi.fn() } };
});
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  updateAnnouncementSettings,
  updateContentSettings,
  updateSeasonalBannerSettings,
} from "./settings";

const content = {
  story: " Hand made. ",
  storyBn: "",
  deliveryNote: "Pickup or post.",
  deliveryNoteBn: "",
  instagram: "https://instagram.com/shudhas.studio",
  facebook: "",
  whatsappNumber: "0412 345 678",
  email: "hello@example.com",
  privacy: "P",
  privacyBn: "",
  terms: "T",
  termsBn: "",
};

beforeEach(() => {
  dbMock.reset();
  mocks.requireOwner.mockResolvedValue({ id: "owner", email: "owner@example.com" });
});

describe("updateContentSettings", () => {
  it("validates the WhatsApp number and URLs before touching auth", async () => {
    const result = await updateContentSettings({
      ...content,
      whatsappNumber: "nope",
      instagram: "not a url",
    });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.whatsappNumber).toEqual(["errors.whatsappNumber"]);
    expect(result.fieldErrors?.instagram).toEqual(["errors.invalidInput"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("writes the five keys in one transaction with the normalised number", async () => {
    const result = await updateContentSettings(content);
    expect(result).toMatchObject({
      ok: true,
      data: { story: "Hand made.", whatsappNumber: "61412345678" },
    });
    expect(dbMock.db.transaction).toHaveBeenCalledTimes(1);
    const keys = dbMock.methodCalls("values").map((args) => (args[0] as { key: string }).key);
    expect(keys).toEqual(["about", "delivery", "social", "contact", "legal"]);
    const contact = dbMock.methodCalls("values")[3]?.[0] as { value: unknown };
    expect(contact.value).toEqual({ whatsappNumber: "61412345678", email: "hello@example.com" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("announcement and banner", () => {
  it("stores the announcement with its switch and fills message defaults", async () => {
    const result = await updateAnnouncementSettings({
      enabled: false,
      messages: [{ text: "Eid orders close Friday", href: "/book" }],
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        enabled: false,
        messages: [{ text: "Eid orders close Friday", linkLabel: "", href: "/book" }],
      },
    });
    expect(dbMock.methodCalls("values")[0]?.[0]).toMatchObject({ key: "announcement" });
  });

  it("rejects a sixth message and an over-long headline", async () => {
    const six = Array.from({ length: 6 }, () => ({ text: "x" }));
    expect((await updateAnnouncementSettings({ messages: six })).ok).toBe(false);
    expect((await updateSeasonalBannerSettings({ headline: "x".repeat(161) })).ok).toBe(false);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("stores the banner and revalidates the home page", async () => {
    const result = await updateSeasonalBannerSettings({ enabled: true, label: "Eid" });
    expect(result).toMatchObject({
      ok: true,
      data: { enabled: true, label: "Eid", href: "/book" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });
});
