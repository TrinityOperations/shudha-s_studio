import Image from "next/image";
import Link from "next/link";
import type { GalleryTile } from "@/db/queries/gallery";
import { GALLERY_IMAGES_BUCKET } from "@/lib/home";
import { getT } from "@/lib/i18n";
import { publicStorageUrl } from "@/lib/storage";
import { Carousel } from "./carousel";
import { HangingTag } from "./tag";

type Props = { tiles: GalleryTile[]; editing?: boolean };

/**
 * Home section 10: approved customer photos (#12); hidden until there are any. In the editor the
 * heading carries a "Managed in Gallery" link instead of slot buttons, so the section's size is
 * the same as on the public page.
 */
export async function HappyCustomers({ tiles, editing = false }: Props) {
  const t = await getT();
  if (tiles.length === 0) return null;
  const title = t("home.customers.title");
  return (
    <section
      aria-labelledby="customers-heading"
      className="mx-auto w-full max-w-7xl px-4 py-14 lg:px-6 lg:py-20"
    >
      <Carousel
        label={title}
        title={title}
        headingId="customers-heading"
        showControls
        action={
          <>
            {editing ? (
              <a
                href="/admin/gallery"
                className="bg-paper text-ink rounded-full px-3 py-1.5 text-sm font-medium shadow"
                data-testid="slot-managed"
              >
                {t("admin.editor.managedInGallery")}
              </a>
            ) : null}
            <Link
              href="/gallery"
              prefetch={false}
              className="text-ink text-[15px] font-medium underline underline-offset-[5px]"
            >
              {t("home.customers.link")}
            </Link>
          </>
        }
      >
        {tiles.map((tile) => (
          <li key={tile.id} className="group relative w-[180px] shrink-0 snap-start lg:w-[220px]">
            <div className="bg-mist relative aspect-[3/4] overflow-hidden">
              <Image
                src={publicStorageUrl(GALLERY_IMAGES_BUCKET, tile.imagePath)}
                alt=""
                fill
                sizes="220px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              {tile.firstName ? <HangingTag>{tile.firstName}</HangingTag> : null}
            </div>
          </li>
        ))}
      </Carousel>
    </section>
  );
}
