import { SLUG_PATTERN } from "@/lib/validators/products";
import { WISHLIST_MAX } from "./storage";

export const SHARE_PARAM = "items";

/** PW-62: the list travels in the URL as comma-separated slugs; nothing is stored on the server. */
export function buildShareLink(siteUrl: string, slugs: readonly string[]): string {
  const items = parseShareItems(slugs.join(","));
  const base = `${siteUrl.replace(/\/$/, "")}/wishlist`;
  return items.length ? `${base}?${SHARE_PARAM}=${items.join(",")}` : base;
}

/** Pure: valid, unique slugs from the `items` parameter, capped; junk is dropped silently. */
export function parseShareItems(param: string | string[] | undefined | null): string[] {
  const raw = Array.isArray(param) ? param.join(",") : (param ?? "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const slug = part.trim();
    if (!SLUG_PATTERN.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= WISHLIST_MAX) break;
  }
  return out;
}
