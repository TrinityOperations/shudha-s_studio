import Image from "next/image";
import Link from "next/link";
import type { Occasion } from "@/db/schema";
import type { TilePhoto } from "@/lib/home";
import { getLocale, getT } from "@/lib/i18n";
import { productImageUrl } from "@/lib/storage";
import { Carousel } from "./carousel";
import { SiteImage } from "./site-image";
import { SlotFrame } from "./slot-frame";
import { HangingTag } from "./tag";

export type OccasionTile = { occasion: Occasion; photo: TilePhoto };

/** PW-03: shop-by-occasion tiles in the owner's order, each a hanging tag on a 3:4 photo. */
export async function Occasions({
  tiles,
  editing = false,
}: {
  tiles: OccasionTile[];
  editing?: boolean;
}) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  if (tiles.length === 0) return null;
  const title = t("home.occasions.title");
  return (
    <section
      id="occasions"
      aria-labelledby="occasions-heading"
      className="mx-auto w-full max-w-7xl px-4 py-14 lg:px-6 lg:py-20"
    >
      <Carousel label={title} title={title} headingId="occasions-heading" showControls>
        {tiles.map(({ occasion, photo }) => {
          const name = locale === "bn" && occasion.nameBn ? occasion.nameBn : occasion.name;
          const tile = (
            <div className="bg-mist relative aspect-[3/4] overflow-hidden">
              {photo.kind === "site" ? (
                <SiteImage
                  slot={photo.slot}
                  alt=""
                  sizes="(min-width: 1024px) 280px, 220px"
                  className="transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : photo.kind === "product" ? (
                <Image
                  src={productImageUrl(photo.path)}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 280px, 220px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <span data-placeholder="occasion-photo" className="bg-mist absolute inset-0" />
              )}
              <HangingTag>{name}</HangingTag>
            </div>
          );
          return (
            <li
              key={occasion.id}
              className="group relative w-[220px] shrink-0 snap-start lg:w-[250px] xl:w-[280px]"
            >
              {editing ? (
                <SlotFrame
                  slots={[
                    {
                      id: `occasion.${occasion.slug}`,
                      label: t("admin.editor.slots.occasion", { name: occasion.name }),
                      shape: "tall",
                      kind: "image",
                      acceptsProduct: true,
                      filled: photo.kind !== "empty",
                    },
                  ]}
                >
                  {tile}
                </SlotFrame>
              ) : (
                <Link href={`/products?occasion=${occasion.slug}`} className="block">
                  {tile}
                </Link>
              )}
            </li>
          );
        })}
      </Carousel>
    </section>
  );
}
