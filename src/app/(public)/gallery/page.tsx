import type { Metadata } from "next";
import { GalleryGrid } from "@/components/public/gallery/gallery-grid";
import { GalleryPagination } from "@/components/public/gallery/gallery-pagination";
import { SubmitDialog } from "@/components/public/gallery/submit-dialog";
import { PageShell } from "@/components/public/pages/page-shell";
import { countApprovedGallery, listApprovedGallery } from "@/db/queries/gallery";
import { getLocale, getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { GALLERY_PAGE_SIZE } from "@/lib/validators/gallery";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return pageMetadata("/gallery", locale, {
    title: t("gallery.title"),
    description: t("gallery.description"),
  });
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** PW-70: approved customer photos, newest first, 24 per page; nothing unapproved ever appears. */
export default async function GalleryPage({ searchParams }: PageProps<"/gallery">) {
  const params = await searchParams;
  const t = await getT();
  const total = await countApprovedGallery();
  const pageCount = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));
  const requested = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), pageCount);
  const tiles = await listApprovedGallery(GALLERY_PAGE_SIZE, (page - 1) * GALLERY_PAGE_SIZE);

  return (
    <PageShell title={t("gallery.title")} intro={t("gallery.intro")} wide>
      <div>
        <SubmitDialog />
      </div>
      {tiles.length === 0 ? (
        <p className="text-muted-foreground" data-testid="gallery-empty">
          {t("gallery.empty")}
        </p>
      ) : (
        <GalleryGrid tiles={tiles} />
      )}
      <GalleryPagination page={page} pageCount={pageCount} />
    </PageShell>
  );
}
