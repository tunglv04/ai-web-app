import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { enhancePrompt } from "@/lib/prompt-enhancer";
import { resizeImage, removeBackground, generateThumbnail } from "@/lib/image-processing";
import { errorResponse } from "@/lib/api-error";
import { sendToDiscord } from "@/lib/discord";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, settings } = body;

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  try {
    const finalPrompt = settings.autoEnhance
      ? await enhancePrompt({
          prompt,
          style: settings.style,
          negativePrompt: settings.negativePrompt,
          systemInstruction: settings.systemInstruction,
          styleGuidePrefix: settings.styleGuidePrefix,
          apiKey,
        })
      : prompt;

    const imageBuffers = await callGemini({
      prompt: finalPrompt,
      systemInstruction: settings.systemInstruction || undefined,
      model: settings.model || "gemini-3.1-flash",
      temperature: settings.temperature,
      numberOfImages: settings.numberOfImages,
      apiKey,
    });

    const results = [];

    for (let imageBuffer of imageBuffers) {
      if (settings.width || settings.height) {
        imageBuffer = await resizeImage(imageBuffer, settings.width, settings.height);
      }

      if (settings.transparent) {
        imageBuffer = await removeBackground(imageBuffer);
      }

      const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const thumbnail = await generateThumbnail(imageBuffer);

      results.push({
        id,
        prompt,
        imageBase64: imageBuffer.toString("base64"),
        thumbnailBase64: thumbnail.toString("base64"),
        settings,
        createdAt: new Date().toISOString(),
      });
      sendToDiscord(imageBuffer, prompt);
    }

    return NextResponse.json(results.length === 1 ? results[0] : results);
  } catch (err) {
    return errorResponse(err);
  }
}
