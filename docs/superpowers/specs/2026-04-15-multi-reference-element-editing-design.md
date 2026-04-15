# Multi-Reference Element Editing

## Problem

The app currently supports a single composition reference with a generic "use as basis" instruction. Users need to provide multiple reference images (e.g., a house, custom characters) and specify element-level edits (replace mountain with house, swap characters, remove elements).

## Solution

Add support for **element reference images** (labeled replacement images) and **edit instructions** (text describing what to swap/remove) alongside the existing composition reference.

## UI Changes

### Generate Page (`src/app/generate/page.tsx`)

- **Composition reference**: Unchanged — the main image to base edits on
- **Element references**: New section below composition reference. Users upload multiple images, each with a short text label (e.g., "house", "my warrior character"). Appears only when a composition reference is present.
- **Edit instructions**: New textarea that appears when a composition reference is present. User describes what to change: "Replace the mountain with the house. Replace the witch with my warrior. Remove the ghost in the background."

### New Component: `ElementReferencesUpload` (`src/components/element-references-upload.tsx`)

- Dropzone for adding images
- Each uploaded image shows a thumbnail + editable text label input
- Remove button per image
- Max ~6 element references (Gemini context limit consideration)

## Backend Changes

### `src/lib/gemini.ts`

New parameter:

```typescript
elementImages?: { buffer: Buffer; label: string }[];
```

Prompt construction when element images are present:

```
This is the composition reference — the base image to modify. Keep the overall layout, style, and composition:
[composition image]

These are element reference images. Use them as visual references for replacements described in the edit instructions:
Element "house": [image]
Element "my warrior character": [image]

Edit instructions: Replace the mountain/rock with the house. Replace the witch girl with my warrior character. Remove the old woman ghost in the background.

[main prompt]
```

When element images are present, the composition reference instruction changes from "use as the basis for the idea" to "the base image to modify" to signal editing intent.

### `src/app/api/generate/img2img/route.ts`

Parse from FormData:
- `elementImages` — multiple files
- `elementLabels` — JSON array of labels (parallel to elementImages)
- `editInstructions` — string

Pass to `callGemini` as `elementImages` array.

### `src/lib/prompt-enhancer.ts`

When `editInstructions` is provided, include it in the enhancement context so the enhanced prompt accounts for the editing intent.

## Data Flow

1. User uploads composition reference (existing)
2. User uploads element references with labels (new)
3. User writes edit instructions (new)
4. User writes prompt + clicks Generate
5. Frontend sends FormData with composition, element images, element labels, edit instructions, and prompt
6. Backend constructs Gemini prompt with all images labeled and edit instructions included
7. Gemini generates edited image
8. Post-processing and save (existing)

## Files to Modify

1. `src/lib/gemini.ts` — add elementImages param, update prompt construction
2. `src/app/api/generate/img2img/route.ts` — parse element refs + edit instructions from FormData
3. `src/app/generate/page.tsx` — state for element refs, edit instructions, wire to API
4. `src/components/element-references-upload.tsx` — new component (multiple labeled refs)
5. `src/lib/prompt-enhancer.ts` — include edit instructions in context

## No Changes Needed

- `src/lib/types.ts` — element refs are transient (not saved to history), only the edit instructions text matters for history
- Refine flow — refinement already works with feedback text; element editing is a generation-time feature
- Style guides — orthogonal; style images still work as before
