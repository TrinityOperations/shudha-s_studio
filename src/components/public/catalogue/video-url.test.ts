import { describe, expect, it } from "vitest";
import { videoPlatform, youtubeEmbedUrl, youtubePosterUrl, youtubeVideoId } from "./video-url";

describe("youtubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=10s", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/shorts/abc123XYZ_-", "abc123XYZ_-"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("extracts the id from %s", (url, id) => {
    expect(youtubeVideoId(url)).toBe(id);
  });

  it.each([
    "https://www.youtube.com/",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=<script>",
    "https://www.facebook.com/watch?v=123",
    "not a url",
  ])("returns null for %s", (url) => {
    expect(youtubeVideoId(url)).toBeNull();
  });
});

describe("platform, embed and poster", () => {
  it("maps hosts to platforms", () => {
    expect(videoPlatform("https://youtu.be/x1234567")).toBe("youtube");
    expect(videoPlatform("https://fb.watch/abc/")).toBe("facebook");
    expect(videoPlatform("https://www.instagram.com/reel/abc/")).toBe("instagram");
    expect(videoPlatform("https://vimeo.com/1")).toBeNull();
  });

  it("builds a youtube-nocookie embed and a thumbnail URL", () => {
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
    );
    expect(youtubePosterUrl("dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });
});
