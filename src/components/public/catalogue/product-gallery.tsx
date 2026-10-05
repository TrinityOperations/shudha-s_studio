"use client";

import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, ExpandIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale, useT } from "@/lib/i18n/client";
import { productImageUrl } from "@/lib/storage";

type GalleryImage = {
  id: string;
  path: string;
  thumbPath: string;
  alt: string;
  altBn: string | null;
  width: number;
  height: number;
};

export function ProductGallery({
  images,
  productTitle,
}: {
  images: GalleryImage[];
  productTitle: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const current = images[index];

  function alt(image: GalleryImage) {
    return locale === "bn" && image.altBn ? image.altBn : image.alt;
  }

  function move(delta: number) {
    setIndex((value) => (value + delta + images.length) % images.length);
  }

  if (!current) {
    return (
      <div className="bg-muted text-muted-foreground flex aspect-square items-center justify-center rounded-xl border text-sm">
        {t("catalogue.imageUnavailable")}
      </div>
    );
  }

  const mainImage = (
    <Image
      src={productImageUrl(current.path)}
      alt={alt(current)}
      fill
      priority
      sizes="(max-width: 1024px) 100vw, 50vw"
      className="object-contain"
    />
  );

  return (
    <div
      className="space-y-3"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" && images.length > 1) {
          event.preventDefault();
          move(-1);
        }
        if (event.key === "ArrowRight" && images.length > 1) {
          event.preventDefault();
          move(1);
        }
      }}
    >
      <div
        className="group bg-muted relative aspect-square touch-pan-y overflow-hidden rounded-xl border"
        onPointerDown={(event) => {
          pointerStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (pointerStart.current === null || images.length < 2) return;
          const distance = event.clientX - pointerStart.current;
          pointerStart.current = null;
          if (Math.abs(distance) >= 45) move(distance > 0 ? -1 : 1);
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
      >
        <button
          type="button"
          className="focus-visible:ring-ring/50 absolute inset-0 z-10 cursor-zoom-in outline-none focus-visible:ring-3 focus-visible:ring-inset"
          aria-label={t("catalogue.zoomImage", { title: productTitle })}
          onClick={() => setZoomOpen(true)}
        >
          <span className="bg-background/90 absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium shadow-sm">
            <ExpandIcon aria-hidden="true" className="size-3.5" />
            {t("catalogue.zoom")}
          </span>
        </button>
        {mainImage}
        {images.length > 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-1/2 left-3 z-20 -translate-y-1/2 rounded-full"
              aria-label={t("catalogue.previousImage")}
              onClick={() => move(-1)}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-1/2 right-3 z-20 -translate-y-1/2 rounded-full"
              aria-label={t("catalogue.nextImage")}
              onClick={() => move(1)}
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {t("catalogue.imagePosition", { current: index + 1, total: images.length })}
      </p>

      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2" aria-label={t("catalogue.thumbnailLabel")}>
          {images.map((image, imageIndex) => (
            <button
              key={image.id}
              type="button"
              aria-label={t("catalogue.showImage", { number: imageIndex + 1 })}
              aria-current={imageIndex === index ? "true" : undefined}
              onClick={() => setIndex(imageIndex)}
              className="bg-muted aria-current:ring-primary focus-visible:ring-ring/50 relative aspect-square overflow-hidden rounded-lg border outline-none focus-visible:ring-3 aria-current:ring-2"
            >
              <Image
                src={productImageUrl(image.thumbPath)}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          showCloseButton={false}
          className="h-[min(90vh,900px)] max-w-[min(96vw,1100px)] p-2"
        >
          <DialogTitle className="sr-only">
            {t("catalogue.zoomedImage", { title: productTitle })}
          </DialogTitle>
          <DialogDescription className="sr-only">{alt(current)}</DialogDescription>
          <div className="relative h-full min-h-0">{mainImage}</div>
          <DialogClose
            render={
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-3 right-3 rounded-full"
              />
            }
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">{t("catalogue.closeZoom")}</span>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
