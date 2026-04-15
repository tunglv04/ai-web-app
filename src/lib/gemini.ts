import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_MODELS: Record<string, string> = {
  "gemini-3-pro": "gemini-3-pro-image-preview",
  "gemini-3.1-flash": "gemini-3.1-flash-image-preview",
  "gemini-2.5-flash": "gemini-2.5-flash-image",
};

export async function callGemini(params: {
  prompt: string;
  systemInstruction?: string;
  styleImages?: Buffer[];
  compositionImage?: Buffer;
  elementImages?: { buffer: Buffer; label: string }[];
  editInstructions?: string;
  refineImage?: Buffer;
  refineFeedback?: string;
  model: string;
  apiKey: string;
  temperature?: number;
  numberOfImages?: number;
}): Promise<Buffer[]> {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const modelId = GEMINI_MODELS[params.model] || GEMINI_MODELS["gemini-3.1-flash"];

  const model = genAI.getGenerativeModel({
    model: modelId,
    ...(params.systemInstruction
      ? { systemInstruction: params.systemInstruction }
      : {}),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];

  // Style guide images: define the art style
  if (params.styleImages && params.styleImages.length > 0) {
    parts.push({ text: "These are style reference images. Match their art style, line weight, colors, and visual feel:" });
    for (const imgBuffer of params.styleImages) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: imgBuffer.toString("base64"),
        },
      });
    }
  }

  // Composition reference: defines the idea and layout
  if (params.compositionImage) {
    const hasEdits = (params.elementImages && params.elementImages.length > 0) || params.editInstructions;
    const compositionInstruction = hasEdits
      ? "This is the composition reference — the base image to modify. Keep the overall layout, style, and composition, but apply the edit instructions below:"
      : "This is a composition reference image. Use it as the basis for the idea, layout, and subject of the generated image:";
    parts.push({ text: compositionInstruction });
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: params.compositionImage.toString("base64"),
      },
    });
  }

  // Element reference images: labeled replacement elements
  if (params.elementImages && params.elementImages.length > 0) {
    parts.push({ text: "These are element reference images. Use them as visual references for the replacements described in the edit instructions:" });
    for (const elem of params.elementImages) {
      parts.push({ text: `Element "${elem.label}":` });
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: elem.buffer.toString("base64"),
        },
      });
    }
  }

  // Edit instructions: what to replace/remove/change
  if (params.editInstructions) {
    parts.push({ text: `Edit instructions: ${params.editInstructions}` });
  }

  // Refine mode: show previous image with explicit fix instructions
  if (params.refineImage && params.refineFeedback) {
    parts.push({ text: "This is the previous attempt that needs improvement. Study it to understand the subject and style, but generate a NEW corrected version based on the prompt below. The prompt already describes the corrected version — follow it exactly:" });
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: params.refineImage.toString("base64"),
      },
    });
  }

  parts.push({ text: params.prompt });

  const count = params.numberOfImages ?? 1;
  const images: Buffer[] = [];

  for (let i = 0; i < count; i++) {
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
        temperature: params.temperature ?? 1,
      } as never,
    });

    const candidate = result.response.candidates?.[0];
    if (!candidate?.content?.parts) {
      const reason = candidate?.finishReason || "unknown";
      const safetyRatings = candidate?.safetyRatings?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => `${r.category}: ${r.probability}`
      ).join(", ");
      console.error(`Gemini candidate empty. Finish reason: ${reason}. Safety: ${safetyRatings || "none"}`);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = candidate.content.parts.find((p: any) => p.inlineData) as
      | { inlineData: { data: string } }
      | undefined;
    if (imagePart) {
      images.push(Buffer.from(imagePart.inlineData.data, "base64"));
    } else {
      // Log what we got instead
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textParts = candidate.content.parts.filter((p: any) => p.text).map((p: any) => p.text);
      if (textParts.length > 0) {
        console.error(`Gemini returned text instead of image: ${textParts.join(" ").slice(0, 200)}`);
      }
    }
  }

  if (images.length === 0) {
    throw new Error("Gemini returned no image data. The model may have refused the request due to content policy, or returned text instead of an image. Check server logs for details.");
  }

  return images;
}
