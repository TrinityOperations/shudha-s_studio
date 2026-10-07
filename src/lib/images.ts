import "server-only";
import sharp from "sharp";

export const FULL_IMAGE_MAX_PX = 1600;
export const THUMB_IMAGE_MAX_PX = 400;

export type ProcessedImage = {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
};

/** Re-encodes any supported input as webp: a full image (max 1600px) and a 400px thumbnail. */
export async function processProductImage(input: Buffer): Promise<ProcessedImage> {
  const source = sharp(input, { failOn: "error" }).rotate();

  const full = await source
    .clone()
    .resize({
      width: FULL_IMAGE_MAX_PX,
      height: FULL_IMAGE_MAX_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const thumb = await source
    .clone()
    .resize({
      width: THUMB_IMAGE_MAX_PX,
      height: THUMB_IMAGE_MAX_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 78 })
    .toBuffer();

  return { full: full.data, thumb, width: full.info.width, height: full.info.height };
}

/** Customer reference image for a booking (PW-30): full size only, max 1600px, webp. No thumbnail. */
export async function processReferenceImage(
  input: Buffer,
): Promise<{ data: Buffer; width: number; height: number }> {
  const result = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({
      width: FULL_IMAGE_MAX_PX,
      height: FULL_IMAGE_MAX_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { data: result.data, width: result.info.width, height: result.info.height };
}
