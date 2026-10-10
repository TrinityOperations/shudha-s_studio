import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/db", () => ({ db: { query: { siteSettings: { findFirst } } } }));

import { defaultHomeContent } from "@/lib/validators/settings";
import {
  getAboutSettings,
  getAnnouncementSettings,
  getHomeSettings,
  getSeasonalBannerSettings,
  getSocialSettings,
} from "./settings";

beforeEach(() => findFirst.mockReset());

describe("home page settings readers", () => {
  it("return defaults when the row is missing or malformed", async () => {
    findFirst.mockResolvedValue(undefined);
    expect(await getHomeSettings()).toEqual(defaultHomeContent);
    expect(await getAnnouncementSettings()).toEqual({ enabled: true, messages: [] });
    expect(await getSeasonalBannerSettings()).toMatchObject({ enabled: false });
    expect(await getAboutSettings()).toEqual({ story: "", storyBn: "" });
    expect(await getSocialSettings()).toEqual({ instagram: "", facebook: "" });

    findFirst.mockResolvedValue({ key: "home", value: "garbage" });
    expect(await getHomeSettings()).toEqual(defaultHomeContent);
    findFirst.mockResolvedValue({
      key: "home",
      value: { published: { portrait: { path: "x", focus: { x: 9, y: 0 } } } },
    });
    expect(await getHomeSettings()).toEqual(defaultHomeContent);
  });

  it("return the published copy, never the draft", async () => {
    findFirst.mockResolvedValue({
      key: "home",
      value: {
        draft: { heroVideoPath: "home/draft.mp4" },
        published: { heroVideoPath: "home/live.mp4", newPicks: [] },
      },
    });
    const home = await getHomeSettings();
    expect(home.heroVideoPath).toBe("home/live.mp4");
    expect(home.portrait).toBeNull();
  });

  it("read the other content keys with their defaults filled in", async () => {
    findFirst.mockResolvedValue({ key: "seasonal_banner", value: { enabled: true } });
    expect(await getSeasonalBannerSettings()).toMatchObject({
      enabled: true,
      buttonLabel: "Book a consultation",
    });
    findFirst.mockResolvedValue({ key: "about", value: { story: "Hand made." } });
    expect(await getAboutSettings()).toEqual({ story: "Hand made.", storyBn: "" });
  });
});
