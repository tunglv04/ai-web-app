import { resizeImage, removeBackground, composeSpriteSheet } from "../image-processing";
import sharp from "sharp";

describe("image-processing", () => {
  let testPng: Buffer;

  beforeAll(async () => {
    testPng = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();
  });

  test("resizeImage resizes to target dimensions", async () => {
    const resized = await resizeImage(testPng, 32, 32);
    const meta = await sharp(resized).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);
  });

  test("removeBackground returns PNG with alpha channel", async () => {
    const result = await removeBackground(testPng);
    const meta = await sharp(result).metadata();
    expect(meta.channels).toBe(4);
    expect(meta.format).toBe("png");
  });

  test("composeSpriteSheet creates correct grid dimensions", async () => {
    const images = [testPng, testPng, testPng, testPng];
    const result = await composeSpriteSheet(images, {
      columns: 2,
      rows: 2,
      frameWidth: 64,
      frameHeight: 64,
      padding: 0,
    });
    const meta = await sharp(result).metadata();
    expect(meta.width).toBe(128);
    expect(meta.height).toBe(128);
  });

  test("composeSpriteSheet respects padding", async () => {
    const images = [testPng, testPng, testPng, testPng];
    const result = await composeSpriteSheet(images, {
      columns: 2,
      rows: 2,
      frameWidth: 64,
      frameHeight: 64,
      padding: 4,
    });
    const meta = await sharp(result).metadata();
    expect(meta.width).toBe(128 + 4);   // 2*64 + 1*4 (padding between)
    expect(meta.height).toBe(128 + 4);
  });
});
