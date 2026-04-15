/** Resize an image file client-side if it exceeds maxDimension or maxBytes.
 *  Returns the original file if it's already small enough. */
export async function resizeIfNeeded(
  file: File,
  maxDimension = 2048,
  maxBytes = 1_500_000
): Promise<File> {
  if (file.size <= maxBytes) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate new dimensions preserving aspect ratio
  let newWidth = width;
  let newHeight = height;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    newWidth = Math.round(width * scale);
    newHeight = Math.round(height * scale);
  }

  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  // Try PNG first, fall back to JPEG if still too large
  let blob = await canvas.convertToBlob({ type: "image/png" });
  if (blob.size > maxBytes) {
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  }

  return new File([blob], file.name, { type: blob.type });
}
