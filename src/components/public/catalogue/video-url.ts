import { videoHost, type VideoHost } from "@/lib/validators/products";

export type VideoPlatform = "youtube" | "facebook" | "instagram";

const PLATFORM_BY_HOST: Record<VideoHost, VideoPlatform> = {
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "facebook.com": "facebook",
  "fb.watch": "facebook",
  "instagram.com": "instagram",
};

export function videoPlatform(url: string): VideoPlatform | null {
  const host = videoHost(url);
  return host ? PLATFORM_BY_HOST[host] : null;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

/** Video id from watch, shorts, embed, live and youtu.be links; null for anything else. */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = videoHost(url);
  let id: string | null = null;
  if (host === "youtu.be") {
    id = parsed.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com") {
    const [, first, second] = parsed.pathname.split("/");
    if (first === "watch") id = parsed.searchParams.get("v");
    else if (first === "shorts" || first === "embed" || first === "live" || first === "v")
      id = second ?? null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** Privacy-enhanced embed, loaded only after the visitor clicks play (PW-27). */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
}

/** hqdefault exists for every video; maxresdefault 404s for older or low-res uploads. */
export function youtubePosterUrl(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}
