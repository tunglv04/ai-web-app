# Features Guide

## 1. Hub (Homepage)

**Route:** `/`

The landing page serves as a central navigation hub. It displays three tool cards:

- **General Image** — Active, fully functional
- **Creative Image** — Coming Soon
- **Creative Video** — Coming Soon

Each card links to its respective page with hover animations and visual effects.

---

## 2. General Image Tool

**Route:** `/general-image`

This is the main functional tool. It allows users to generate high-quality images using Google's AI models.

### Authentication Flow
1. On first visit, an **API Key Modal** (`ApiKeyModal.tsx`) appears automatically.
2. User enters their Google AI Studio API key.
3. The key is saved to `localStorage` under the key `google_ai_studio_key`.
4. The key can be reset via the **"Reset Key"** button in the header.

### Image Generation Flow

```
User fills form → [POST /api/generate-image] → Gemini expands prompt → Imagen/Gemini generates image → Display results
```

#### Step-by-step:
1. **User writes a prompt** describing what they want.
2. **(Optional)** User adds a **negative prompt** — things to exclude.
3. **(Optional)** User uploads **reference images** for style guidance.
4. User selects **Prompt Model** (for text expansion) and **Image Model** (for generation).
5. User configures **aspect ratio** (1:1, 9:16, 16:9), **resolution** (1K–4K), and **count** (1–4 images).
6. User clicks **"Generate Magic"**.

#### Backend Processing (`/api/generate-image`):
1. **Prompt Expansion**: The user's simple prompt is sent to the selected Gemini model with a system prompt that acts as a "world-class AI Image Prompt Engineer." Reference images are also sent for style analysis.
2. **Image Generation**: The expanded prompt is sent to either:
   - **Gemini Image Preview models** — via `generateContent` API (v1alpha)
   - **Imagen 3 models** — via `predict` API (v1beta)
3. Results are returned as base64-encoded images.

### Model Selection
- Models are fetched dynamically from `/api/models` on page load.
- **Prompt Model**: Filtered to models that support `generateContent`.
- **Image Model**: All available models are shown.
- Saved model preferences persist in `localStorage` under `general_image_config`.

### Reference Image Sets
Users can upload reference images and save them as named **sets** for reuse:
- **Save Set**: Name and save current reference images to `localStorage`.
- **Load Set**: Click a saved set chip to load its images.
- **Delete Set**: Hover over a set chip and click the × button.

### Results Display
- Generated images are displayed in a responsive grid.
- Each image has a **download button** on hover.
- The **enhanced prompt** (AI-expanded) is shown below the images.

---

## 3. Creative Image Tool

**Route:** `/creative-image`  
**Status:** Coming Soon

Placeholder page with a "Coming Soon" badge. Will provide advanced image generation with fine-tuned models for game art styles.

---

## 4. Creative Video Tool

**Route:** `/creative-video`  
**Status:** Coming Soon

Placeholder page with a "Coming Soon" badge. Will provide video content generation, cinematic trailers, and AI-powered animations.

---

## Key Technical Details

### localStorage Keys

| Key                          | Purpose                                  |
|------------------------------|------------------------------------------|
| `google_ai_studio_key`       | Google AI Studio API key (JSON-stringified) |
| `general_image_config`       | Saved form settings (model, ratio, etc.) |
| `general_image_saved_sets`   | Saved reference image sets               |

### API Key Security
- The API key is **never sent to the server as an environment variable**.
- Instead, each user provides their own key via the browser.
- The key is passed to API routes via the `x-google-api-key` custom header.
- This means **each user authenticates independently**.

### Error Handling
- Missing API key → 401 error with prompt to enter key
- Prompt expansion failure → Specific error message with model name
- Image generation failure → Error displayed in the preview panel
- No images returned → "No images returned from Google AI Studio" error
