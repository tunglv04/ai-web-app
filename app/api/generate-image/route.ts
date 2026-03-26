import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

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
      imageModel
    } = await req.json();

    // The API key is sent via custom header from the client
    const apiKey = req.headers.get("x-google-api-key");

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Google API Key in headers" }, { status: 401 });
    }

    // Initialize GenAI client
    const ai = new GoogleGenAI({ apiKey });

    // 1. Expand prompt using Gemini Text Model
    // We want a highly detailed, artistic description based on user's simple prompt.
    const systemInstruction = `You are an elite, world-class AI Image Prompt Engineer.
Your objective is to take a simple user concept and expand it into a breathtaking, highly detailed, and professional image generation prompt. 
You must enhance the prompt with specific photography/art terminology, cinematic lighting descriptors, precise camera angles, hyper-realistic textures, color grading, and atmospheric details. 
If the user provides reference images, actively fuse their aesthetic DNA into the concept. Avoid cliches. Keep it structured, visually evocative, and optimized for cutting-edge text-to-image models. DO NOT output any conversational text, pleasantries, or wrapper quotes; output ONLY the final master prompt. Maximum 150 words.`;

    let contents: any[] = [requestPrompt];
    if (negativePrompt) {
      contents.push(`\nThe user also specifies a NEGATIVE PROMPT (things absolutely to AVOID in the image): "${negativePrompt}". Ensure your enhanced description actively steers clear of these elements and does not accidentally describe them.`);
    }

    // If reference images are provided, parse them and pass to Gemini
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      for (const refImage of referenceImages) {
        if (refImage && refImage.startsWith('data:image/')) {
          const match = refImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            contents.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            });
          }
        }
      }
      contents.push(`\n[REFERENCE IMAGES PROVIDED] 
Analyze the attached reference images deeply. Extract and fuse their core visual DNA into the final prompt. 
Specifically, pay close attention to the following technical dimensions:
1. Artistic Style & Medium: (e.g., oil painting, 35mm photography, anime, cinematic 3D render).
2. Color Palette & Grading: (e.g., hyper-saturated, muted tones, neon cyberpunk, pastel).
3. Lighting & Shadows: (e.g., volumetric lighting, chiaroscuro, cinematic golden hour, harsh flash).
4. Textures, Materiality & Mood: (e.g., glossy, gritty, ethereal, intense atmospheric vibe).
5. Camera, Perspective & Focal Length: (e.g., 50mm lens, f/1.8 bokeh, wide-angle, macro shot, drone view).
6. Framing & Composition: (e.g., extreme close-up, full body shot, symmetric, rule of thirds, low angle).
7. Rendering Engine (If CGI/Digital): (e.g., Unreal Engine 5, Octane render, ray tracing, cel-shaded).

Do NOT simply caption the reference images identically; instead, creatively mix their absolute best technical and aesthetic qualities to dramatically elevate the user's requested concept.`);
    }

    if (resolution) {
      contents.push(`\n[CRITICAL QUALITY CONSTRAINT]: The user explicitly requested a target resolution of ${resolution}. You MUST integrate "${resolution} quality" into your final prompt and absolutely DO NOT hallucinate or blindly append buzzwords like "8K", "4K", or "16K" unless it exactly matches their choice.`);
    }

    let finalPromptModel = promptModel;
    if (!finalPromptModel) {
      return NextResponse.json({ error: "No prompt model selected" }, { status: 400 });
    }

    let enhancedPrompt = requestPrompt;
    try {
      const promptEnhanceRes = await ai.models.generateContent({
        model: finalPromptModel,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });
      enhancedPrompt = promptEnhanceRes.text?.trim() || requestPrompt;
      console.log("Original:", requestPrompt, "-> Enhanced:", enhancedPrompt, "with model:", finalPromptModel);
    } catch (enhanceError: any) {
      console.error("Gemini enhancement failed:", enhanceError);
      return NextResponse.json(
        { error: `Prompt Expansion Failed with model ${finalPromptModel}: ${enhanceError.message}` },
        { status: 500 }
      );
    }

    // 2. Generate Image using Imagen 3
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
          generationConfig: { temperature: 0.7 + i * 0.05 } // slight variation to ensure different results
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
      enhancedPrompt
    });

  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
