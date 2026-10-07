"use client";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/client";

export type GalleryImage = {
  src: string;
  thumbSrc: string;
  alt: string;
  width: number;
  height: number;
};

const SWIPE_THRESHOLD_PX = 40;

/**
 * PW-20: main image with thumbnails, arrow buttons, keyboard arrows, pointer swipe, and a
 * full-screen dialog ("zoom") on click. No carousel library; transitions are plain CSS, which
 * globals.css disables under prefers-reduced-motion.
 */
export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const swipe = useRef<{ startX: number; moved: boolean } | null>(null);
  const count = images.length;
  const current = images[index] ?? images[0];

  function go(delta: number) {
    setIndex((i) => (i + delta + count) % count);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (count < 2) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setIndex(count - 1);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse") return;
    swipe.current = { startX: event.clientX, moved: false };
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const state = swipe.current;
    swipe.current = null;
    if (!state || count < 2) return;
    const delta = event.clientX - state.startX;
    if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
      state.moved = true;
      swipe.current = { startX: state.startX, moved: true };
      go(delta < 0 ? 1 : -1);
    }
  }

  function onMainClick() {
    // A swipe ends with a click on the same element; don't open the dialog for it.
    if (swipe.current?.moved) {
      swipe.current = null;
      return;
    }
    setOpen(true);
  }

  if (!current) return null;
  const counter = t("catalogue.gallery.counter", { current: index + 1, total: count });

  const arrows = (variant: "main" | "dialog") =>
    count > 1 ? (
      <>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`absolute top-1/2 left-2 -translate-y-1/2 ${variant === "main" ? "bg-background/90" : ""}`}
          aria-label={t("catalogue.gallery.previous")}
          onClick={() => go(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`absolute top-1/2 right-2 -translate-y-1/2 ${variant === "main" ? "bg-background/90" : ""}`}
          aria-label={t("catalogue.gallery.next")}
          onClick={() => go(1)}
        >
          <ChevronRightIcon />
        </Button>
      </>
    ) : null;

  return (
    <figure className="space-y-3" aria-label={t("catalogue.gallery.label")}>
      <div
        role="group"
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label={counter}
        onKeyDown={onKeyDown}
        className="bg-muted focus-visible:ring-ring/50 relative aspect-square overflow-hidden rounded-xl outline-none focus-visible:ring-3"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <button
          type="button"
          onClick={onMainClick}
          aria-label={t("catalogue.gallery.open")}
          className="relative block size-full cursor-zoom-in"
        >
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority={index === 0}
            draggable={false}
            className="object-contain transition-opacity duration-200"
          />
        </button>
        {arrows("main")}
        <p aria-live="polite" className="sr-only">
          {counter}
        </p>
      </div>

      {count > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <li key={image.src} className="shrink-0">
              <button
                type="button"
                aria-label={t("catalogue.gallery.thumbnail", { index: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
                className={`focus-visible:ring-ring/50 block overflow-hidden rounded-md ring-offset-2 outline-none focus-visible:ring-3 ${
                  i === index ? "ring-primary ring-2" : "opacity-80 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.thumbSrc}
                  alt=""
                  width={80}
                  height={80}
                  className="size-16 object-cover sm:size-20"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[96vw] p-2 sm:max-w-5xl">
          <DialogTitle className="sr-only">{current.alt}</DialogTitle>
          <div
            role="group"
            tabIndex={0}
            aria-label={counter}
            onKeyDown={onKeyDown}
            className="relative h-[80vh] w-full outline-none"
          >
            <Image
              key={`zoom-${current.src}`}
              src={current.src}
              alt={current.alt}
              fill
              sizes="96vw"
              className="object-contain"
            />
            {arrows("dialog")}
          </div>
          <p className="text-muted-foreground text-center text-sm">{counter}</p>
        </DialogContent>
      </Dialog>
    </figure>
  );
}
