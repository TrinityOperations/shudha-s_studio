"use client";
import { motion, useReducedMotion } from "framer-motion";
import { PauseIcon, PlayIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import { focusPosition, SITE_IMAGES_BUCKET } from "@/lib/home";
import { useT } from "@/lib/i18n/client";
import { publicStorageUrl } from "@/lib/storage";
import type { SiteImageSlot } from "@/lib/validators/settings";
import { HERO_SENTINEL } from "@/components/public/layout/header-chrome";

type Props = {
  poster: SiteImageSlot | null;
  videoPath: string | null;
};

const noop = () => () => {};

function prefersLessData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

/**
 * PW-01: full-bleed looping video (poster first, the LCP image) with the frosted welcome card.
 * Reduced motion shows the poster only; so do Save-Data and pages without a video yet.
 */
export function Hero({ poster, videoPath }: Props) {
  const t = useT();
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  // Only the browser knows about Save-Data; the server (and hydration) render the poster alone.
  const allowed = useSyncExternalStore(
    noop,
    () => !prefersLessData(),
    () => false,
  );
  const showVideo = !!videoPath && !reduced && allowed;

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  }

  const sentinel = { [HERO_SENTINEL]: "" };

  return (
    <section
      {...sentinel}
      aria-labelledby="hero-heading"
      className="bg-mist relative h-[640px] w-full overflow-hidden lg:h-[720px]"
      data-testid="hero"
    >
      {poster ? (
        <Image
          src={publicStorageUrl(SITE_IMAGES_BUCKET, poster.path)}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectPosition: focusPosition(poster) }}
          className="object-cover"
        />
      ) : (
        <div data-placeholder="hero-poster" className="bg-mist absolute inset-0" />
      )}
      {showVideo && videoPath ? (
        <motion.video
          ref={videoRef}
          src={publicStorageUrl(SITE_IMAGES_BUCKET, videoPath)}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 size-full object-cover"
          data-testid="hero-video"
        />
      ) : null}
      {showVideo && videoPath ? (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={paused ? t("home.hero.play") : t("home.hero.pause")}
          aria-pressed={paused}
          className="border-line text-ink absolute top-4 right-4 z-10 grid size-11 place-items-center rounded-full border bg-white/90"
        >
          {paused ? <PlayIcon aria-hidden /> : <PauseIcon aria-hidden />}
        </button>
      ) : null}

      <div className="hero-rise frosted absolute inset-x-4 bottom-6 max-w-[640px] rounded-[14px] p-6 sm:left-8 sm:p-10 lg:bottom-12 lg:left-12 lg:rounded-2xl lg:px-14 lg:py-12">
        <p lang="bn" className="font-bangla text-mark text-[22px]">
          {t("home.hero.bangla")}
        </p>
        <h1
          id="hero-heading"
          className="font-heading text-ink mt-2 text-[clamp(38px,4.4vw,58px)] leading-[1.05] tracking-[-0.01em]"
        >
          {t("home.hero.title")}
        </h1>
        <p className="text-ink-soft mt-4 max-w-prose text-[17px] lg:text-lg">
          {t("home.hero.sub")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/book" prefetch={false} className={buttonVariants({ size: "lg" })}>
            {t("home.hero.book")}
          </Link>
          <Link
            href="/custom-order"
            prefetch={false}
            className="text-ink text-[15px] font-medium underline underline-offset-[5px]"
          >
            {t("home.hero.custom")}
          </Link>
        </div>
      </div>
    </section>
  );
}
