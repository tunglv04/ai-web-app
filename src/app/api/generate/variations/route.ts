import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { enhancePrompt } from "@/lib/prompt-enhancer";
import { resizeImage, removeBackground, generateThumbnail } from "@/lib/image-processing";
import { errorResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const sourceImage = formData.get("sourceImage") as File | null;
  const assetJson = formData.get("asset") as string;
  const countStr = formData.get("count") as string | null;

  if (!sourceImage || !assetJson) {
    return NextResponse.json({ error: "sourceImage and asset required" }, { status: 400 });
  }

  const sourceAsset = JSON.parse(assetJson);
  const count = parseInt(countStr || "4");

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  try {
    const sourceBytes = await sourceImage.arrayBuffer();
    const sourceBuffer = Buffer.from(sourceBytes);

    const finalPrompt = sourceAsset.settings.autoEnhance
      ? await enhancePrompt({
          prompt: sourceAsset.prompt,
          style: sourceAsset.settings.style,
          negativePrompt: sourceAsset.settings.negativePrompt,
          apiKey,
        })
      : sourceAsset.prompt;

    const results = [];

    for (let i = 0; i < count; i++) {
      const imageBuffers = await callGemini({
        prompt: `Generate a variation of this image. ${finalPrompt}`,
        compositionImage: sourceBuffer,
        model: sourceAsset.settings.model || "gemini-3.1-flash",
        temperature: sourceAsset.settings.temperature,
        apiKey,
      });
      let imageBuffer = imageBuffers[0];

      if (sourceAsset.settings.width || sourceAsset.settings.height) {
        imageBuffer = await resizeImage(imageBuffer, sourceAsset.settings.width, sourceAsset.settings.height);
      }

      if (sourceAsset.settings.transparent) {
        imageBuffer = await removeBackground(imageBuffer);
      }

      const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const thumbnail = await generateThumbnail(imageBuffer);

      results.push({
        id,
        prompt: sourceAsset.prompt,
        imageBase64: imageBuffer.toString("base64"),
        thumbnailBase64: thumbnail.toString("base64"),
        settings: sourceAsset.settings,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(results);
  } catch (err) {
    return errorResponse(err);
  }
}
