import "server-only";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { gallerySubmissions, type GallerySubmission } from "@/db/schema";

export type GalleryStatus = GallerySubmission["status"];

export type GalleryTile = {
  id: string;
  /** Paths inside the public `gallery-images` bucket */
  imagePath: string;
  thumbPath: string;
  firstName: string | null;
  note: string | null;
};

const approvedWhere = and(
  eq(gallerySubmissions.status, "approved"),
  isNotNull(gallerySubmissions.publicImagePath),
  isNotNull(gallerySubmissions.publicThumbPath),
);

/** PW-70, PW-72: approved customer photos, newest first, for the home row and the gallery page. */
export async function listApprovedGallery(limit = 10, offset = 0): Promise<GalleryTile[]> {
  const rows = await db.query.gallerySubmissions.findMany({
    where: approvedWhere,
    columns: {
      id: true,
      publicImagePath: true,
      publicThumbPath: true,
      firstName: true,
      note: true,
    },
    orderBy: [desc(gallerySubmissions.reviewedAt), desc(gallerySubmissions.createdAt)],
    limit,
    offset,
  });
  return rows.map((row) => ({
    id: row.id,
    imagePath: row.publicImagePath!,
    thumbPath: row.publicThumbPath!,
    firstName: row.firstName,
    note: row.note,
  }));
}

export async function countApprovedGallery(): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(gallerySubmissions)
    .where(approvedWhere);
  return total;
}

/** OD-32: the owner's queue for one tab, newest first. */
export async function listGalleryByStatus(status: GalleryStatus): Promise<GallerySubmission[]> {
  return db.query.gallerySubmissions.findMany({
    where: eq(gallerySubmissions.status, status),
    orderBy: [desc(gallerySubmissions.createdAt)],
  });
}

/** The badge next to the Gallery link. */
export async function countPendingGallery(): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(gallerySubmissions)
    .where(eq(gallerySubmissions.status, "pending"));
  return total;
}

export async function getGallerySubmission(id: string): Promise<GallerySubmission | null> {
  const row = await db.query.gallerySubmissions.findFirst({
    where: eq(gallerySubmissions.id, id),
  });
  return row ?? null;
}
