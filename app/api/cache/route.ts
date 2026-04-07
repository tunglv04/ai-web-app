import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, REFERENCE_IMAGE_ANALYSIS, parseBase64Image } from "@/lib/prompts";

/**
 * POST /api/cache
 * 
 * Creates a Google GenAI context cache containing the system instruction + reference images.
 * This cache can be reused across multiple prompt expansion calls to avoid re-sending
 * large image data every time, saving significant token costs.
 * 
 * The cache has a 1-hour TTL. Client should store the cache name and fingerprint
 * in localStorage and reuse it for subsequent requests with the same images.
 */
export async function POST(req: NextRequest) {
  try {
    const { referenceImages, promptModel, systemInstruction: clientSystemInstruction, referenceImageAnalysis: clientRefAnalysis } = await req.json();
    const apiKey = req.headers.get("x-google-api-key");

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 401 });
    }

    if (!referenceImages || !Array.isArray(referenceImages) || referenceImages.length === 0) {
      return NextResponse.json({ error: "No reference images provided" }, { status: 400 });
    }

    if (!promptModel) {
      return NextResponse.json({ error: "No prompt model specified" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build parts: reference images + analysis instructions
    const parts: any[] = [];
    for (const refImage of referenceImages) {
      const parsed = parseBase64Image(refImage);
      if (parsed) {
        parts.push({ inlineData: parsed });
      }
    }
    parts.push({ text: clientRefAnalysis || REFERENCE_IMAGE_ANALYSIS });

    // Create the cache with system instruction + reference images
    const cache = await ai.caches.create({
      model: promptModel,
      config: {
        contents: [
          { role: "user", parts },
          {
            role: "model",
            parts: [{ text: "I have thoroughly analyzed the provided reference images. I understand their artistic style, color palette, lighting, textures, camera perspective, composition, and rendering characteristics. I am ready to fuse these visual qualities into enhanced prompts for any concept you provide." }]
          }
        ],
        systemInstruction: clientSystemInstruction || SYSTEM_INSTRUCTION,
        ttl: "3600s", // 1 hour
        displayName: "eagle-ai-ref-images"
      }
    });

    console.log("✅ Cache created:", cache.name, "for model:", promptModel);

    return NextResponse.json({
      cacheName: cache.name,
      model: promptModel
    });
  } catch (error: any) {
    console.error("Cache creation error:", error);

    // Provide a clear error code so client can decide whether to retry or skip caching
    const errorMessage = error.message || "Failed to create cache";
    const isTooSmall = errorMessage.toLowerCase().includes("too small") ||
                       errorMessage.toLowerCase().includes("minimum");

    return NextResponse.json({
      error: errorMessage,
      code: isTooSmall ? "CONTENT_TOO_SMALL" : "CACHE_ERROR"
    }, { status: 500 });
  }
}
