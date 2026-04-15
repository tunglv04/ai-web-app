# Rate & Refine Flow

## Problem

No way to iteratively improve generated images. Users generate an image, see issues, but can only regenerate from scratch or use generic variations.

## Solution

Add rate/refine controls to the asset detail modal. Users can thumbs-down an image, describe what's wrong, and click "Refine" to generate an improved version using the original image as a reference.

## Flow

1. User generates an image
2. Opens asset detail modal
3. Clicks thumbs up (marks as approved) or thumbs down
4. On thumbs down, a feedback text field appears
5. User types feedback (e.g. "colors too dark", "face looks wrong")
6. Clicks "Refine" — generates a new image using:
   - The current image as composition reference
   - The original prompt + feedback baked in
   - Style guide images if a guide was selected
   - AI Enhance rewrites if enabled
7. New image appears in gallery, linked to the original
8. Repeat until satisfied

## Data Changes

### `GeneratedAsset` (in `src/lib/types.ts`)

Add optional fields:

```typescript
refinedFrom?: string;  // ID of the source asset
feedback?: string;     // feedback text that led to this refinement
approved?: boolean;    // true if user gave thumbs up
```

## API

No new API routes. Reuse `/api/generate/img2img` for refinement:
- Send the current image as `composition` (composition reference)
- Send style guide images as `styleImages` (if guide active)
- Modify the prompt: `"[original prompt]. Refinement feedback: [user feedback]"`
- Settings carried over from the source asset

## UI Changes

### `src/components/asset-detail-modal.tsx`

Add to the modal:
- Thumbs up / thumbs down buttons below the image
- Feedback textarea (visible only after thumbs down)
- "Refine" button next to existing "Generate Variations" button
- Visual indicator for approved assets (e.g. green border or checkmark)

### `src/app/generate/page.tsx`

- Add `handleRefine(assetId: string, feedback: string)` function
- Reads the source asset, fetches its image, sends to img2img with feedback
- Passes the active style guide's images + settings

### `src/components/asset-grid.tsx`

- Show a small checkmark or green dot on approved assets in the grid

## No Changes To

- API routes (reuse img2img)
- Gemini module
- Prompt enhancer
- Style guides
- Storage/history format (just new optional fields on GeneratedAsset)
