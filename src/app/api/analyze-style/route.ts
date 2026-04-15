import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { errorResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { imagesBase64 } = body;

  if (!imagesBase64 || imagesBase64.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];

  parts.push({ text: "Analyze these reference images carefully. They are game assets that define a specific art style." });

  for (const base64 of imagesBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: base64,
      },
    });
  }

  parts.push({
    text: `Based on these reference images, generate two things:

1. **PROMPT_PREFIX**: A concise prompt prefix (1-3 lines) that defines ONLY the art style to maintain across all generated images. Include: art technique, line style, color palette, shading method, and distinctive visual features. This will be prepended to user prompts like "a warrior" or "a sword".

2. **SYSTEM_INSTRUCTION**: A detailed system instruction (3-8 lines) for an AI image generator, written as if briefing an artist. Describe ONLY the art style rules:
   - The exact art style, medium, and technique
   - Color palette and shading approach
   - Proportions and design philosophy (e.g. chibi, realistic proportions)
   - Consistency rules (line weight, outline style, level of detail)
   - Target use case (mobile game, pixel art game, etc.)
   - Any unique stylistic signatures you notice

CRITICAL: Do NOT include any of the following — these come from the user's prompt and reference images, not the style guide:
- Specific character descriptions, poses, or actions
- Perspective or camera angle (front view, side view, etc.)
- Composition or layout instructions
- Subject matter or content descriptions
- Background descriptions

The style guide defines HOW things look, not WHAT is shown.

Be extremely specific and observational about the visual style only.

Respond in this exact format:
PROMPT_PREFIX:
[your prompt prefix here]

SYSTEM_INSTRUCTION:
[your system instruction here]`,
  });

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const text = result.response.text();

    const prefixMatch = text.match(/PROMPT_PREFIX:\s*([\s\S]*?)(?=SYSTEM_INSTRUCTION:)/);
    const instructionMatch = text.match(/SYSTEM_INSTRUCTION:\s*([\s\S]*?)$/);

    const promptPrefix = prefixMatch ? prefixMatch[1].trim() : "";
    const systemInstruction = instructionMatch ? instructionMatch[1].trim() : "";

    return NextResponse.json({ promptPrefix, systemInstruction });
  } catch (err) {
    return errorResponse(err);
  }
}
