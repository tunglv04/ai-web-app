# Game Asset Generator — Design Spec

Personal web tool for generating 2D game assets using Stability AI, with reference image support, style guides, and sprite sheet composition.

## Architecture

Monolithic **Next.js 14 (App Router)** application. Single deployment, no separate backend.

### Layers

- **Frontend (React + Tailwind CSS):** UI for uploading references, writing prompts, configuring settings, browsing gallery, building style guides, composing sprite sheets.
- **API Routes (Next.js Route Handlers):** Server-side logic for calling Stability AI, image processing with Sharp, file I/O.
- **Storage (local filesystem):** Generated images, reference images, JSON data files. No database.

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/generate` | Text-to-image generation |
| `POST /api/generate/img2img` | Reference-based generation (style transfer) |
| `POST /api/generate/variations` | Generate variations of an existing asset |
| `POST /api/process` | Post-processing: resize, background removal, transparency |
| `POST /api/spritesheet` | Compose multiple assets into a sprite sheet |
| `GET/POST /api/styleguide` | CRUD for style guides |
| `GET /api/gallery` | List generated assets with filtering |

### Storage Layout

```
/public/outputs/       — generated asset images
/public/references/    — uploaded reference images
/data/styleguides.json — saved style guides
/data/history.json     — generation history with prompts/settings
```

## Core Workflows

### 1. Text-to-Image
User writes a prompt → selects style preset + output settings (size, transparency, model) → Generate → Stability AI text-to-image → post-process (resize, remove background if requested) → save to gallery.

### 2. Reference-based Generation (img2img)
User uploads a reference image + writes a prompt → sets influence strength (0-1, how closely to match reference) → Stability AI img2img → post-process → save to gallery.

### 3. Style Guide Generation
User uploads 2-5 reference images → saves as a named style guide with default prompt prefix and settings → when generating, selects a style guide → app builds composite prompt from guide's references + user's text → generates via img2img using one of the guide's reference images + enhanced prompt.

### 4. Sprite Sheet Composer
User selects multiple assets from gallery → configures grid (rows, columns, frame size, padding) → Sharp composes them into a single sprite sheet PNG → preview and download.

## UI Layout

Single-page app with sidebar navigation. Dark theme.

### Pages

- **Generate** (main workspace): Reference image drop zone (left), prompt editor + settings chips + action buttons (center), recent results grid (bottom).
- **Gallery**: Grid of all generated assets. Filter by style, date, prompt text. Click for detail view with download/variations/add-to-spritesheet.
- **Style Guides**: List of saved guides. Create new from uploaded reference images. Edit name, prompt prefix, default settings.
- **Sprite Sheets**: List of composed sheets. Create new by selecting assets, configuring grid, previewing, and exporting.
- **Settings**: Stability AI API key input. Default generation presets.

### Generation Settings

- Style preset (pixel art, hand-drawn, flat/vector, realistic, custom)
- Output size (custom width x height)
- Transparent background (yes/no)
- Influence strength (0-1, for img2img)
- Style guide selection
- Model selection (SDXL, SD3)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS (dark theme) |
| Image processing | Sharp (resize, alpha channel, sprite sheet composition) |
| AI API | Stability AI REST API (text-to-image, image-to-image, upscale) |
| File uploads | react-dropzone |
| State management | zustand |
| Icons | lucide-react |
| Storage | Local filesystem + JSON files |

## Data Models

### GeneratedAsset
```typescript
interface GeneratedAsset {
  id: string;
  prompt: string;
  referenceImagePath?: string;
  styleGuideId?: string;
  settings: {
    width: number;
    height: number;
    transparent: boolean;
    style: string;
    influence: number;
    model: string;
  };
  outputPath: string;
  thumbnailPath: string;
  createdAt: string;
}
```

### StyleGuide
```typescript
interface StyleGuide {
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
```

### SpriteSheet
```typescript
interface SpriteSheet {
  id: string;
  name: string;
  assets: string[]; // asset IDs
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
```

## Key Decisions

- **No auth** — personal tool, runs locally.
- **No database** — JSON files sufficient at this scale.
- **No cloud storage** — everything on local machine.
- **Stability AI REST API directly** — no SDK wrapper, fewer dependencies.
- **Sharp for all image processing** — resize, transparency, sprite sheets handled server-side.
- **Dark theme** — better for creative/visual work.
