# API Reference

All API routes are serverless functions running on the Next.js backend. They proxy requests to Google's Generative AI APIs using the user's API key.

---

## Authentication

All endpoints require a Google AI Studio API key passed via custom header:

```
x-google-api-key: <your-api-key>
```

Missing or invalid keys return a `401` response.

---

## Endpoints

### `GET /api/models`

Fetches all available AI models for the provided API key.

**Request:**
```bash
curl -X GET http://localhost:3000/api/models \
  -H "x-google-api-key: YOUR_API_KEY"
```

**Success Response (200):**
```json
{
  "models": [
    {
      "name": "models/gemini-2.0-flash",
      "displayName": "Gemini 2.0 Flash",
      "description": "...",
      "supportedGenerationMethods": ["generateContent", "countTokens"]
    },
    {
      "name": "models/imagen-3.0-generate-002",
      "displayName": "Imagen 3.0 Generate 002",
      "description": "...",
      "supportedGenerationMethods": ["predict"]
    }
  ]
}
```

**Error Response (401):**
```json
{ "error": "Missing API Key" }
```

**Error Response (500):**
```json
{ "error": "Failed to fetch models" }
```

---

### `POST /api/generate-image`

Expands a prompt using a Gemini text model, then generates images using an image model.

**Request Headers:**
```
Content-Type: application/json
x-google-api-key: YOUR_API_KEY
```

**Request Body:**
```json
{
  "requestPrompt": "A golden eagle soaring over mountains",
  "negativePrompt": "blurry, low quality, watermark",
  "aspectRatio": "16:9",
  "resolution": "2K",
  "count": 2,
  "referenceImages": ["data:image/png;base64,..."],
  "promptModel": "gemini-2.0-flash",
  "imageModel": "imagen-3.0-generate-002"
}
```

**Parameters:**

| Field             | Type     | Required | Default                        | Description                                    |
|-------------------|----------|----------|--------------------------------|------------------------------------------------|
| `requestPrompt`   | string   | ✅       | —                              | User's image description                       |
| `negativePrompt`  | string   | ❌       | `""`                           | Things to exclude from the image               |
| `aspectRatio`     | string   | ❌       | `"1:1"`                        | One of: `"1:1"`, `"9:16"`, `"16:9"`            |
| `resolution`      | string   | ❌       | `"1K"`                         | One of: `"1K"`, `"2K"`, `"3K"`, `"4K"`         |
| `count`           | number   | ❌       | `1`                            | Number of images (1–4)                         |
| `referenceImages` | string[] | ❌       | `[]`                           | Base64 data URIs of reference images           |
| `promptModel`     | string   | ✅       | —                              | Gemini model ID for prompt expansion           |
| `imageModel`      | string   | ❌       | `"imagen-3.0-generate-002"`    | Model ID for image generation                  |

**Success Response (200):**
```json
{
  "images": [
    "data:image/png;base64,iVBOR...",
    "data:image/png;base64,iVBOR..."
  ],
  "enhancedPrompt": "A majestic golden eagle with iridescent plumage soaring..."
}
```

**Error Responses:**

| Status | Body                          | Cause                           |
|--------|-------------------------------|---------------------------------|
| 400    | `{ "error": "No prompt model selected" }` | Missing `promptModel` field |
| 401    | `{ "error": "Missing Google API Key in headers" }` | No `x-google-api-key` header |
| 500    | `{ "error": "Prompt Expansion Failed with model ..." }` | Gemini text model error |
| 500    | `{ "error": "No images returned from Google AI Studio." }` | Image model returned no results |

---

## Processing Pipeline

```
┌─────────────────┐
│  Client Request  │
│  (prompt + refs) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  1. Prompt Expansion        │
│  Model: promptModel         │
│  API: generateContent       │
│                             │
│  System: "Elite AI Image    │
│  Prompt Engineer" persona   │
│                             │
│  Input: prompt + negatives  │
│  + reference images         │
│  + resolution constraint    │
│                             │
│  Output: enhanced prompt    │
│  (≤150 words)               │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  2. Image Generation        │
│  Model: imageModel          │
│                             │
│  IF model contains          │
│  "gemini" + "image":        │
│    → generateContent        │
│    → v1alpha API            │
│    → concurrent requests    │
│      for count > 1          │
│                             │
│  ELSE (Imagen):             │
│    → predict                │
│    → v1beta API             │
│    → single request with    │
│      sampleCount param      │
│                             │
│  Output: base64 images      │
└─────────────────────────────┘
```

---

## External APIs Used

| API                       | Base URL                                          | Used For            |
|---------------------------|---------------------------------------------------|---------------------|
| Google AI (`v1beta`)      | `generativelanguage.googleapis.com/v1beta`        | Models list, Imagen |
| Google AI (`v1alpha`)     | `generativelanguage.googleapis.com/v1alpha`       | Gemini image models |
| Google GenAI SDK          | Via `@google/genai` package                       | Prompt expansion    |
