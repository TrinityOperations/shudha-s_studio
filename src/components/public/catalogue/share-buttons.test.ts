import { describe, expect, it } from "vitest";
import { whatsappShareLink } from "@/lib/whatsapp";
import { facebookShareLink } from "./share-buttons";

describe("share links", () => {
  const url = "https://shudhas.studio/products/eid-mug?x=1";

  it("builds the Facebook sharer URL", () => {
    expect(facebookShareLink(url)).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fshudhas.studio%2Fproducts%2Feid-mug%3Fx%3D1",
    );
  });

  it("builds the WhatsApp share text with title and URL", () => {
    expect(whatsappShareLink(`Eid mug ${url}`)).toBe(
      "https://wa.me/?text=Eid%20mug%20https%3A%2F%2Fshudhas.studio%2Fproducts%2Feid-mug%3Fx%3D1",
    );
  });
});
