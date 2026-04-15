# Web Deployment with Client-Side Storage

## Problem

The app stores all data (JSON metadata) and images (PNG files) on the server filesystem. This doesn't work on Vercel where serverless functions have no persistent filesystem. The app needs to work as a deployed web app with all user data stored client-side.

## Solution

Move all persistent storage to the browser (localStorage for metadata, IndexedDB for images). API routes become stateless — they call Gemini and return results, but store nothing. The Gemini API key is provided by the user and stored in localStorage.

## Architecture

### API Key Flow

- On app load, a root-level `ApiKeyGate` component checks localStorage for `gemini-api-key`
- If missing, renders a full-screen form asking for the key (with a test button that calls Gemini to validate)
- Key stored in localStorage, sent as `x-api-key` header on every API request
- All API routes read the key from the request header: `request.headers.get("x-api-key")`
- Settings page shows current key (masked) with option to change/clear

### Client Storage Module (`src/lib/client-storage.ts`)

Single module exposing two storage backends:

**localStorage** (JSON data):
- `gemini-api-key` — user's API key
- `history` — array of GeneratedAsset metadata (without image data)
- `styleguides` — array of StyleGuide objects
- `spritesheets` — array of SpriteSheet objects
- `settings` — GenerationSettings

**IndexedDB** (binary image data):
- Database: `game-asset-gen`
- Object store: `images`
- Key: image path string (e.g., `outputs/asset-123.png`, `outputs/asset-123-thumb.png`, `references/ref-456.png`)
- Value: Blob

API:
```typescript
// IndexedDB
saveImage(key: string, blob: Blob): Promise<void>
getImage(key: string): Promise<Blob | undefined>
deleteImage(key: string): Promise<void>
getImageURL(key: string): Promise<string | undefined>  // returns blob URL

// localStorage wrappers
saveMetadata<T>(key: string, data: T): void
loadMetadata<T>(key: string, defaultValue: T): T
```

### API Route Changes

All API routes that currently write to the filesystem change to return data in the response:

**`/api/generate` and `/api/generate/img2img`**:
- Remove: writing images to `public/outputs/`, appending to `data/history.json`
- Add: return base64 image data + thumbnail data in the JSON response
- Response shape:
```typescript
{
  id: string;
  prompt: string;
  imageBase64: string;      // full image as base64
  thumbnailBase64: string;  // thumbnail as base64
  settings: GenerationSettings;
  createdAt: string;
}
```
- Client receives this, converts base64 → Blob, stores in IndexedDB, saves metadata to localStorage

**`/api/generate/refine` and `/api/generate/variations`**:
- Same pattern: return base64 image data instead of file paths
- Client receives source image from IndexedDB (as base64) and sends it in the request body, since the server can't read from disk

**`/api/styleguide`**:
- Remove entirely — style guide CRUD moves to client-side (localStorage only)
- Style guide reference images stored in IndexedDB

**`/api/gallery`**:
- Remove entirely — gallery reads from localStorage + IndexedDB on the client

**`/api/upload`**:
- Remove entirely — reference image uploads go directly to IndexedDB on the client

**`/api/analyze-style`**:
- Keep as API route (calls Gemini)
- Receives style images as base64 in request body (client reads from IndexedDB)
- Returns analysis text (no filesystem writes)

**`/api/enhance-prompt`**:
- No changes needed (already stateless, just passes through to Gemini)
- Read API key from header instead of env

### Frontend Changes

**`src/components/api-key-gate.tsx`** (new):
- Wraps the app layout
- Checks localStorage for API key
- If missing: full-screen centered form with key input + "Save & Continue" button
- If present: renders children normally

**`src/store/app-store.ts`**:
- On init: load history/styleguides/settings from localStorage, resolve image blob URLs from IndexedDB
- On mutation (add asset, update settings, etc.): persist to localStorage/IndexedDB
- Add `apiKey` to store state
- Add actions for image blob URL resolution

**`src/app/generate/page.tsx`**:
- After generation: store images in IndexedDB, metadata in localStorage via store actions
- For refine/variations: read source image from IndexedDB, send as base64 in request
- Send API key header with all fetch calls

**`src/app/gallery/page.tsx`**:
- Load from store (which reads localStorage + IndexedDB) instead of fetching `/api/gallery`

**`src/app/style-guides/page.tsx`**:
- All CRUD operations use localStorage + IndexedDB directly (no API calls)
- Style analysis still calls `/api/analyze-style`

**Image display**:
- All `<img src="/outputs/...">` references change to blob URLs from IndexedDB
- On component mount, resolve blob URLs via `getImageURL()`
- GeneratedAsset type keeps `outputPath`/`thumbnailPath` as keys for IndexedDB lookup (not filesystem paths)

### Server-Side Files to Remove/Simplify

- `src/lib/storage.ts` — no longer needed (remove or keep as dead code)
- `src/app/api/gallery/route.ts` — remove
- `src/app/api/styleguide/route.ts` — remove
- `src/app/api/upload/route.ts` — remove
- `data/` directory — no longer written to at runtime
- `public/outputs/` and `public/references/` — no longer written to at runtime

### Image Processing

`src/lib/image-processing.ts` uses Sharp (server-side Node library). This still works in Vercel serverless functions. The flow:
1. Gemini returns image buffer to API route
2. API route runs Sharp resize/transparency/thumbnail
3. API route returns processed base64 to client
4. Client stores in IndexedDB

No change needed to image-processing.ts itself.

## Migration

Existing local data (in `data/*.json` and `public/outputs/`) won't automatically migrate. This is acceptable — the app is being redeployed as a web app. Users start fresh. No migration code needed.

## Files Summary

### New Files
- `src/lib/client-storage.ts` — IndexedDB + localStorage wrapper
- `src/components/api-key-gate.tsx` — API key input gate

### Modified Files
- `src/app/api/generate/route.ts` — return base64, read API key from header
- `src/app/api/generate/img2img/route.ts` — return base64, read API key from header
- `src/app/api/generate/refine/route.ts` — accept source image as base64 in body, return base64, read API key from header
- `src/app/api/generate/variations/route.ts` — accept source image as base64 in body, return base64, read API key from header
- `src/app/api/analyze-style/route.ts` — accept images as base64 in body, read API key from header
- `src/app/api/enhance-prompt/route.ts` — read API key from header
- `src/store/app-store.ts` — persist to localStorage/IndexedDB, load on init, manage blob URLs
- `src/app/generate/page.tsx` — client-side storage, API key header, blob URLs
- `src/app/gallery/page.tsx` — load from client storage
- `src/app/style-guides/page.tsx` — client-side CRUD
- `src/app/layout.tsx` — wrap with ApiKeyGate
- `src/lib/types.ts` — add API response types with base64 fields

### Removed Files
- `src/app/api/gallery/route.ts`
- `src/app/api/styleguide/route.ts`
- `src/app/api/upload/route.ts`
