import Image from "next/image";
import { focusPosition, SITE_IMAGES_BUCKET } from "@/lib/home";
import { publicStorageUrl } from "@/lib/storage";
import type { SiteImageSlot } from "@/lib/validators/settings";

type Props = {
  slot: SiteImageSlot | null | undefined;
  /** Alt text; "" for decorative photos */
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Visually hidden text for the mist block when the slot is empty */
  emptyLabel?: string;
};

/**
 * A `site-images` photo filling its box with the owner's crop focus; a mist block until she
 * uploads one ([placeholder]). Always square-cornered unless the parent rounds it.
 */
export function SiteImage({ slot, alt, sizes, priority, className = "", emptyLabel }: Props) {
  if (!slot) {
    return (
      <div
        data-placeholder="site-image"
        className={`bg-mist size-full ${className}`}
        role={emptyLabel ? "img" : undefined}
        aria-label={emptyLabel}
      />
    );
  }
  return (
    <Image
      src={publicStorageUrl(SITE_IMAGES_BUCKET, slot.path)}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      style={{ objectPosition: focusPosition(slot) }}
      className={`object-cover ${className}`}
    />
  );
}
