import { render } from "@react-email/components";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { OwnerGalleryEmail } from "./owner-new-gallery-photo";

describe("OwnerGalleryEmail", () => {
  it("names the sender, shows the note and links to the review page, in both languages", async () => {
    const en = await render(
      createElement(OwnerGalleryEmail, {
        locale: "en",
        studioName: "Shudha's Studio",
        firstName: "Asha",
        note: "Our wedding nameplate",
        reviewUrl: "https://shudhas.studio/admin/gallery",
      }),
    );
    expect(en).toContain("Asha sent a photo");
    expect(en).toContain("Our wedding nameplate");
    expect(en).toContain('href="https://shudhas.studio/admin/gallery"');
    expect(en).not.toMatch(/admin\.gallery\./);

    const bn = await render(
      createElement(OwnerGalleryEmail, {
        locale: "bn",
        studioName: "Shudha's Studio",
        firstName: null,
        note: null,
        reviewUrl: "https://x/admin/gallery",
      }),
    );
    expect(bn).toContain("একজন গ্রাহক");
    expect(bn).not.toMatch(/admin\.gallery\./);
  });
});
