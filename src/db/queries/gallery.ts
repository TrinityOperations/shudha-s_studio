import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { gallerySubmissions } from "@/db/schema";

export type GalleryTile = {
  id: string;
  /** Paths inside the public `gallery-images` bucket */
  imagePath: string;
  thumbPath: string;
  firstName: string | null;
};

/** PW-72: approved customer photos, newest first, for the home page row and the gallery (#12). */
export async function listApprovedGallery(limit = 10): Promise<GalleryTile[]> {
  const rows = await db.query.gallerySubmissions.findMany({
    where: and(
      eq(gallerySubmissions.status, "approved"),
      isNotNull(gallerySubmissions.publicImagePath),
      isNotNull(gallerySubmissions.publicThumbPath),
    ),
    columns: { id: true, publicImagePath: true, publicThumbPath: true, firstName: true },
    orderBy: [desc(gallerySubmissions.reviewedAt), desc(gallerySubmissions.createdAt)],
    limit,
  });
  return rows.map((row) => ({
    id: row.id,
    imagePath: row.publicImagePath!,
    thumbPath: row.publicThumbPath!,
    firstName: row.firstName,
  }));
}
