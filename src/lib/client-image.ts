import { isAllowedImageType } from "@/lib/validators/product-images";

export const PRE_RESIZE_SKIP_BYTES = 1.5 * 1024 * 1024;
export const PRE_RESIZE_MAX_PX = 2000;

/**
 * Browser-side downscale before posting to the upload action, so a 10 MB phone photo fits the
 * hosting request limit. PNG stays PNG (transparency); everything else becomes JPEG. Files that
 * are already small and under 2000px are returned untouched. The server re-encodes regardless.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isAllowedImageType(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  if (file.size < PRE_RESIZE_SKIP_BYTES && longest < PRE_RESIZE_MAX_PX) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, PRE_RESIZE_MAX_PX / longest);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const isPng = file.type === "image/png";
  const type = isPng ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, isPng ? undefined : 0.9),
  );
  if (!blob) return file;
  if (scale === 1 && blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + (isPng ? ".png" : ".jpg");
  return new File([blob], name, { type, lastModified: file.lastModified });
}
