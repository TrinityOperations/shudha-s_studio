import type { Metadata } from "next";
import { ReviewList, type ReviewCard } from "@/components/admin/gallery/review-list";
import { ReviewTabs } from "@/components/admin/gallery/review-tabs";
import { listGalleryByStatus, type GalleryStatus } from "@/db/queries/gallery";
import { GALLERY_PENDING_BUCKET, GALLERY_PUBLIC_BUCKET } from "@/lib/gallery/storage";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { publicStorageUrl } from "@/lib/storage";
import { createSignedStorageUrl } from "@/lib/storage.server";
import { formatMelbourne } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.gallery.title") };
}

const SIGNED_URL_SECONDS = 600;
const TABS: GalleryStatus[] = ["pending", "approved", "hidden"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** OD-32: the review queue. Private photos are shown through signed URLs made for this request. */
export default async function GalleryAdminPage({ searchParams }: PageProps<"/admin/gallery">) {
  await requireOwner();
  const params = await searchParams;
  const requested = first(params.tab);
  const tab: GalleryStatus = TABS.includes(requested as GalleryStatus)
    ? (requested as GalleryStatus)
    : "pending";
  const [t, pendingRows, approvedRows, hiddenRows] = await Promise.all([
    getT(),
    listGalleryByStatus("pending"),
    listGalleryByStatus("approved"),
    listGalleryByStatus("hidden"),
  ]);
  const rows = { pending: pendingRows, approved: approvedRows, hidden: hiddenRows }[tab];

  const cards: ReviewCard[] = await Promise.all(
    rows.map(async (row) => {
      const isPublic = row.status === "approved" && row.publicThumbPath && row.publicImagePath;
      const [thumbUrl, fullUrl] = isPublic
        ? [
            publicStorageUrl(GALLERY_PUBLIC_BUCKET, row.publicThumbPath!),
            publicStorageUrl(GALLERY_PUBLIC_BUCKET, row.publicImagePath!),
          ]
        : await Promise.all([
            createSignedStorageUrl(GALLERY_PENDING_BUCKET, row.thumbPath, SIGNED_URL_SECONDS),
            createSignedStorageUrl(GALLERY_PENDING_BUCKET, row.imagePath, SIGNED_URL_SECONDS),
          ]);
      return {
        id: row.id,
        status: row.status,
        firstName: row.firstName,
        note: row.note,
        received: formatMelbourne(row.createdAt, "d MMM yyyy, h:mm aaa"),
        thumbUrl,
        fullUrl,
      };
    }),
  );

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.gallery.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.gallery.description")}</p>
      </header>
      <ReviewTabs
        counts={{
          pending: pendingRows.length,
          approved: approvedRows.length,
          hidden: hiddenRows.length,
        }}
      />
      {cards.length === 0 ? (
        <p className="text-muted-foreground text-sm" data-testid="review-empty">
          {t(`admin.gallery.empty.${tab}`)}
        </p>
      ) : (
        <ReviewList cards={cards} />
      )}
    </section>
  );
}
