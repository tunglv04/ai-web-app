import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { enhancePrompt } from "@/lib/prompt-enhancer";
import { resizeImage, removeBackground, generateThumbnail } from "@/lib/image-processing";
import { errorResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const prompt = formData.get("prompt") as string;
  const settingsJson = formData.get("settings") as string;
  const compositionFile = formData.get("composition") as File | null;
  const styleFiles = formData.getAll("styleImages") as File[];
  const elementFiles = formData.getAll("elementImages") as File[];
  const elementLabelsJson = formData.get("elementLabels") as string | null;
  const editInstructions = formData.get("editInstructions") as string | null;

  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const settings = JSON.parse(settingsJson);

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
          editInstructions: editInstructions || undefined,
          apiKey,
        })
      : prompt;

    // Parse composition reference
    let compositionBuffer: Buffer | undefined;
    if (compositionFile) {
      const bytes = await compositionFile.arrayBuffer();
      compositionBuffer = Buffer.from(bytes);
    }

    // Parse style guide images
    const styleBuffers: Buffer[] = [];
    for (const file of styleFiles) {
      const bytes = await file.arrayBuffer();
      styleBuffers.push(Buffer.from(bytes));
    }

    // Parse element reference images with labels
    const elementLabels: string[] = elementLabelsJson ? JSON.parse(elementLabelsJson) : [];
    const elementImages: { buffer: Buffer; label: string }[] = [];
    for (let i = 0; i < elementFiles.length; i++) {
      const bytes = await elementFiles[i].arrayBuffer();
      elementImages.push({
        buffer: Buffer.from(bytes),
        label: elementLabels[i] || `element ${i + 1}`,
      });
    }

    const imageBuffers = await callGemini({
      prompt: finalPrompt,
      systemInstruction: settings.systemInstruction || undefined,
      styleImages: styleBuffers.length > 0 ? styleBuffers : undefined,
      compositionImage: compositionBuffer,
      elementImages: elementImages.length > 0 ? elementImages : undefined,
      editInstructions: editInstructions || undefined,
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
    }

    return NextResponse.json(results.length === 1 ? results[0] : results);
  } catch (err) {
    return errorResponse(err);
  }
}
