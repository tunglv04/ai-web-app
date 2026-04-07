import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, REFERENCE_IMAGE_ANALYSIS, parseBase64Image } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const {
      requestPrompt,
      negativePrompt,
      aspectRatio,
      resolution,
      count,
      referenceImages,
      promptModel,
      imageModel,
      temperature,
      cacheName,
      systemInstruction: clientSystemInstruction,
      referenceImageAnalysis: clientRefAnalysis,
      skipExpansion
    } = await req.json();

    // The API key is sent via custom header from the client
    const apiKey = req.headers.get("x-google-api-key");

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Google API Key in headers" }, { status: 401 });
    }

    // Initialize GenAI client
    const ai = new GoogleGenAI({ apiKey });

    // === PROMPT EXPANSION ===
    let finalPromptModel = promptModel;
    if (!finalPromptModel) {
      return NextResponse.json({ error: "No prompt model selected" }, { status: 400 });
    }

    let enhancedPrompt = requestPrompt;
    let cacheUsed = false;
    let cacheExpired = false;

    // Skip prompt expansion if user wants direct mode
    if (skipExpansion) {
      console.log("⚡ Direct mode — skipping prompt expansion, using raw prompt");
      enhancedPrompt = requestPrompt;
    }
    // --- Path A: Use cached context (reference images already cached) ---
    else if (cacheName) {
      try {
        let cachedContents: any[] = [requestPrompt];
        if (negativePrompt) {
          cachedContents.push(`\nThe user also specifies a NEGATIVE PROMPT (things absolutely to AVOID in the image): "${negativePrompt}". Ensure your enhanced description actively steers clear of these elements and does not accidentally describe them.`);
        }
        if (resolution) {
          cachedContents.push(`\n[CRITICAL QUALITY CONSTRAINT]: The user explicitly requested a target resolution of ${resolution}. You MUST integrate "${resolution} quality" into your final prompt and absolutely DO NOT hallucinate or blindly append buzzwords like "8K", "4K", or "16K" unless it exactly matches their choice.`);
        }

        const promptEnhanceRes = await ai.models.generateContent({
          model: finalPromptModel,
          contents: cachedContents,
          config: {
            cachedContent: cacheName,
            temperature: temperature ?? 0.3,
          }
        });
        enhancedPrompt = promptEnhanceRes.text?.trim() || requestPrompt;
        cacheUsed = true;
        console.log("✅ Cache hit — prompt expanded using cached reference images");
        console.log("Original:", requestPrompt, "-> Enhanced:", enhancedPrompt);
      } catch (cacheError: any) {
        console.warn("⚠️ Cache miss/expired, falling back to inline:", cacheError.message);
        cacheExpired = true;
        // Fall through to Path B
      }
    }

    // --- Path B: Inline everything (no cache, or cache failed) ---
    if (!cacheUsed) {
      const systemInstruction = clientSystemInstruction || SYSTEM_INSTRUCTION;

      let contents: any[] = [requestPrompt];
      if (negativePrompt) {
        contents.push(`\nThe user also specifies a NEGATIVE PROMPT (things absolutely to AVOID in the image): "${negativePrompt}". Ensure your enhanced description actively steers clear of these elements and does not accidentally describe them.`);
      }

      // If reference images are provided, parse them and pass to Gemini
      if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
        for (const refImage of referenceImages) {
          const parsed = parseBase64Image(refImage);
          if (parsed) {
            contents.push({ inlineData: parsed });
          }
        }
        contents.push(clientRefAnalysis || REFERENCE_IMAGE_ANALYSIS);
      }

      if (resolution) {
        contents.push(`\n[CRITICAL QUALITY CONSTRAINT]: The user explicitly requested a target resolution of ${resolution}. You MUST integrate "${resolution} quality" into your final prompt and absolutely DO NOT hallucinate or blindly append buzzwords like "8K", "4K", or "16K" unless it exactly matches their choice.`);
      }

      try {
        const promptEnhanceRes = await ai.models.generateContent({
          model: finalPromptModel,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: temperature ?? 0.3,
          }
        });
        enhancedPrompt = promptEnhanceRes.text?.trim() || requestPrompt;
        console.log("📝 Inline — Original:", requestPrompt, "-> Enhanced:", enhancedPrompt, "with model:", finalPromptModel);
      } catch (enhanceError: any) {
        console.error("Gemini enhancement failed:", enhanceError);
        return NextResponse.json(
          { error: `Prompt Expansion Failed with model ${finalPromptModel}: ${enhanceError.message}` },
          { status: 500 }
        );
      }
    }

    // === IMAGE GENERATION ===
    // Map ratio
    let mappedRatio = "1:1";
    if (aspectRatio === "16:9") mappedRatio = "16:9";
    if (aspectRatio === "9:16") mappedRatio = "9:16";

    // Build the request config for Imagen 3
    const imagenConfig: any = {
      numberOfImages: count || 1,
      aspectRatio: mappedRatio,
      outputMimeType: "image/png",
    };

    if (negativePrompt) {
      imagenConfig.negativePrompt = negativePrompt;
    }

    const finalImageModel = imageModel || "imagen-3.0-generate-002";
    console.log("Generating image with model:", finalImageModel);

    const isGeminiPreview = finalImageModel.includes("gemini") && finalImageModel.includes("image");
    const apiVersion = isGeminiPreview ? "v1alpha" : "v1beta";
    const endpointMethod = isGeminiPreview ? "generateContent" : "predict";

    let base64Images: string[] = [];

    if (endpointMethod === "generateContent") {
      // For generateContent, native fields for image generation aren't exposed cleanly yet.
      // We enforce Aspect Ratio directly via the master prompt.
      let reinforcedPrompt = enhancedPrompt;
      if (negativePrompt) {
        reinforcedPrompt += `\n\n[CRITICAL NEGATIVE PROMPT - DO NOT DEPICT OR INCLUDE THESE ELEMENTS]: ${negativePrompt}`;
      }
      reinforcedPrompt += `\n\n[SYSTEM DIRECTIVE: Output the generated image strictly in ${mappedRatio} aspect ratio and targeting ${resolution || '2K'} visual quality.]`;

      // We use a Promise.all loop to generate `count` images concurrently since candidateCount often defaults/limits to 1
      const fetchPromises = Array.from({ length: count || 1 }).map((_, i) => {
        const reqBody = {
          contents: [{ role: "user", parts: [{ text: reinforcedPrompt }] }],
          generationConfig: { temperature: (temperature ?? 0.3) + i * 0.05 } // slight variation to ensure different results
        };

        return fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${finalImageModel}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody)
        }).then(res => res.text());
      });

      const responses = await Promise.all(fetchPromises);

      for (const resText of responses) {
        let parsed: any = {};
        try { parsed = JSON.parse(resText); } catch (e) {
          console.error("Non-JSON response in generateContent:", resText);
          continue;
        }

        if (parsed.error) {
          console.error("Partial image generation error:", parsed.error);
          throw new Error(parsed.error.message || "Failed to generate an image part.");
        }

        const candidates = parsed.candidates || [];
        for (const cand of candidates) {
          const parts = cand.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              base64Images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
            }
          }
        }
      }

    } else {
      // Legacy Imagen 3 uses predict with full parameter support
      const reqBody = {
        instances: [{ prompt: enhancedPrompt }],
        parameters: {
          sampleCount: count || 1,
          aspectRatio: mappedRatio,
          ...(negativePrompt ? { negativePrompt } : {})
        }
      };

      const backendRes = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${finalImageModel}:predict?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
      });

      const backendResText = await backendRes.text();
      let backendData: any = {};
      try { backendData = JSON.parse(backendResText); } catch (e) { console.error("Parse failed"); }

      if (!backendRes.ok) {
        throw new Error(backendData.error?.message || `API Error (${backendRes.status}): ${backendResText.substring(0, 150)}`);
      }

      const predictions = backendData.predictions || [];
      base64Images = predictions
        .map((p: any) => p.bytesBase64Encoded || p.imageBytes)
        .filter(Boolean)
        .map((bytes: string) => `data:image/png;base64,${bytes}`);
    }

    if (base64Images.length === 0) {
      throw new Error("No images returned from Google AI Studio.");
    }

    return NextResponse.json({
      images: base64Images,
      enhancedPrompt,
      cacheUsed,
      cacheExpired
    });

  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
