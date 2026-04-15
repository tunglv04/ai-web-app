import { NextRequest, NextResponse } from "next/server";
import { enhancePrompt } from "@/lib/prompt-enhancer";
import { errorResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, style, negativePrompt, systemInstruction, styleGuidePrefix, model } = body;

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  try {
    const enhanced = await enhancePrompt({
      prompt,
      style,
      negativePrompt,
      systemInstruction,
      styleGuidePrefix,
      apiKey,
      model,
    });

    return NextResponse.json({ enhanced });
  } catch (err) {
    return errorResponse(err);
  }
}
