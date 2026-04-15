# Gemini Provider + Prompt Enhancement

## Problem

Stability AI (SDXL/SD3) produces results that ignore style settings — selecting "hand-drawn" still generates realistic-looking images. The `style` field is never injected into the prompt text, and no negative prompts are used to steer away from unwanted styles.

## Solution

Two changes:
1. Add Google Gemini (Imagen 3) as an alternative image generation provider
2. Add automatic prompt enhancement that injects style-appropriate keywords and negative prompts

## 1. Provider Abstraction

### New field in `GenerationSettings`

```typescript
provider: "stability" | "gemini"  // default: "gemini"
autoEnhance: boolean              // default: true
```

### Gemini models

| Model ID | Display Name | Endpoint |
|----------|-------------|----------|
| `imagen-3` | Imagen 3 | `models/imagen-3.0-generate-002:predict` |
| `imagen-3-fast` | Imagen 3 Fast | `models/imagen-3.0-generate-001:predict` |
| `gemini-2.0-flash` | Gemini 2.0 Flash | Via `@google/generative-ai` SDK, `gemini-2.0-flash-exp` |

Default model: `imagen-3`.

### Stability models (unchanged)

- `sdxl` — SDXL
- `sd3` — SD3

### Model selection UX

The model dropdown groups by provider:

```
Gemini: Imagen 3 | Gemini: Imagen 3 Fast | Gemini: Gemini 2.0 Flash | Stability: SDXL | Stability: SD3
```

Selecting a model auto-sets the `provider` field. No separate provider dropdown needed.

## 2. Gemini API Integration

### New file: `src/lib/gemini.ts`

Mirrors `stability.ts` structure with:

- `callGeminiImagen(prompt, negativePrompt, apiKey)` — calls Imagen 3 / Imagen 3 Fast REST endpoint
- `callGeminiFlash(prompt, apiKey)` — calls Gemini 2.0 Flash via `@google/generative-ai` SDK
- `callGeminiImg2Img(prompt, referenceImage, strength, apiKey)` — img2img via Imagen

### Imagen 3 API format

```
POST https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict
Headers: Content-Type: application/json
Query: key={GEMINI_API_KEY}

Body:
{
  "instances": [{ "prompt": "..." }],
  "parameters": {
    "sampleCount": 1,
    "negativePrompt": "...",
    "aspectRatio": "1:1"
  }
}

Response: { "predictions": [{ "bytesBase64Encoded": "..." }] }
```

Response is base64 PNG — decode to Buffer, then pass through existing post-processing (resize, removeBackground, generateThumbnail).

### Gemini 2.0 Flash image generation

Uses `@google/generative-ai` SDK:

```typescript
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: { responseModalities: ["IMAGE"] }
});
```

Extract inline image data from response parts.

### Environment

Add `GEMINI_API_KEY` to `.env.local`.

## 3. Prompt Enhancement

### New file: `src/lib/prompt-enhancer.ts`

Exports `enhancePrompt(prompt, style, autoEnhance)` returning `{ prompt: string, negativePrompt: string }`.

### Style map

| Style | Prepended keywords | Negative prompt |
|-------|-------------------|-----------------|
| `pixel-art` | `pixel art, 16-bit sprite, clean pixels, game asset` | `photorealistic, blurry, smooth gradients, 3D render` |
| `hand-drawn` | `hand-drawn illustration, ink lines, sketch style, traditional art` | `photorealistic, 3D render, photograph, hyper-realistic, CGI` |
| `flat-vector` | `flat vector art, clean shapes, solid colors, minimal shading` | `photorealistic, textured, 3D, gradients, noisy` |
| `realistic` | `highly detailed, realistic rendering, game asset` | `cartoon, sketch, pixel art, low quality` |
| `custom` | *(none)* | *(none)* |

When `autoEnhance` is `true`: prepend style keywords to user prompt, set negative prompt.
When `autoEnhance` is `false`: pass user prompt as-is, no negative prompt (unless user provides one in the future).

### Enhancement flow

```
User prompt: "a warrior character"
Style: hand-drawn
autoEnhance: true

Final prompt: "hand-drawn illustration, ink lines, sketch style, traditional art, a warrior character"
Negative prompt: "photorealistic, 3D render, photograph, hyper-realistic, CGI"
```

## 4. API Route Changes

### `src/app/api/generate/route.ts`

1. Apply `enhancePrompt()` to the incoming prompt
2. Check `settings.provider`
3. If `"gemini"` — call `callGeminiImagen()` or `callGeminiFlash()` based on `settings.model`
4. If `"stability"` — existing Stability AI flow (unchanged)
5. Post-processing (resize, background removal, thumbnail) stays the same for both

### `src/app/api/generate/img2img/route.ts`

Same dispatch logic. Gemini Imagen supports image-to-image via the same predict endpoint with an added `image` field.

### `src/app/api/generate/variations/route.ts`

Same dispatch logic — reads source asset's settings to determine provider.

## 5. UI Changes

### `src/components/generation-settings.tsx`

- Model dropdown: replace flat list with grouped options (Gemini models, Stability models)
- New "Auto-enhance" toggle: checkbox, default on
- Selecting a model sets `provider` automatically

### `src/lib/types.ts`

```typescript
export interface GenerationSettings {
  width: number;
  height: number;
  transparent: boolean;
  style: string;
  influence: number;
  model: string;
  provider: "stability" | "gemini";  // NEW
  autoEnhance: boolean;              // NEW
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  width: 512,
  height: 512,
  transparent: true,
  style: "pixel-art",
  influence: 0.7,
  model: "imagen-3",      // CHANGED from "sdxl"
  provider: "gemini",      // NEW
  autoEnhance: true,       // NEW
};
```

## 6. Files Changed

| File | Action |
|------|--------|
| `src/lib/types.ts` | Add `provider`, `autoEnhance`, update defaults |
| `src/lib/gemini.ts` | NEW — Gemini API calls |
| `src/lib/prompt-enhancer.ts` | NEW — style-based prompt enhancement |
| `src/lib/stability.ts` | No changes |
| `src/app/api/generate/route.ts` | Add provider dispatch + prompt enhancement |
| `src/app/api/generate/img2img/route.ts` | Add provider dispatch + prompt enhancement |
| `src/app/api/generate/variations/route.ts` | Add provider dispatch + prompt enhancement |
| `src/components/generation-settings.tsx` | Grouped model dropdown, auto-enhance toggle |
| `.env.local` | Add `GEMINI_API_KEY` |
| `package.json` | Add `@google/generative-ai` dependency |

## 7. No Changes To

- Storage format, history JSON shape, gallery API, style guides, sprite sheets
- `GeneratedAsset` interface — unchanged, `settings` just gains new fields
- Image post-processing pipeline — both providers output PNG buffers
