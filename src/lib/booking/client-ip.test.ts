import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "./client-ip";

describe("clientIpFromHeaders", () => {
  it("prefers the Netlify header", () => {
    const h = new Headers({
      "x-nf-client-connection-ip": "203.0.113.9",
      "x-forwarded-for": "10.0.0.1, 198.51.100.2",
    });
    expect(clientIpFromHeaders(h)).toBe("203.0.113.9");
  });
  it("falls back to the last x-forwarded-for entry, then unknown", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "10.0.0.1, 198.51.100.2 " }))).toBe(
      "198.51.100.2",
    );
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});
