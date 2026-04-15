# Gemini Provider + Prompt Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Gemini (Imagen 3) as an alternative image generation provider alongside Stability AI, and add automatic prompt enhancement that injects style-appropriate keywords and negative prompts.

**Architecture:** Provider-agnostic generation — API routes dispatch to the correct provider based on `settings.provider`. A prompt enhancer preprocesses prompts before they reach any provider. Both providers output PNG buffers that flow through the existing post-processing pipeline.

**Tech Stack:** Next.js 14, TypeScript, `@google/generative-ai` SDK, Google Imagen REST API, Sharp

---

### Task 1: Update Types and Defaults

**Files:**
- Modify: `src/lib/types.ts:1-66`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/types.test.ts`:

```typescript
import { DEFAULT_SETTINGS, STYLE_PRESETS, MODEL_OPTIONS } from "../types";

describe("types", () => {
  test("DEFAULT_SETTINGS includes provider and autoEnhance", () => {
    expect(DEFAULT_SETTINGS.provider).toBe("gemini");
    expect(DEFAULT_SETTINGS.autoEnhance).toBe(true);
    expect(DEFAULT_SETTINGS.model).toBe("imagen-3");
  });

  test("MODEL_OPTIONS maps models to providers", () => {
    expect(MODEL_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "imagen-3", provider: "gemini" }),
        expect.objectContaining({ id: "imagen-3-fast", provider: "gemini" }),
        expect.objectContaining({ id: "gemini-2.0-flash", provider: "gemini" }),
        expect.objectContaining({ id: "sdxl", provider: "stability" }),
        expect.objectContaining({ id: "sd3", provider: "stability" }),
      ])
    );
  });

  test("STYLE_PRESETS unchanged", () => {
    expect(STYLE_PRESETS).toContain("pixel-art");
    expect(STYLE_PRESETS).toContain("hand-drawn");
    expect(STYLE_PRESETS).toContain("flat-vector");
    expect(STYLE_PRESETS).toContain("realistic");
    expect(STYLE_PRESETS).toContain("custom");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/types.test.ts -v`
Expected: FAIL — `MODEL_OPTIONS` not exported

- [ ] **Step 3: Write implementation**

Update `src/lib/types.ts` to:

```typescript
export interface GenerationSettings {
  width: number;
  height: number;
  transparent: boolean;
  style: string;
  influence: number;
  model: string;
  provider: "stability" | "gemini";
  autoEnhance: boolean;
}

export interface GeneratedAsset {
  id: string;
  prompt: string;
  referenceImagePath?: string;
  styleGuideId?: string;
  settings: GenerationSettings;
  outputPath: string;
  thumbnailPath: string;
  createdAt: string;
}

export interface StyleGuide {
  id: string;
  name: string;
  referenceImages: string[];
  defaultPromptPrefix: string;
  defaultSettings: {
    style: string;
    influence: number;
  };
  createdAt: string;
}

export interface SpriteSheet {
  id: string;
  name: string;
  assets: string[];
  grid: {
    columns: number;
    rows: number;
    frameWidth: number;
    frameHeight: number;
    padding: number;
  };
  outputPath: string;
  createdAt: string;
}

export const STYLE_PRESETS = [
  "pixel-art",
  "hand-drawn",
  "flat-vector",
  "realistic",
  "custom",
] as const;

export type StylePreset = (typeof STYLE_PRESETS)[number];

export interface ModelOption {
  id: string;
  label: string;
  provider: "stability" | "gemini";
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "imagen-3", label: "Gemini: Imagen 3", provider: "gemini" },
  { id: "imagen-3-fast", label: "Gemini: Imagen 3 Fast", provider: "gemini" },
  { id: "gemini-2.0-flash", label: "Gemini: Gemini 2.0 Flash", provider: "gemini" },
  { id: "sdxl", label: "Stability: SDXL", provider: "stability" },
  { id: "sd3", label: "Stability: SD3", provider: "stability" },
];

export const DEFAULT_SETTINGS: GenerationSettings = {
  width: 512,
  height: 512,
  transparent: true,
  style: "pixel-art",
  influence: 0.7,
  model: "imagen-3",
  provider: "gemini",
  autoEnhance: true,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/types.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/__tests__/types.test.ts
git commit -m "feat: add provider, autoEnhance, and MODEL_OPTIONS to types"
```

---

### Task 2: Create Prompt Enhancer

**Files:**
- Create: `src/lib/prompt-enhancer.ts`
- Create: `src/lib/__tests__/prompt-enhancer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/prompt-enhancer.test.ts`:

```typescript
import { enhancePrompt } from "../prompt-enhancer";

describe("enhancePrompt", () => {
  test("prepends style keywords when autoEnhance is true", () => {
    const result = enhancePrompt("a warrior", "hand-drawn", true);
    expect(result.prompt).toBe(
      "hand-drawn illustration, ink lines, sketch style, traditional art, a warrior"
    );
    expect(result.negativePrompt).toBe(
      "photorealistic, 3D render, photograph, hyper-realistic, CGI"
    );
  });

  test("returns raw prompt when autoEnhance is false", () => {
    const result = enhancePrompt("a warrior", "hand-drawn", false);
    expect(result.prompt).toBe("a warrior");
    expect(result.negativePrompt).toBeUndefined();
  });

  test("pixel-art style enhancement", () => {
    const result = enhancePrompt("sword icon", "pixel-art", true);
    expect(result.prompt).toContain("pixel art");
    expect(result.prompt).toContain("sword icon");
    expect(result.negativePrompt).toContain("photorealistic");
  });

  test("flat-vector style enhancement", () => {
    const result = enhancePrompt("shield", "flat-vector", true);
    expect(result.prompt).toContain("flat vector art");
    expect(result.negativePrompt).toContain("textured");
  });

  test("realistic style enhancement", () => {
    const result = enhancePrompt("dragon", "realistic", true);
    expect(result.prompt).toContain("highly detailed");
    expect(result.negativePrompt).toContain("cartoon");
  });

  test("custom style returns prompt unchanged even with autoEnhance", () => {
    const result = enhancePrompt("my custom thing", "custom", true);
    expect(result.prompt).toBe("my custom thing");
    expect(result.negativePrompt).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/prompt-enhancer.test.ts -v`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/lib/prompt-enhancer.ts`:

```typescript
interface EnhancedPrompt {
  prompt: string;
  negativePrompt?: string;
}

const STYLE_ENHANCEMENTS: Record<string, { keywords: string; negative: string }> = {
  "pixel-art": {
    keywords: "pixel art, 16-bit sprite, clean pixels, game asset",
    negative: "photorealistic, blurry, smooth gradients, 3D render",
  },
  "hand-drawn": {
    keywords: "hand-drawn illustration, ink lines, sketch style, traditional art",
    negative: "photorealistic, 3D render, photograph, hyper-realistic, CGI",
  },
  "flat-vector": {
    keywords: "flat vector art, clean shapes, solid colors, minimal shading",
    negative: "photorealistic, textured, 3D, gradients, noisy",
  },
  "realistic": {
    keywords: "highly detailed, realistic rendering, game asset",
    negative: "cartoon, sketch, pixel art, low quality",
  },
};

export function enhancePrompt(
  prompt: string,
  style: string,
  autoEnhance: boolean
): EnhancedPrompt {
  if (!autoEnhance) {
    return { prompt };
  }

  const enhancement = STYLE_ENHANCEMENTS[style];
  if (!enhancement) {
    return { prompt };
  }

  return {
    prompt: `${enhancement.keywords}, ${prompt}`,
    negativePrompt: enhancement.negative,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/prompt-enhancer.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompt-enhancer.ts src/lib/__tests__/prompt-enhancer.test.ts
git commit -m "feat: add prompt enhancer with style-based keywords and negative prompts"
```

---

### Task 3: Create Gemini API Module

**Files:**
- Create: `src/lib/gemini.ts`
- Create: `src/lib/__tests__/gemini.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/gemini.test.ts`:

```typescript
import { buildImagenPayload, getImagenEndpoint, GEMINI_MODELS } from "../gemini";

describe("gemini", () => {
  test("GEMINI_MODELS contains all three models", () => {
    expect(GEMINI_MODELS).toEqual({
      "imagen-3": "imagen-3.0-generate-002",
      "imagen-3-fast": "imagen-3.0-generate-001",
      "gemini-2.0-flash": "gemini-2.0-flash-exp",
    });
  });

  test("getImagenEndpoint returns correct URL for imagen-3", () => {
    const url = getImagenEndpoint("imagen-3", "test-key");
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=test-key"
    );
  });

  test("getImagenEndpoint returns correct URL for imagen-3-fast", () => {
    const url = getImagenEndpoint("imagen-3-fast", "test-key");
    expect(url).toContain("imagen-3.0-generate-001");
  });

  test("buildImagenPayload creates correct structure", () => {
    const payload = buildImagenPayload({
      prompt: "a sword",
      negativePrompt: "blurry",
      aspectRatio: "1:1",
    });
    expect(payload).toEqual({
      instances: [{ prompt: "a sword" }],
      parameters: {
        sampleCount: 1,
        negativePrompt: "blurry",
        aspectRatio: "1:1",
      },
    });
  });

  test("buildImagenPayload omits negativePrompt when undefined", () => {
    const payload = buildImagenPayload({
      prompt: "a sword",
      aspectRatio: "1:1",
    });
    expect(payload.parameters.negativePrompt).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/gemini.test.ts -v`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/lib/gemini.ts`:

```typescript
export const GEMINI_MODELS: Record<string, string> = {
  "imagen-3": "imagen-3.0-generate-002",
  "imagen-3-fast": "imagen-3.0-generate-001",
  "gemini-2.0-flash": "gemini-2.0-flash-exp",
};

export function getImagenEndpoint(model: string, apiKey: string): string {
  const modelId = GEMINI_MODELS[model];
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${apiKey}`;
}

export function buildImagenPayload(params: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
}): Record<string, unknown> {
  return {
    instances: [{ prompt: params.prompt }],
    parameters: {
      sampleCount: 1,
      negativePrompt: params.negativePrompt,
      aspectRatio: params.aspectRatio,
    },
  };
}

export async function callGeminiImagen(params: {
  prompt: string;
  negativePrompt?: string;
  model: string;
  width: number;
  height: number;
  apiKey: string;
}): Promise<Buffer> {
  const aspectRatio = getAspectRatio(params.width, params.height);
  const endpoint = getImagenEndpoint(params.model, params.apiKey);
  const payload = buildImagenPayload({
    prompt: params.prompt,
    negativePrompt: params.negativePrompt,
    aspectRatio,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Imagen error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const base64 = data.predictions[0].bytesBase64Encoded;
  return Buffer.from(base64, "base64");
}

export async function callGeminiFlash(params: {
  prompt: string;
  apiKey: string;
}): Promise<Buffer> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: params.prompt }] }],
    generationConfig: { responseMimeType: "image/png" } as never,
  });

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("Gemini Flash returned no image parts");
  }

  const imagePart = parts.find(
    (p: Record<string, unknown>) => p.inlineData
  ) as { inlineData: { data: string } } | undefined;

  if (!imagePart) {
    throw new Error("Gemini Flash returned no inline image data");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

function getAspectRatio(width: number, height: number): string {
  if (width === height) return "1:1";
  if (width / height >= 1.7) return "16:9";
  if (width / height >= 1.3) return "4:3";
  if (height / width >= 1.7) return "9:16";
  if (height / width >= 1.3) return "3:4";
  return "1:1";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/gemini.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/gemini.ts src/lib/__tests__/gemini.test.ts
git commit -m "feat: add Gemini API module with Imagen and Flash support"
```

---

### Task 4: Install `@google/generative-ai` Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `npm install @google/generative-ai`

- [ ] **Step 2: Verify installation**

Run: `npx jest src/lib/__tests__/gemini.test.ts -v`
Expected: PASS (no import errors)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @google/generative-ai dependency"
```

---

### Task 5: Update Text-to-Image API Route

**Files:**
- Modify: `src/app/api/generate/route.ts:1-59`

- [ ] **Step 1: Update the route with provider dispatch and prompt enhancement**

Replace `src/app/api/generate/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { callStabilityApi, buildTextToImagePayload, STABILITY_ENDPOINTS } from "@/lib/stability";
import { callGeminiImagen, callGeminiFlash } from "@/lib/gemini";
import { enhancePrompt } from "@/lib/prompt-enhancer";
import { resizeImage, removeBackground, generateThumbnail } from "@/lib/image-processing";
import { appendToJsonArray, PATHS } from "@/lib/storage";
import { GeneratedAsset } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, settings } = body;

  const enhanced = enhancePrompt(prompt, settings.style, settings.autoEnhance ?? true);

  let imageBuffer: Buffer;

  if (settings.provider === "stability") {
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "STABILITY_API_KEY not configured" }, { status: 500 });
    }

    const formData = buildTextToImagePayload({
      prompt: enhanced.prompt,
      width: settings.width,
      height: settings.height,
      style: settings.style,
      negativePrompt: enhanced.negativePrompt,
    });

    const endpoint = STABILITY_ENDPOINTS.textToImage(settings.model);
    imageBuffer = await callStabilityApi(endpoint, formData, apiKey);
  } else {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    if (settings.model === "gemini-2.0-flash") {
      imageBuffer = await callGeminiFlash({
        prompt: enhanced.prompt,
        apiKey,
      });
    } else {
      imageBuffer = await callGeminiImagen({
        prompt: enhanced.prompt,
        negativePrompt: enhanced.negativePrompt,
        model: settings.model || "imagen-3",
        width: settings.width,
        height: settings.height,
        apiKey,
      });
    }
  }

  if (settings.width || settings.height) {
    imageBuffer = await resizeImage(imageBuffer, settings.width, settings.height);
  }

  if (settings.transparent) {
    imageBuffer = await removeBackground(imageBuffer);
  }

  await fs.mkdir(PATHS.outputs, { recursive: true });

  const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${id}.png`;
  const thumbFilename = `${id}-thumb.png`;

  await fs.writeFile(path.join(PATHS.outputs, filename), imageBuffer);

  const thumbnail = await generateThumbnail(imageBuffer);
  await fs.writeFile(path.join(PATHS.outputs, thumbFilename), thumbnail);

  const asset: GeneratedAsset = {
    id,
    prompt,
    settings,
    outputPath: `/outputs/${filename}`,
    thumbnailPath: `/outputs/${thumbFilename}`,
    createdAt: new Date().toISOString(),
  };

  await appendToJsonArray(PATHS.history, asset);

  return NextResponse.json(asset);
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors related to the generate route

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: add provider dispatch and prompt enhancement to text-to-image route"
```

---

### Task 6: Update Image-to-Image API Route

**Files:**
- Modify: `src/app/api/generate/img2img/route.ts:1-73`

- [ ] **Step 1: Update the route with provider dispatch and prompt enhancement**

Replace `src/app/api/generate/img2img/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { callStabilityApi, buildImg2ImgPayload, STABILITY_ENDPOINTS } from "@/lib/stability";
import { callGeminiImagen } from "@/lib/gemini";
import { enhancePrompt } from "@/lib/prompt-enhancer";
import { resizeImage, removeBackground, generateThumbnail } from "@/lib/image-processing";
import { appendToJsonArray, PATHS } from "@/lib/storage";
import { GeneratedAsset } from "@/lib/types";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const prompt = formData.get("prompt") as string;
  const settingsJson = formData.get("settings") as string;
  const referenceFile = formData.get("reference") as File | null;

  if (!prompt || !referenceFile) {
    return NextResponse.json({ error: "prompt and reference image required" }, { status: 400 });
  }

  const settings = JSON.parse(settingsJson);
  const enhanced = enhancePrompt(prompt, settings.style, settings.autoEnhance ?? true);

  const refBytes = await referenceFile.arrayBuffer();
  const refBuffer = Buffer.from(refBytes);

  let imageBuffer: Buffer;

  if (settings.provider === "stability") {
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "STABILITY_API_KEY not configured" }, { status: 500 });
    }

    const payload = buildImg2ImgPayload({
      prompt: enhanced.prompt,
      image: refBuffer,
      strength: settings.influence,
      negativePrompt: enhanced.negativePrompt,
    });

    const endpoint = STABILITY_ENDPOINTS.img2img();
    imageBuffer = await callStabilityApi(endpoint, payload, apiKey);
  } else {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // Gemini Imagen: use text-to-image with enhanced prompt referencing the style
    // Imagen API doesn't have a direct img2img — we use the prompt to guide style
    imageBuffer = await callGeminiImagen({
      prompt: enhanced.prompt,
      negativePrompt: enhanced.negativePrompt,
      model: settings.model || "imagen-3",
      width: settings.width,
      height: settings.height,
      apiKey,
    });
  }

  if (settings.width || settings.height) {
    imageBuffer = await resizeImage(imageBuffer, settings.width, settings.height);
  }

  if (settings.transparent) {
    imageBuffer = await removeBackground(imageBuffer);
  }

  await fs.mkdir(PATHS.outputs, { recursive: true });

  const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${id}.png`;
  const thumbFilename = `${id}-thumb.png`;

  // Save reference image
  await fs.mkdir(PATHS.references, { recursive: true });
  const refFilename = `ref-${id}.png`;
  await fs.writeFile(path.join(PATHS.references, refFilename), refBuffer);

  await fs.writeFile(path.join(PATHS.outputs, filename), imageBuffer);
  const thumbnail = await generateThumbnail(imageBuffer);
  await fs.writeFile(path.join(PATHS.outputs, thumbFilename), thumbnail);

  const asset: GeneratedAsset = {
    id,
    prompt,
    referenceImagePath: `/references/${refFilename}`,
    settings,
    outputPath: `/outputs/${filename}`,
    thumbnailPath: `/outputs/${thumbFilename}`,
    createdAt: new Date().toISOString(),
  };

  await appendToJsonArray(PATHS.history, asset);

  return NextResponse.json(asset);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/generate/img2img/route.ts
git commit -m "feat: add provider dispatch and prompt enhancement to img2img route"
```

---

### Task 7: Update Variations API Route

**Files:**
- Modify: `src/app/api/generate/variations/route.ts:1-73`

- [ ] **Step 1: Update the route with provider dispatch**

Replace `src/app/api/generate/variations/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { callStabilityApi, buildImg2ImgPayload, STABILITY_ENDPOINTS } from "@/lib/stability";
import { callGeminiImagen } from "@/lib/gemini";
import { enhancePrompt } from "@/lib/prompt-enhancer";
import { resizeImage, removeBackground, generateThumbnail } from "@/lib/image-processing";
import { appendToJsonArray, readJsonFile, PATHS } from "@/lib/storage";
import { GeneratedAsset } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { assetId, count = 4 } = body;

  const history = await readJsonFile<GeneratedAsset[]>(PATHS.history, []);
  const sourceAsset = history.find((a) => a.id === assetId);

  if (!sourceAsset) {
    return NextResponse.json({ error: "Source asset not found" }, { status: 404 });
  }

  const sourcePath = path.join(process.cwd(), "public", sourceAsset.outputPath);
  const sourceBuffer = await fs.readFile(sourcePath);

  const enhanced = enhancePrompt(
    sourceAsset.prompt,
    sourceAsset.settings.style,
    sourceAsset.settings.autoEnhance ?? true
  );

  const results: GeneratedAsset[] = [];

  for (let i = 0; i < count; i++) {
    let imageBuffer: Buffer;

    if (sourceAsset.settings.provider === "stability") {
      const apiKey = process.env.STABILITY_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "STABILITY_API_KEY not configured" }, { status: 500 });
      }

      const payload = buildImg2ImgPayload({
        prompt: enhanced.prompt,
        image: sourceBuffer,
        strength: 0.3 + Math.random() * 0.3,
        negativePrompt: enhanced.negativePrompt,
      });

      const endpoint = STABILITY_ENDPOINTS.img2img();
      imageBuffer = await callStabilityApi(endpoint, payload, apiKey);
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
      }

      imageBuffer = await callGeminiImagen({
        prompt: enhanced.prompt,
        negativePrompt: enhanced.negativePrompt,
        model: sourceAsset.settings.model || "imagen-3",
        width: sourceAsset.settings.width,
        height: sourceAsset.settings.height,
        apiKey,
      });
    }

    if (sourceAsset.settings.width || sourceAsset.settings.height) {
      imageBuffer = await resizeImage(imageBuffer, sourceAsset.settings.width, sourceAsset.settings.height);
    }

    if (sourceAsset.settings.transparent) {
      imageBuffer = await removeBackground(imageBuffer);
    }

    await fs.mkdir(PATHS.outputs, { recursive: true });

    const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${id}.png`;
    const thumbFilename = `${id}-thumb.png`;

    await fs.writeFile(path.join(PATHS.outputs, filename), imageBuffer);
    const thumbnail = await generateThumbnail(imageBuffer);
    await fs.writeFile(path.join(PATHS.outputs, thumbFilename), thumbnail);

    const asset: GeneratedAsset = {
      id,
      prompt: sourceAsset.prompt,
      referenceImagePath: sourceAsset.outputPath,
      settings: sourceAsset.settings,
      outputPath: `/outputs/${filename}`,
      thumbnailPath: `/outputs/${thumbFilename}`,
      createdAt: new Date().toISOString(),
    };

    await appendToJsonArray(PATHS.history, asset);
    results.push(asset);
  }

  return NextResponse.json(results);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/generate/variations/route.ts
git commit -m "feat: add provider dispatch and prompt enhancement to variations route"
```

---

### Task 8: Update Generation Settings UI

**Files:**
- Modify: `src/components/generation-settings.tsx:1-99`

- [ ] **Step 1: Update the component with grouped model dropdown and auto-enhance toggle**

Replace `src/components/generation-settings.tsx` with:

```tsx
"use client";

import { GenerationSettings as Settings, STYLE_PRESETS, StyleGuide, MODEL_OPTIONS } from "@/lib/types";

interface GenerationSettingsProps {
  settings: Settings;
  onUpdate: (partial: Partial<Settings>) => void;
  styleGuides: StyleGuide[];
  selectedStyleGuideId: string | null;
  onSelectStyleGuide: (id: string | null) => void;
}

export function GenerationSettings({
  settings,
  onUpdate,
  styleGuides,
  selectedStyleGuideId,
  onSelectStyleGuide,
}: GenerationSettingsProps) {
  const handleModelChange = (modelId: string) => {
    const option = MODEL_OPTIONS.find((m) => m.id === modelId);
    if (option) {
      onUpdate({ model: modelId, provider: option.provider });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={settings.model}
        onChange={(e) => handleModelChange(e.target.value)}
        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)]"
      >
        <optgroup label="Gemini">
          {MODEL_OPTIONS.filter((m) => m.provider === "gemini").map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Stability AI">
          {MODEL_OPTIONS.filter((m) => m.provider === "stability").map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </optgroup>
      </select>

      <select
        value={settings.style}
        onChange={(e) => onUpdate({ style: e.target.value })}
        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)]"
      >
        {STYLE_PRESETS.map((s) => (
          <option key={s} value={s}>
            {s.replace("-", " ")}
          </option>
        ))}
      </select>

      <input
        type="number"
        value={settings.width}
        onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 512 })}
        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs w-20 text-[var(--foreground)]"
        placeholder="Width"
      />
      <span className="text-[var(--muted)] text-xs self-center">x</span>
      <input
        type="number"
        value={settings.height}
        onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 512 })}
        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs w-20 text-[var(--foreground)]"
        placeholder="Height"
      />

      <label className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={settings.transparent}
          onChange={(e) => onUpdate({ transparent: e.target.checked })}
          className="rounded"
        />
        <span className="text-[var(--foreground)]">Transparent</span>
      </label>

      <label className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={settings.autoEnhance ?? true}
          onChange={(e) => onUpdate({ autoEnhance: e.target.checked })}
          className="rounded"
        />
        <span className="text-[var(--foreground)]">Auto-enhance</span>
      </label>

      <div className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs">
        <span className="text-[var(--muted)]">Influence:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.influence}
          onChange={(e) => onUpdate({ influence: parseFloat(e.target.value) })}
          className="w-20"
        />
        <span className="text-[var(--foreground)] w-6">{settings.influence}</span>
      </div>

      {styleGuides.length > 0 && (
        <select
          value={selectedStyleGuideId || ""}
          onChange={(e) => onSelectStyleGuide(e.target.value || null)}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)]"
        >
          <option value="">No style guide</option>
          {styleGuides.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/generation-settings.tsx
git commit -m "feat: add grouped model dropdown and auto-enhance toggle to settings UI"
```

---

### Task 9: Add GEMINI_API_KEY to Environment

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add the environment variable**

Add to `.env.local`:

```
GEMINI_API_KEY=your-gemini-api-key-here
```

- [ ] **Step 2: Verify the app starts**

Run: `npm run dev` and test a generation with a Gemini model selected.

- [ ] **Step 3: Commit (do NOT commit .env.local)**

No commit for this step — `.env.local` should not be committed.

---

### Task 10: Verify Full Integration

- [ ] **Step 1: Run all tests**

Run: `npx jest --verbose`
Expected: All tests pass

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: No errors

- [ ] **Step 3: Manual smoke test**

1. Start dev server: `npm run dev`
2. Go to generate page
3. Select "Gemini: Imagen 3" model — verify provider auto-sets to gemini
4. Select "hand-drawn" style with auto-enhance ON — generate an asset
5. Verify the result looks hand-drawn, not realistic
6. Toggle auto-enhance OFF — generate again — compare results
7. Switch to "Stability: SDXL" — generate — verify it still works
8. Test variations on a Gemini-generated asset

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Gemini provider integration with prompt enhancement"
```
