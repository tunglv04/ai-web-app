import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { enhancePrompt } from "@/lib/prompt-enhancer";
import { resizeImage, removeBackground, generateThumbnail } from "@/lib/image-processing";
import { errorResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const prompt = formData.get("prompt") as string;
  const feedback = formData.get("feedback") as string;
  const settingsJson = formData.get("settings") as string;
  const sourceImage = formData.get("sourceImage") as File | null;
  const styleFiles = formData.getAll("styleImages") as File[];
  const refinedFrom = formData.get("refinedFrom") as string;

  if (!prompt || !feedback || !sourceImage) {
    return NextResponse.json({ error: "prompt, feedback, and sourceImage required" }, { status: 400 });
  }

  const settings = JSON.parse(settingsJson);

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  try {
    const refinedPrompt = await enhancePrompt({
      prompt: `${prompt}. IMPORTANT: The previous version was wrong because: ${feedback}. Rewrite the prompt to POSITIVELY describe only what should be visible — do NOT use "without" or "no" phrasing, instead describe exactly what the image should show.`,
      style: settings.style,
      negativePrompt: settings.negativePrompt,
      systemInstruction: settings.systemInstruction,
      styleGuidePrefix: settings.styleGuidePrefix,
      apiKey,
    });

    const sourceBytes = await sourceImage.arrayBuffer();
    const sourceBuffer = Buffer.from(sourceBytes);

    const styleBuffers: Buffer[] = [];
    for (const file of styleFiles) {
      const bytes = await file.arrayBuffer();
      styleBuffers.push(Buffer.from(bytes));
    }

    const imageBuffers = await callGemini({
      prompt: refinedPrompt,
      systemInstruction: settings.systemInstruction || undefined,
      styleImages: styleBuffers.length > 0 ? styleBuffers : undefined,
      refineImage: sourceBuffer,
      refineFeedback: feedback,
      model: settings.model || "gemini-3.1-flash",
      temperature: settings.temperature,
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
        prompt: refinedPrompt,
        refinedFrom,
        feedback,
        imageBase64: imageBuffer.toString("base64"),
        thumbnailBase64: thumbnail.toString("base64"),
        settings,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(results.length === 1 ? results[0] : results);
  } catch (err) {
    return errorResponse(err);
  }
}
