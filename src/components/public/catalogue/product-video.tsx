"use client";
import { PlayIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { videoPlatform, youtubeEmbedUrl, youtubePosterUrl, youtubeVideoId } from "./video-url";

const PLATFORM_LABEL = {
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
} as const;

/**
 * PW-27. YouTube: poster + play button; the youtube-nocookie iframe loads only after the click.
 * Facebook and Instagram: outbound link (their embeds need Meta's SDK).
 */
export function ProductVideo({ url, title }: { url: string; title: string }) {
  const t = useT();
  const [playing, setPlaying] = useState(false);
  const platform = videoPlatform(url);
  if (!platform) return null;
  const youtubeId = platform === "youtube" ? youtubeVideoId(url) : null;

  if (!youtubeId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline" })}
      >
        {t("catalogue.product.videoOpen", { platform: PLATFORM_LABEL[platform] })}
      </a>
    );
  }

  if (playing) {
    return (
      <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={youtubeEmbedUrl(youtubeId)}
          title={`${t("catalogue.product.videoTitle")}: ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl">
      <Image
        src={youtubePosterUrl(youtubeId)}
        alt=""
        fill
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="object-cover"
      />
      <Button
        type="button"
        size="lg"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        onClick={() => setPlaying(true)}
      >
        <PlayIcon data-icon="inline-start" />
        {t("catalogue.product.videoPlay")}
      </Button>
    </div>
  );
}
