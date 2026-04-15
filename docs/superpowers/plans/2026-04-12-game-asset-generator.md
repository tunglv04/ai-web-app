# Game Asset Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal Next.js web tool for generating 2D game assets using Stability AI with reference images, style guides, and sprite sheet composition.

**Architecture:** Monolithic Next.js 14 App Router application. API route handlers call Stability AI REST API and Sharp for image processing. Local filesystem + JSON files for storage. No auth, no database.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Sharp, zustand, react-dropzone, lucide-react

---

## File Structure

```
src/
  app/
    layout.tsx              — root layout with sidebar
    page.tsx                — redirect to /generate
    generate/
      page.tsx              — main generation workspace
    gallery/
      page.tsx              — asset gallery with filtering
    style-guides/
      page.tsx              — style guide management
    sprite-sheets/
      page.tsx              — sprite sheet composer
    settings/
      page.tsx              — API key + default presets
    api/
      generate/
        route.ts            — text-to-image generation
        img2img/
          route.ts          — reference-based generation
        variations/
          route.ts          — generate variations
      process/
        route.ts            — resize, background removal
      spritesheet/
        route.ts            — compose sprite sheets
      styleguide/
        route.ts            — CRUD style guides
      gallery/
        route.ts            — list/filter assets
      upload/
        route.ts            — handle reference image uploads
  lib/
    stability.ts            — Stability AI API client
    storage.ts              — JSON file read/write helpers
    image-processing.ts     — Sharp wrappers (resize, alpha, sprite sheet)
    types.ts                — shared TypeScript interfaces
  components/
    sidebar.tsx             — navigation sidebar
    prompt-editor.tsx       — text prompt input with style presets
    reference-upload.tsx    — drag-and-drop reference image upload
    generation-settings.tsx — settings panel (size, style, transparency, etc.)
    asset-card.tsx          — single asset display in grid
    asset-grid.tsx          — grid of asset cards
    asset-detail-modal.tsx  — detail view with actions
    sprite-sheet-preview.tsx — sprite sheet grid previewer
    style-guide-card.tsx    — style guide display card
  store/
    app-store.ts            — zustand store (history, style guides, UI state)
data/
  history.json              — generation history
  styleguides.json          — saved style guides
  spritesheets.json         — saved sprite sheets
public/
  outputs/                  — generated asset images
  references/               — uploaded reference images
```

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`, `.env.local`, `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --no-import-alias
```
Expected: Project scaffold created with Next.js 14, TypeScript, Tailwind, App Router.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install sharp zustand react-dropzone lucide-react
npm install -D @types/node
```
Expected: All dependencies installed.

- [ ] **Step 3: Create environment file**

Create `.env.local`:
```
STABILITY_API_KEY=your-api-key-here
```

- [ ] **Step 4: Create data directories and seed files**

Run:
```bash
mkdir -p data public/outputs public/references
```

Create `data/history.json`:
```json
[]
```

Create `data/styleguides.json`:
```json
[]
```

Create `data/spritesheets.json`:
```json
[]
```

- [ ] **Step 5: Configure Tailwind for dark theme**

Update `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 6: Set up global styles**

Replace `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0a;
  --foreground: #f1f5f9;
  --sidebar-bg: #0f172a;
  --card-bg: #1e293b;
  --border: #334155;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --muted: #64748b;
  --success: #34d399;
  --warning: #fbbf24;
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

- [ ] **Step 7: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts on http://localhost:3000 without errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with dependencies and config"
```

---

### Task 2: Shared Types & Storage Library

**Files:**
- Create: `src/lib/types.ts`, `src/lib/storage.ts`
- Test: `src/lib/__tests__/storage.test.ts`

- [ ] **Step 1: Write the failing test for storage**

Create `src/lib/__tests__/storage.test.ts`:
```typescript
import { readJsonFile, writeJsonFile, appendToJsonArray } from "../storage";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

describe("storage", () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "storage-test-"));
    tempFile = path.join(tempDir, "test.json");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  test("readJsonFile returns default when file does not exist", async () => {
    const result = await readJsonFile(tempFile, []);
    expect(result).toEqual([]);
  });

  test("writeJsonFile writes and readJsonFile reads back", async () => {
    const data = [{ id: "1", name: "test" }];
    await writeJsonFile(tempFile, data);
    const result = await readJsonFile(tempFile, []);
    expect(result).toEqual(data);
  });

  test("appendToJsonArray appends item to array file", async () => {
    await writeJsonFile(tempFile, [{ id: "1" }]);
    await appendToJsonArray(tempFile, { id: "2" });
    const result = await readJsonFile(tempFile, []);
    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
  });

  test("appendToJsonArray creates file if missing", async () => {
    await appendToJsonArray(tempFile, { id: "1" });
    const result = await readJsonFile(tempFile, []);
    expect(result).toEqual([{ id: "1" }]);
  });
});
```

- [ ] **Step 2: Install Jest and run test to verify it fails**

Run:
```bash
npm install -D jest ts-jest @types/jest
npx ts-jest config:init
```

Run: `npx jest src/lib/__tests__/storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create shared types**

Create `src/lib/types.ts`:
```typescript
export interface GenerationSettings {
  width: number;
  height: number;
  transparent: boolean;
  style: string;
  influence: number;
  model: string;
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

export const DEFAULT_SETTINGS: GenerationSettings = {
  width: 512,
  height: 512,
  transparent: true,
  style: "pixel-art",
  influence: 0.7,
  model: "sdxl",
};
```

- [ ] **Step 4: Implement storage library**

Create `src/lib/storage.ts`:
```typescript
import { promises as fs } from "fs";
import path from "path";

export async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function appendToJsonArray<T>(filePath: string, item: T): Promise<void> {
  const existing = await readJsonFile<T[]>(filePath, []);
  existing.push(item);
  await writeJsonFile(filePath, existing);
}

const DATA_DIR = path.join(process.cwd(), "data");

export const PATHS = {
  history: path.join(DATA_DIR, "history.json"),
  styleguides: path.join(DATA_DIR, "styleguides.json"),
  spritesheets: path.join(DATA_DIR, "spritesheets.json"),
  outputs: path.join(process.cwd(), "public", "outputs"),
  references: path.join(process.cwd(), "public", "references"),
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/storage.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/storage.ts src/lib/__tests__/storage.test.ts jest.config.ts
git commit -m "feat: add shared types and storage library with tests"
```

---

### Task 3: Stability AI Client

**Files:**
- Create: `src/lib/stability.ts`
- Test: `src/lib/__tests__/stability.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/stability.test.ts`:
```typescript
import { buildTextToImagePayload, buildImg2ImgPayload, STABILITY_ENDPOINTS } from "../stability";

describe("stability", () => {
  test("STABILITY_ENDPOINTS has correct base URL", () => {
    expect(STABILITY_ENDPOINTS.textToImage("sdxl")).toContain(
      "https://api.stability.ai"
    );
  });

  test("buildTextToImagePayload creates correct FormData fields", () => {
    const payload = buildTextToImagePayload({
      prompt: "pixel art sword",
      width: 512,
      height: 512,
      style: "pixel-art",
    });
    expect(payload.get("prompt")).toBe("pixel art sword");
    expect(payload.get("output_format")).toBe("png");
  });

  test("buildImg2ImgPayload includes image and strength", () => {
    const imageBuffer = Buffer.from("fake-image");
    const payload = buildImg2ImgPayload({
      prompt: "make it blue",
      image: imageBuffer,
      strength: 0.7,
    });
    expect(payload.get("prompt")).toBe("make it blue");
    expect(payload.get("strength")).toBe("0.7");
    expect(payload.get("image")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/stability.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Stability AI client**

Create `src/lib/stability.ts`:
```typescript
export const STABILITY_ENDPOINTS = {
  textToImage: (model: string) =>
    `https://api.stability.ai/v2beta/stable-image/generate/${model === "sd3" ? "sd3" : "core"}`,
  img2img: () =>
    `https://api.stability.ai/v2beta/stable-image/generate/core`,
  upscale: () =>
    `https://api.stability.ai/v2beta/stable-image/upscale/fast`,
  removeBackground: () =>
    `https://api.stability.ai/v2beta/stable-image/edit/remove-background`,
};

export function buildTextToImagePayload(params: {
  prompt: string;
  width: number;
  height: number;
  style: string;
  negativePrompt?: string;
}): FormData {
  const formData = new FormData();
  formData.append("prompt", params.prompt);
  formData.append("output_format", "png");
  if (params.negativePrompt) {
    formData.append("negative_prompt", params.negativePrompt);
  }
  return formData;
}

export function buildImg2ImgPayload(params: {
  prompt: string;
  image: Buffer;
  strength: number;
  negativePrompt?: string;
}): FormData {
  const formData = new FormData();
  formData.append("prompt", params.prompt);
  formData.append("image", new Blob([params.image]), "reference.png");
  formData.append("strength", params.strength.toString());
  formData.append("output_format", "png");
  if (params.negativePrompt) {
    formData.append("negative_prompt", params.negativePrompt);
  }
  return formData;
}

export async function callStabilityApi(
  endpoint: string,
  formData: FormData,
  apiKey: string
): Promise<Buffer> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stability AI error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/stability.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stability.ts src/lib/__tests__/stability.test.ts
git commit -m "feat: add Stability AI client with endpoint helpers"
```

---

### Task 4: Image Processing Library

**Files:**
- Create: `src/lib/image-processing.ts`
- Test: `src/lib/__tests__/image-processing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/image-processing.test.ts`:
```typescript
import { resizeImage, removeBackground, composeSpriteSheet } from "../image-processing";
import sharp from "sharp";

describe("image-processing", () => {
  let testPng: Buffer;

  beforeAll(async () => {
    testPng = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();
  });

  test("resizeImage resizes to target dimensions", async () => {
    const resized = await resizeImage(testPng, 32, 32);
    const meta = await sharp(resized).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);
  });

  test("removeBackground returns PNG with alpha channel", async () => {
    const result = await removeBackground(testPng);
    const meta = await sharp(result).metadata();
    expect(meta.channels).toBe(4);
    expect(meta.format).toBe("png");
  });

  test("composeSpriteSheet creates correct grid dimensions", async () => {
    const images = [testPng, testPng, testPng, testPng];
    const result = await composeSpriteSheet(images, {
      columns: 2,
      rows: 2,
      frameWidth: 64,
      frameHeight: 64,
      padding: 0,
    });
    const meta = await sharp(result).metadata();
    expect(meta.width).toBe(128);
    expect(meta.height).toBe(128);
  });

  test("composeSpriteSheet respects padding", async () => {
    const images = [testPng, testPng, testPng, testPng];
    const result = await composeSpriteSheet(images, {
      columns: 2,
      rows: 2,
      frameWidth: 64,
      frameHeight: 64,
      padding: 4,
    });
    const meta = await sharp(result).metadata();
    expect(meta.width).toBe(128 + 4);   // 2*64 + 1*4 (padding between)
    expect(meta.height).toBe(128 + 4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/image-processing.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement image processing library**

Create `src/lib/image-processing.ts`:
```typescript
import sharp from "sharp";

export async function resizeImage(
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(imageBuffer).resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  // Ensures the image has an alpha channel.
  // For actual AI-powered background removal, use Stability AI's remove-background endpoint.
  // This function is the local fallback that just ensures PNG with alpha.
  return sharp(imageBuffer).ensureAlpha().png().toBuffer();
}

export async function composeSpriteSheet(
  images: Buffer[],
  grid: {
    columns: number;
    rows: number;
    frameWidth: number;
    frameHeight: number;
    padding: number;
  }
): Promise<Buffer> {
  const { columns, rows, frameWidth, frameHeight, padding } = grid;
  const totalWidth = columns * frameWidth + (columns - 1) * padding;
  const totalHeight = rows * frameHeight + (rows - 1) * padding;

  const resizedImages = await Promise.all(
    images.map((img) => resizeImage(img, frameWidth, frameHeight))
  );

  const composites = resizedImages.map((img, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      input: img,
      left: col * (frameWidth + padding),
      top: row * (frameHeight + padding),
    };
  });

  return sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

export async function generateThumbnail(
  imageBuffer: Buffer,
  size: number = 256
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/image-processing.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/image-processing.ts src/lib/__tests__/image-processing.test.ts
git commit -m "feat: add image processing library (resize, alpha, sprite sheets)"
```

---

### Task 5: Zustand Store

**Files:**
- Create: `src/store/app-store.ts`
- Test: `src/store/__tests__/app-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/app-store.test.ts`:
```typescript
import { useAppStore } from "../app-store";
import { GeneratedAsset, StyleGuide, DEFAULT_SETTINGS } from "../../lib/types";

describe("app-store", () => {
  beforeEach(() => {
    useAppStore.setState({
      assets: [],
      styleGuides: [],
      settings: { ...DEFAULT_SETTINGS },
      isGenerating: false,
    });
  });

  test("addAsset adds to beginning of assets array", () => {
    const asset: GeneratedAsset = {
      id: "1",
      prompt: "test",
      settings: DEFAULT_SETTINGS,
      outputPath: "/outputs/1.png",
      thumbnailPath: "/outputs/1-thumb.png",
      createdAt: new Date().toISOString(),
    };
    useAppStore.getState().addAsset(asset);
    expect(useAppStore.getState().assets).toHaveLength(1);
    expect(useAppStore.getState().assets[0].id).toBe("1");
  });

  test("updateSettings merges partial settings", () => {
    useAppStore.getState().updateSettings({ width: 1024 });
    expect(useAppStore.getState().settings.width).toBe(1024);
    expect(useAppStore.getState().settings.height).toBe(512); // unchanged
  });

  test("addStyleGuide adds guide", () => {
    const guide: StyleGuide = {
      id: "g1",
      name: "RPG Style",
      referenceImages: ["/ref/1.png"],
      defaultPromptPrefix: "dark fantasy",
      defaultSettings: { style: "hand-drawn", influence: 0.8 },
      createdAt: new Date().toISOString(),
    };
    useAppStore.getState().addStyleGuide(guide);
    expect(useAppStore.getState().styleGuides).toHaveLength(1);
  });

  test("removeStyleGuide removes by id", () => {
    const guide: StyleGuide = {
      id: "g1",
      name: "RPG Style",
      referenceImages: [],
      defaultPromptPrefix: "",
      defaultSettings: { style: "pixel-art", influence: 0.7 },
      createdAt: new Date().toISOString(),
    };
    useAppStore.getState().addStyleGuide(guide);
    useAppStore.getState().removeStyleGuide("g1");
    expect(useAppStore.getState().styleGuides).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/store/__tests__/app-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement zustand store**

Create `src/store/app-store.ts`:
```typescript
import { create } from "zustand";
import { GeneratedAsset, StyleGuide, SpriteSheet, GenerationSettings, DEFAULT_SETTINGS } from "../lib/types";

interface AppState {
  assets: GeneratedAsset[];
  styleGuides: StyleGuide[];
  spriteSheets: SpriteSheet[];
  settings: GenerationSettings;
  isGenerating: boolean;
  selectedStyleGuideId: string | null;

  addAsset: (asset: GeneratedAsset) => void;
  setAssets: (assets: GeneratedAsset[]) => void;
  addStyleGuide: (guide: StyleGuide) => void;
  removeStyleGuide: (id: string) => void;
  setStyleGuides: (guides: StyleGuide[]) => void;
  addSpriteSheet: (sheet: SpriteSheet) => void;
  setSpriteSheets: (sheets: SpriteSheet[]) => void;
  updateSettings: (partial: Partial<GenerationSettings>) => void;
  setIsGenerating: (value: boolean) => void;
  setSelectedStyleGuideId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  assets: [],
  styleGuides: [],
  spriteSheets: [],
  settings: { ...DEFAULT_SETTINGS },
  isGenerating: false,
  selectedStyleGuideId: null,

  addAsset: (asset) =>
    set((state) => ({ assets: [asset, ...state.assets] })),

  setAssets: (assets) => set({ assets }),

  addStyleGuide: (guide) =>
    set((state) => ({ styleGuides: [...state.styleGuides, guide] })),

  removeStyleGuide: (id) =>
    set((state) => ({
      styleGuides: state.styleGuides.filter((g) => g.id !== id),
    })),

  setStyleGuides: (styleGuides) => set({ styleGuides }),

  addSpriteSheet: (sheet) =>
    set((state) => ({ spriteSheets: [...state.spriteSheets, sheet] })),

  setSpriteSheets: (spriteSheets) => set({ spriteSheets }),

  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setSelectedStyleGuideId: (selectedStyleGuideId) => set({ selectedStyleGuideId }),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/store/__tests__/app-store.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/app-store.ts src/store/__tests__/app-store.test.ts
git commit -m "feat: add zustand store for app state management"
```

---

### Task 6: API Route — Upload Reference Image

**Files:**
- Create: `src/app/api/upload/route.ts`

- [ ] **Step 1: Implement upload route**

Create `src/app/api/upload/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { PATHS } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  await fs.mkdir(PATHS.references, { recursive: true });

  const timestamp = Date.now();
  const ext = path.extname(file.name) || ".png";
  const filename = `ref-${timestamp}${ext}`;
  const filePath = path.join(PATHS.references, filename);

  const bytes = await file.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(bytes));

  return NextResponse.json({
    path: `/references/${filename}`,
    filename,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: add reference image upload API route"
```

---

### Task 7: API Route — Text-to-Image Generation

**Files:**
- Create: `src/app/api/generate/route.ts`

- [ ] **Step 1: Implement text-to-image route**

Create `src/app/api/generate/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { callStabilityApi, buildTextToImagePayload, STABILITY_ENDPOINTS } from "@/lib/stability";
import { resizeImage, removeBackground, generateThumbnail } from "@/lib/image-processing";
import { appendToJsonArray, PATHS } from "@/lib/storage";
import { GeneratedAsset } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, settings } = body;

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "STABILITY_API_KEY not configured" }, { status: 500 });
  }

  const formData = buildTextToImagePayload({
    prompt,
    width: settings.width,
    height: settings.height,
    style: settings.style,
  });

  const endpoint = STABILITY_ENDPOINTS.textToImage(settings.model);
  let imageBuffer = await callStabilityApi(endpoint, formData, apiKey);

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

- [ ] **Step 2: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: add text-to-image generation API route"
```

---

### Task 8: API Route — Image-to-Image Generation

**Files:**
- Create: `src/app/api/generate/img2img/route.ts`

- [ ] **Step 1: Implement img2img route**

Create `src/app/api/generate/img2img/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { callStabilityApi, buildImg2ImgPayload, STABILITY_ENDPOINTS } from "@/lib/stability";
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
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "STABILITY_API_KEY not configured" }, { status: 500 });
  }

  const refBytes = await referenceFile.arrayBuffer();
  const refBuffer = Buffer.from(refBytes);

  const payload = buildImg2ImgPayload({
    prompt,
    image: refBuffer,
    strength: settings.influence,
  });

  const endpoint = STABILITY_ENDPOINTS.img2img();
  let imageBuffer = await callStabilityApi(endpoint, payload, apiKey);

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
git commit -m "feat: add img2img generation API route"
```

---

### Task 9: API Route — Variations

**Files:**
- Create: `src/app/api/generate/variations/route.ts`

- [ ] **Step 1: Implement variations route**

Create `src/app/api/generate/variations/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { callStabilityApi, buildImg2ImgPayload, STABILITY_ENDPOINTS } from "@/lib/stability";
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

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "STABILITY_API_KEY not configured" }, { status: 500 });
  }

  const sourcePath = path.join(process.cwd(), "public", sourceAsset.outputPath);
  const sourceBuffer = await fs.readFile(sourcePath);

  const results: GeneratedAsset[] = [];

  for (let i = 0; i < count; i++) {
    const payload = buildImg2ImgPayload({
      prompt: sourceAsset.prompt,
      image: sourceBuffer,
      strength: 0.3 + Math.random() * 0.3, // vary strength 0.3-0.6
    });

    const endpoint = STABILITY_ENDPOINTS.img2img();
    let imageBuffer = await callStabilityApi(endpoint, payload, apiKey);

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
git commit -m "feat: add variations generation API route"
```

---

### Task 10: API Routes — Gallery, Style Guides, Sprite Sheets

**Files:**
- Create: `src/app/api/gallery/route.ts`, `src/app/api/styleguide/route.ts`, `src/app/api/spritesheet/route.ts`

- [ ] **Step 1: Implement gallery route**

Create `src/app/api/gallery/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, PATHS } from "@/lib/storage";
import { GeneratedAsset } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const style = searchParams.get("style");
  const search = searchParams.get("search");

  let assets = await readJsonFile<GeneratedAsset[]>(PATHS.history, []);

  if (style) {
    assets = assets.filter((a) => a.settings.style === style);
  }

  if (search) {
    const lower = search.toLowerCase();
    assets = assets.filter((a) => a.prompt.toLowerCase().includes(lower));
  }

  // Return newest first
  assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(assets);
}
```

- [ ] **Step 2: Implement style guide route**

Create `src/app/api/styleguide/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile, PATHS } from "@/lib/storage";
import { StyleGuide } from "@/lib/types";

export async function GET() {
  const guides = await readJsonFile<StyleGuide[]>(PATHS.styleguides, []);
  return NextResponse.json(guides);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, referenceImages, defaultPromptPrefix, defaultSettings } = body;

  const guide: StyleGuide = {
    id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    referenceImages,
    defaultPromptPrefix: defaultPromptPrefix || "",
    defaultSettings: defaultSettings || { style: "pixel-art", influence: 0.7 },
    createdAt: new Date().toISOString(),
  };

  const guides = await readJsonFile<StyleGuide[]>(PATHS.styleguides, []);
  guides.push(guide);
  await writeJsonFile(PATHS.styleguides, guides);

  return NextResponse.json(guide);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const guides = await readJsonFile<StyleGuide[]>(PATHS.styleguides, []);
  const filtered = guides.filter((g) => g.id !== id);
  await writeJsonFile(PATHS.styleguides, filtered);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Implement sprite sheet route**

Create `src/app/api/spritesheet/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { composeSpriteSheet } from "@/lib/image-processing";
import { readJsonFile, writeJsonFile, PATHS } from "@/lib/storage";
import { GeneratedAsset, SpriteSheet } from "@/lib/types";

export async function GET() {
  const sheets = await readJsonFile<SpriteSheet[]>(PATHS.spritesheets, []);
  return NextResponse.json(sheets);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, assetIds, grid } = body;

  const history = await readJsonFile<GeneratedAsset[]>(PATHS.history, []);
  const selectedAssets = assetIds
    .map((id: string) => history.find((a) => a.id === id))
    .filter(Boolean) as GeneratedAsset[];

  if (selectedAssets.length === 0) {
    return NextResponse.json({ error: "No valid assets found" }, { status: 400 });
  }

  const imageBuffers = await Promise.all(
    selectedAssets.map((asset) =>
      fs.readFile(path.join(process.cwd(), "public", asset.outputPath))
    )
  );

  const spriteSheetBuffer = await composeSpriteSheet(imageBuffers, grid);

  await fs.mkdir(PATHS.outputs, { recursive: true });
  const id = `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${id}.png`;
  await fs.writeFile(path.join(PATHS.outputs, filename), spriteSheetBuffer);

  const sheet: SpriteSheet = {
    id,
    name: name || `Sprite Sheet ${id}`,
    assets: assetIds,
    grid,
    outputPath: `/outputs/${filename}`,
    createdAt: new Date().toISOString(),
  };

  const sheets = await readJsonFile<SpriteSheet[]>(PATHS.spritesheets, []);
  sheets.push(sheet);
  await writeJsonFile(PATHS.spritesheets, sheets);

  return NextResponse.json(sheet);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/gallery/route.ts src/app/api/styleguide/route.ts src/app/api/spritesheet/route.ts
git commit -m "feat: add gallery, style guide, and sprite sheet API routes"
```

---

### Task 11: Sidebar Component & Root Layout

**Files:**
- Create: `src/components/sidebar.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create sidebar component**

Create `src/components/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wand2, Image, Palette, LayoutGrid, Settings } from "lucide-react";

const navItems = [
  { href: "/generate", label: "Generate", icon: Wand2 },
  { href: "/gallery", label: "Gallery", icon: Image },
  { href: "/style-guides", label: "Style Guides", icon: Palette },
  { href: "/sprite-sheets", label: "Sprite Sheets", icon: LayoutGrid },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex flex-col h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-lg font-bold">Asset Gen</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Update root layout**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Game Asset Generator",
  description: "Generate 2D game assets with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Sidebar />
        <main className="ml-56 min-h-screen p-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create root page redirect**

Replace `src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/generate");
}
```

- [ ] **Step 4: Verify layout renders**

Run: `npm run dev`
Navigate to http://localhost:3000 — should see sidebar with navigation links and redirect to /generate.

- [ ] **Step 5: Commit**

```bash
git add src/components/sidebar.tsx src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add sidebar navigation and root layout"
```

---

### Task 12: Shared UI Components

**Files:**
- Create: `src/components/reference-upload.tsx`, `src/components/prompt-editor.tsx`, `src/components/generation-settings.tsx`, `src/components/asset-card.tsx`, `src/components/asset-grid.tsx`

- [ ] **Step 1: Create reference upload component**

Create `src/components/reference-upload.tsx`:
```tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";

interface ReferenceUploadProps {
  onUpload: (file: File) => void;
  currentImage: string | null;
  onClear: () => void;
}

export function ReferenceUpload({ onUpload, currentImage, onClear }: ReferenceUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  });

  if (currentImage) {
    return (
      <div className="relative w-44 h-44 rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
        <img src={currentImage} alt="Reference" className="w-full h-full object-cover" />
        <button
          onClick={onClear}
          className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-black/80"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`w-44 h-44 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer flex-shrink-0 transition-colors ${
        isDragActive
          ? "border-[var(--primary)] bg-[var(--primary)]/10"
          : "border-[var(--border)] hover:border-[var(--muted)]"
      }`}
    >
      <input {...getInputProps()} />
      <Upload size={28} className="text-[var(--muted)] mb-2" />
      <p className="text-xs text-[var(--muted)] text-center px-2">
        Drop reference image here
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create prompt editor component**

Create `src/components/prompt-editor.tsx`:
```tsx
"use client";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PromptEditor({ value, onChange, placeholder }: PromptEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Describe the asset you want to generate..."}
      className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--foreground)] placeholder-[var(--muted)] resize-none min-h-[80px] focus:outline-none focus:border-[var(--primary)]"
    />
  );
}
```

- [ ] **Step 3: Create generation settings component**

Create `src/components/generation-settings.tsx`:
```tsx
"use client";

import { GenerationSettings as Settings, STYLE_PRESETS, StyleGuide } from "@/lib/types";

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
  return (
    <div className="flex flex-wrap gap-2">
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

      <select
        value={settings.model}
        onChange={(e) => onUpdate({ model: e.target.value })}
        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)]"
      >
        <option value="sdxl">SDXL</option>
        <option value="sd3">SD3</option>
      </select>

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

- [ ] **Step 4: Create asset card component**

Create `src/components/asset-card.tsx`:
```tsx
"use client";

import { GeneratedAsset } from "@/lib/types";

interface AssetCardProps {
  asset: GeneratedAsset;
  onClick: (asset: GeneratedAsset) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (asset: GeneratedAsset) => void;
}

export function AssetCard({ asset, onClick, selectable, selected, onSelect }: AssetCardProps) {
  return (
    <div
      className={`relative group rounded-lg overflow-hidden border cursor-pointer transition-all ${
        selected
          ? "border-[var(--primary)] ring-2 ring-[var(--primary)]"
          : "border-[var(--border)] hover:border-[var(--muted)]"
      }`}
      onClick={() => onClick(asset)}
    >
      <div
        className="aspect-square"
        style={{
          background:
            "repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px",
        }}
      >
        <img
          src={asset.thumbnailPath}
          alt={asset.prompt}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{asset.prompt}</p>
      </div>
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect?.(asset);
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 w-4 h-4"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create asset grid component**

Create `src/components/asset-grid.tsx`:
```tsx
"use client";

import { GeneratedAsset } from "@/lib/types";
import { AssetCard } from "./asset-card";

interface AssetGridProps {
  assets: GeneratedAsset[];
  onAssetClick: (asset: GeneratedAsset) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (asset: GeneratedAsset) => void;
  emptyMessage?: string;
}

export function AssetGrid({
  assets,
  onAssetClick,
  selectable,
  selectedIds,
  onToggleSelect,
  emptyMessage = "No assets yet",
}: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--muted)] text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onClick={onAssetClick}
          selectable={selectable}
          selected={selectedIds?.has(asset.id)}
          onSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/reference-upload.tsx src/components/prompt-editor.tsx src/components/generation-settings.tsx src/components/asset-card.tsx src/components/asset-grid.tsx
git commit -m "feat: add shared UI components (upload, prompt, settings, asset grid)"
```

---

### Task 13: Asset Detail Modal

**Files:**
- Create: `src/components/asset-detail-modal.tsx`

- [ ] **Step 1: Create asset detail modal**

Create `src/components/asset-detail-modal.tsx`:
```tsx
"use client";

import { GeneratedAsset } from "@/lib/types";
import { X, Download, Copy, LayoutGrid } from "lucide-react";

interface AssetDetailModalProps {
  asset: GeneratedAsset;
  onClose: () => void;
  onGenerateVariations: (assetId: string) => void;
}

export function AssetDetailModal({ asset, onClose, onGenerateVariations }: AssetDetailModalProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = asset.outputPath;
    link.download = `${asset.id}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8" onClick={onClose}>
      <div
        className="bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold truncate flex-1 mr-4">{asset.prompt}</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div
            className="rounded-lg overflow-hidden mb-4"
            style={{
              background: "repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px",
            }}
          >
            <img src={asset.outputPath} alt={asset.prompt} className="w-full object-contain max-h-[50vh]" />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg text-sm"
            >
              <Download size={16} /> Download PNG
            </button>
            <button
              onClick={() => onGenerateVariations(asset.id)}
              className="flex items-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--border)] text-[var(--foreground)] px-4 py-2 rounded-lg text-sm"
            >
              <Copy size={16} /> Variations
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
            <div>Style: <span className="text-[var(--foreground)]">{asset.settings.style}</span></div>
            <div>Size: <span className="text-[var(--foreground)]">{asset.settings.width}x{asset.settings.height}</span></div>
            <div>Model: <span className="text-[var(--foreground)]">{asset.settings.model}</span></div>
            <div>Transparent: <span className="text-[var(--foreground)]">{asset.settings.transparent ? "Yes" : "No"}</span></div>
            {asset.referenceImagePath && (
              <div className="col-span-2">Reference: <span className="text-[var(--foreground)]">{asset.referenceImagePath}</span></div>
            )}
            <div className="col-span-2">Created: <span className="text-[var(--foreground)]">{new Date(asset.createdAt).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/asset-detail-modal.tsx
git commit -m "feat: add asset detail modal with download and variations"
```

---

### Task 14: Generate Page

**Files:**
- Create: `src/app/generate/page.tsx`

- [ ] **Step 1: Implement generate page**

Create `src/app/generate/page.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { ReferenceUpload } from "@/components/reference-upload";
import { PromptEditor } from "@/components/prompt-editor";
import { GenerationSettings } from "@/components/generation-settings";
import { AssetGrid } from "@/components/asset-grid";
import { AssetDetailModal } from "@/components/asset-detail-modal";
import { GeneratedAsset } from "@/lib/types";

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);

  const {
    assets,
    setAssets,
    addAsset,
    settings,
    updateSettings,
    styleGuides,
    setStyleGuides,
    selectedStyleGuideId,
    setSelectedStyleGuideId,
    isGenerating,
    setIsGenerating,
  } = useAppStore();

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then(setAssets);
    fetch("/api/styleguide")
      .then((r) => r.json())
      .then(setStyleGuides);
  }, [setAssets, setStyleGuides]);

  const handleUpload = (file: File) => {
    setReferenceFile(file);
    setReferencePreview(URL.createObjectURL(file));
  };

  const handleClearReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      let finalPrompt = prompt;
      const guide = styleGuides.find((g) => g.id === selectedStyleGuideId);
      if (guide?.defaultPromptPrefix) {
        finalPrompt = `${guide.defaultPromptPrefix}, ${prompt}`;
      }

      let result: GeneratedAsset;

      if (referenceFile || (guide && guide.referenceImages.length > 0)) {
        const formData = new FormData();
        formData.append("prompt", finalPrompt);
        formData.append("settings", JSON.stringify({
          ...settings,
          ...(guide?.defaultSettings || {}),
        }));

        if (referenceFile) {
          formData.append("reference", referenceFile);
        } else if (guide && guide.referenceImages.length > 0) {
          const refResponse = await fetch(guide.referenceImages[0]);
          const refBlob = await refResponse.blob();
          formData.append("reference", refBlob, "reference.png");
        }

        const response = await fetch("/api/generate/img2img", {
          method: "POST",
          body: formData,
        });
        result = await response.json();
      } else {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalPrompt, settings }),
        });
        result = await response.json();
      }

      addAsset(result);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVariations = async (assetId: string) => {
    setIsGenerating(true);
    setSelectedAsset(null);
    try {
      const response = await fetch("/api/generate/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, count: 4 }),
      });
      const results: GeneratedAsset[] = await response.json();
      const updated = [...results, ...assets];
      setAssets(updated);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 border-b border-[var(--border)] pb-6">
        <div className="flex gap-4 items-start">
          <ReferenceUpload
            onUpload={handleUpload}
            currentImage={referencePreview}
            onClear={handleClearReference}
          />

          <div className="flex-1 flex flex-col gap-3">
            <PromptEditor value={prompt} onChange={setPrompt} />
            <GenerationSettings
              settings={settings}
              onUpdate={updateSettings}
              styleGuides={styleGuides}
              selectedStyleGuideId={selectedStyleGuideId}
              onSelectStyleGuide={setSelectedStyleGuideId}
            />
            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-3">Recent Generations</p>
        <AssetGrid
          assets={assets}
          onAssetClick={setSelectedAsset}
          emptyMessage="Generate your first asset above"
        />
      </div>

      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onGenerateVariations={handleVariations}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify page renders**

Run: `npm run dev`
Navigate to http://localhost:3000/generate — should see the generate workspace with upload zone, prompt editor, settings, and empty results grid.

- [ ] **Step 3: Commit**

```bash
git add src/app/generate/page.tsx
git commit -m "feat: add generate page with text-to-image and img2img workflows"
```

---

### Task 15: Gallery Page

**Files:**
- Create: `src/app/gallery/page.tsx`

- [ ] **Step 1: Implement gallery page**

Create `src/app/gallery/page.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { GeneratedAsset, STYLE_PRESETS } from "@/lib/types";
import { AssetGrid } from "@/components/asset-grid";
import { AssetDetailModal } from "@/components/asset-detail-modal";

export default function GalleryPage() {
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (styleFilter) params.set("style", styleFilter);

    fetch(`/api/gallery?${params}`)
      .then((r) => r.json())
      .then(setAssets);
  }, [search, styleFilter]);

  const handleVariations = async (assetId: string) => {
    setSelectedAsset(null);
    const response = await fetch("/api/generate/variations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, count: 4 }),
    });
    const results: GeneratedAsset[] = await response.json();
    setAssets((prev) => [...results, ...prev]);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Gallery</h2>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
        <select
          value={styleFilter}
          onChange={(e) => setStyleFilter(e.target.value)}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="">All styles</option>
          {STYLE_PRESETS.map((s) => (
            <option key={s} value={s}>
              {s.replace("-", " ")}
            </option>
          ))}
        </select>
      </div>

      <AssetGrid
        assets={assets}
        onAssetClick={setSelectedAsset}
        emptyMessage="No assets match your search"
      />

      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onGenerateVariations={handleVariations}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/gallery/page.tsx
git commit -m "feat: add gallery page with search and style filtering"
```

---

### Task 16: Style Guides Page

**Files:**
- Create: `src/app/style-guides/page.tsx`, `src/components/style-guide-card.tsx`

- [ ] **Step 1: Create style guide card component**

Create `src/components/style-guide-card.tsx`:
```tsx
"use client";

import { StyleGuide } from "@/lib/types";
import { Trash2 } from "lucide-react";

interface StyleGuideCardProps {
  guide: StyleGuide;
  onDelete: (id: string) => void;
}

export function StyleGuideCard({ guide, onDelete }: StyleGuideCardProps) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-sm">{guide.name}</h3>
        <button
          onClick={() => onDelete(guide.id)}
          className="text-[var(--muted)] hover:text-red-400"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {guide.referenceImages.length > 0 && (
        <div className="flex gap-2 mb-3">
          {guide.referenceImages.slice(0, 4).map((img, i) => (
            <div key={i} className="w-16 h-16 rounded border border-[var(--border)] overflow-hidden">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {guide.defaultPromptPrefix && (
        <p className="text-xs text-[var(--muted)] mb-2">
          Prefix: <span className="text-[var(--foreground)]">{guide.defaultPromptPrefix}</span>
        </p>
      )}

      <div className="text-xs text-[var(--muted)]">
        Style: {guide.defaultSettings.style} | Influence: {guide.defaultSettings.influence}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement style guides page**

Create `src/app/style-guides/page.tsx`:
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { StyleGuide, STYLE_PRESETS } from "@/lib/types";
import { StyleGuideCard } from "@/components/style-guide-card";

export default function StyleGuidesPage() {
  const [guides, setGuides] = useState<StyleGuide[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [promptPrefix, setPromptPrefix] = useState("");
  const [style, setStyle] = useState("pixel-art");
  const [influence, setInfluence] = useState(0.7);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/styleguide")
      .then((r) => r.json())
      .then(setGuides);
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const paths: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      paths.push(data.path);
    }
    setUploadedImages((prev) => [...prev, ...paths]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
  });

  const handleCreate = async () => {
    if (!name.trim()) return;

    const res = await fetch("/api/styleguide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        referenceImages: uploadedImages,
        defaultPromptPrefix: promptPrefix,
        defaultSettings: { style, influence },
      }),
    });
    const guide = await res.json();
    setGuides((prev) => [...prev, guide]);
    setIsCreating(false);
    setName("");
    setPromptPrefix("");
    setUploadedImages([]);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/styleguide?id=${id}`, { method: "DELETE" });
    setGuides((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Style Guides</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> New Guide
        </button>
      </div>

      {isCreating && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Style guide name..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] mb-3"
          />
          <textarea
            value={promptPrefix}
            onChange={(e) => setPromptPrefix(e.target.value)}
            placeholder="Default prompt prefix (e.g. 'dark fantasy RPG style')..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] mb-3 resize-none min-h-[60px]"
          />
          <div className="flex gap-2 mb-3">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--foreground)]"
            >
              {STYLE_PRESETS.map((s) => (
                <option key={s} value={s}>{s.replace("-", " ")}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              Influence:
              <input type="range" min="0" max="1" step="0.1" value={influence} onChange={(e) => setInfluence(parseFloat(e.target.value))} className="w-20" />
              <span className="text-[var(--foreground)]">{influence}</span>
            </div>
          </div>

          <div {...getRootProps()} className="border-2 border-dashed border-[var(--border)] rounded-lg p-4 mb-3 cursor-pointer hover:border-[var(--muted)] text-center">
            <input {...getInputProps()} />
            <Upload size={20} className="mx-auto mb-1 text-[var(--muted)]" />
            <p className="text-xs text-[var(--muted)]">Drop reference images here</p>
          </div>

          {uploadedImages.length > 0 && (
            <div className="flex gap-2 mb-3">
              {uploadedImages.map((img, i) => (
                <div key={i} className="w-16 h-16 rounded border border-[var(--border)] overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg text-sm">
              Create Guide
            </button>
            <button onClick={() => setIsCreating(false)} className="bg-[var(--card-bg)] text-[var(--muted)] px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guides.map((guide) => (
          <StyleGuideCard key={guide.id} guide={guide} onDelete={handleDelete} />
        ))}
      </div>

      {guides.length === 0 && !isCreating && (
        <p className="text-[var(--muted)] text-sm text-center mt-8">
          No style guides yet. Create one to maintain consistent art across assets.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/style-guide-card.tsx src/app/style-guides/page.tsx
git commit -m "feat: add style guides page with create/delete"
```

---

### Task 17: Sprite Sheets Page

**Files:**
- Create: `src/app/sprite-sheets/page.tsx`, `src/components/sprite-sheet-preview.tsx`

- [ ] **Step 1: Create sprite sheet preview component**

Create `src/components/sprite-sheet-preview.tsx`:
```tsx
"use client";

import { SpriteSheet } from "@/lib/types";
import { Download, Trash2 } from "lucide-react";

interface SpriteSheetPreviewProps {
  sheet: SpriteSheet;
  onDelete: (id: string) => void;
}

export function SpriteSheetPreview({ sheet, onDelete }: SpriteSheetPreviewProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = sheet.outputPath;
    link.download = `${sheet.name}.png`;
    link.click();
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div
        className="aspect-video"
        style={{
          background: "repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px",
        }}
      >
        <img src={sheet.outputPath} alt={sheet.name} className="w-full h-full object-contain" />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">{sheet.name}</h3>
          <div className="flex gap-1">
            <button onClick={handleDownload} className="text-[var(--muted)] hover:text-[var(--foreground)] p-1">
              <Download size={16} />
            </button>
            <button onClick={() => onDelete(sheet.id)} className="text-[var(--muted)] hover:text-red-400 p-1">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)]">
          {sheet.grid.columns}x{sheet.grid.rows} grid | {sheet.grid.frameWidth}x{sheet.grid.frameHeight}px frames | {sheet.assets.length} assets
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement sprite sheets page**

Create `src/app/sprite-sheets/page.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { GeneratedAsset, SpriteSheet } from "@/lib/types";
import { AssetGrid } from "@/components/asset-grid";
import { SpriteSheetPreview } from "@/components/sprite-sheet-preview";

export default function SpriteSheetsPage() {
  const [sheets, setSheets] = useState<SpriteSheet[]>([]);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(4);
  const [frameWidth, setFrameWidth] = useState(64);
  const [frameHeight, setFrameHeight] = useState(64);
  const [padding, setPadding] = useState(0);

  useEffect(() => {
    fetch("/api/spritesheet").then((r) => r.json()).then(setSheets);
    fetch("/api/gallery").then((r) => r.json()).then(setAssets);
  }, []);

  const toggleSelect = (asset: GeneratedAsset) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (selectedIds.size === 0 || !name.trim()) return;

    const res = await fetch("/api/spritesheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        assetIds: Array.from(selectedIds),
        grid: { columns, rows, frameWidth, frameHeight, padding },
      }),
    });
    const sheet = await res.json();
    setSheets((prev) => [...prev, sheet]);
    setIsCreating(false);
    setSelectedIds(new Set());
    setName("");
  };

  const handleDelete = async (id: string) => {
    // Remove from local state — file stays on disk
    setSheets((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sprite Sheets</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> New Sheet
        </button>
      </div>

      {isCreating && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sprite sheet name..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] mb-3"
          />

          <div className="flex gap-3 mb-3 flex-wrap text-xs">
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Columns:
              <input type="number" value={columns} onChange={(e) => setColumns(parseInt(e.target.value) || 1)} className="w-14 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Rows:
              <input type="number" value={rows} onChange={(e) => setRows(parseInt(e.target.value) || 1)} className="w-14 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Frame W:
              <input type="number" value={frameWidth} onChange={(e) => setFrameWidth(parseInt(e.target.value) || 32)} className="w-16 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Frame H:
              <input type="number" value={frameHeight} onChange={(e) => setFrameHeight(parseInt(e.target.value) || 32)} className="w-16 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Padding:
              <input type="number" value={padding} onChange={(e) => setPadding(parseInt(e.target.value) || 0)} className="w-14 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
          </div>

          <p className="text-xs text-[var(--muted)] mb-2">Select assets ({selectedIds.size} selected):</p>
          <div className="max-h-64 overflow-auto mb-3">
            <AssetGrid
              assets={assets}
              onAssetClick={() => {}}
              selectable
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={selectedIds.size === 0 || !name.trim()}
              className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
            >
              <LayoutGrid size={16} /> Compose Sheet
            </button>
            <button onClick={() => setIsCreating(false)} className="bg-[var(--card-bg)] text-[var(--muted)] px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sheets.map((sheet) => (
          <SpriteSheetPreview key={sheet.id} sheet={sheet} onDelete={handleDelete} />
        ))}
      </div>

      {sheets.length === 0 && !isCreating && (
        <p className="text-[var(--muted)] text-sm text-center mt-8">
          No sprite sheets yet. Compose one from your generated assets.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/sprite-sheet-preview.tsx src/app/sprite-sheets/page.tsx
git commit -m "feat: add sprite sheets page with composer"
```

---

### Task 18: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Implement settings page**

Create `src/app/settings/page.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { STYLE_PRESETS } from "@/lib/types";

export default function SettingsPage() {
  const { settings, updateSettings } = useAppStore();
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // API key is server-side only (.env.local), show placeholder
    setApiKey("••••••••");
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Stability AI API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
          />
          <p className="text-xs text-[var(--muted)] mt-1">
            Set in .env.local as STABILITY_API_KEY. This field is display-only.
          </p>
        </div>

        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Default Style</label>
          <select
            value={settings.style}
            onChange={(e) => updateSettings({ style: e.target.value })}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {STYLE_PRESETS.map((s) => (
              <option key={s} value={s}>{s.replace("-", " ")}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Default Width</label>
            <input
              type="number"
              value={settings.width}
              onChange={(e) => updateSettings({ width: parseInt(e.target.value) || 512 })}
              className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Default Height</label>
            <input
              type="number"
              value={settings.height}
              onChange={(e) => updateSettings({ height: parseInt(e.target.value) || 512 })}
              className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Default Model</label>
          <select
            value={settings.model}
            onChange={(e) => updateSettings({ model: e.target.value })}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
          >
            <option value="sdxl">SDXL</option>
            <option value="sd3">SD3</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.transparent}
            onChange={(e) => updateSettings({ transparent: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Transparent background by default</span>
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add settings page with default generation presets"
```

---

### Task 19: End-to-End Verification

**Files:** None — verification only.

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Build completes with no errors.

- [ ] **Step 2: Start dev server and verify all pages**

Run: `npm run dev`

Verify each page loads without errors:
- http://localhost:3000 → redirects to /generate
- http://localhost:3000/generate → shows upload zone, prompt editor, settings, empty grid
- http://localhost:3000/gallery → shows search bar, style filter, empty state
- http://localhost:3000/style-guides → shows empty state with "New Guide" button
- http://localhost:3000/sprite-sheets → shows empty state with "New Sheet" button
- http://localhost:3000/settings → shows API key field, default settings

- [ ] **Step 3: Run all tests**

Run: `npx jest`
Expected: All tests pass.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any build/test issues from integration"
```
