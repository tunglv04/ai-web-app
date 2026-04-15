import sharp from "sharp";

export async function resizeImage(
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(imageBuffer).resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  // Ensures the image has an alpha channel.
  // For actual AI-powered background removal, use Stability AI's remove-background endpoint.
  // This function is the local fallback that just ensures PNG with alpha.
  return sharp(imageBuffer).ensureAlpha().png().toBuffer();
}

export async function composeSpriteSheet(
  images: Buffer[],
  grid: {
    columns: number;
    rows: number;
    frameWidth: number;
    frameHeight: number;
    padding: number;
  }
): Promise<Buffer> {
  const { columns, rows, frameWidth, frameHeight, padding } = grid;
  const totalWidth = columns * frameWidth + (columns - 1) * padding;
  const totalHeight = rows * frameHeight + (rows - 1) * padding;

  const resizedImages = await Promise.all(
    images.map((img) => resizeImage(img, frameWidth, frameHeight))
  );

  const composites = resizedImages.map((img, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      input: img,
      left: col * (frameWidth + padding),
      top: row * (frameHeight + padding),
    };
  });

  return sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

export async function upscaleImage(
  imageBuffer: Buffer,
  scale: number
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const targetWidth = Math.round((meta.width || 512) * scale);
  const targetHeight = Math.round((meta.height || 512) * scale);
  return sharp(imageBuffer)
    .resize(targetWidth, targetHeight, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

export async function generateThumbnail(
  imageBuffer: Buffer,
  size: number = 256
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
