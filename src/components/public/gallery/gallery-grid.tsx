import Image from "next/image";
import type { GalleryTile } from "@/db/queries/gallery";
import { GALLERY_IMAGES_BUCKET } from "@/lib/home";
import { getT } from "@/lib/i18n";
import { publicStorageUrl } from "@/lib/storage";
import { HangingTag } from "@/components/public/home/tag";

/** PW-70: approved photos as 3:4 tiles, the first name as a hanging tag, the note as a caption. */
export async function GalleryGrid({ tiles }: { tiles: GalleryTile[] }) {
  const t = await getT();
  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5"
      data-testid="gallery-grid"
    >
      {tiles.map((tile) => (
        <li key={tile.id} className="group space-y-2" data-testid="gallery-tile">
          <a
            href={publicStorageUrl(GALLERY_IMAGES_BUCKET, tile.imagePath)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-mist relative block aspect-[3/4] overflow-hidden"
            aria-label={t("gallery.tile", { name: tile.firstName ? `: ${tile.firstName}` : "" })}
          >
            <Image
              src={publicStorageUrl(GALLERY_IMAGES_BUCKET, tile.thumbPath)}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {tile.firstName ? <HangingTag>{tile.firstName}</HangingTag> : null}
          </a>
          {tile.note ? <p className="text-muted-foreground text-[13px]">{tile.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}
