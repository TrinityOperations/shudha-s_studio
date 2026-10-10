import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processProductImage } from "./images";

/** PW-71: a customer's phone photo must not carry its GPS position onto the site. */
describe("processProductImage strips EXIF", () => {
  it("drops GPS and camera metadata from a JPEG with a location", async () => {
    const withGps = await sharp({
      create: { width: 64, height: 48, channels: 3, background: "#c2402a" },
    })
      .jpeg()
      .withExif({
        IFD0: { Make: "Phone", Model: "Camera", Software: "e2e" },
        IFD3: {
          GPSLatitudeRef: "S",
          GPSLatitude: "37/1 48/1 49/1",
          GPSLongitudeRef: "E",
          GPSLongitude: "144/1 57/1 47/1",
        },
      })
      .toBuffer();
    const before = await sharp(withGps).metadata();
    expect(before.exif).toBeDefined();
    expect(before.exif!.toString("latin1")).toContain("Phone");

    const processed = await processProductImage(withGps);
    for (const output of [processed.full, processed.thumb]) {
      const meta = await sharp(output).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.exif).toBeUndefined();
      expect(output.toString("latin1")).not.toContain("GPS");
      expect(output.toString("latin1")).not.toContain("Phone");
    }
  });
});
