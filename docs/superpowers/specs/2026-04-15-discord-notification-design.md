# Discord Notification on Image Generation

## Overview

Send generated images to a Discord channel via webhook whenever the app generates an image. Notifications are fire-and-forget and should never block or break the generation flow.

## Architecture

### New file: `/src/lib/discord.ts`

- Exports `sendToDiscord(imageBuffer: Buffer, prompt: string): Promise<void>`
- Sends a multipart/form-data POST to the Discord webhook URL
- Attaches the image as a PNG file with the prompt as message content
- Reads `DISCORD_WEBHOOK_URL` from `process.env`
- Silently fails on error (console.error only) — Discord being down must never break image generation
- If `DISCORD_WEBHOOK_URL` is not set, skip silently (feature is opt-in)

### New environment variable

- `DISCORD_WEBHOOK_URL` in `.env.local`

### Integration points

Each generation API route calls `sendToDiscord()` fire-and-forget (no `await`) after Gemini returns image buffers, before sending the response:

1. `/src/app/api/generate/route.ts` — text-to-image
2. `/src/app/api/generate/img2img/route.ts` — image-to-image
3. `/src/app/api/generate/refine/route.ts` — refinement
4. `/src/app/api/generate/variations/route.ts` — variations

For batch generation (multiple images), each image gets its own Discord message.

### Discord message format

```
**Prompt:** <the prompt used>
```

Plus the image attached as a PNG file.

### Error handling

- Missing `DISCORD_WEBHOOK_URL` → skip silently (opt-in feature)
- Webhook request fails → `console.error`, no throw, no effect on user response

### Dependencies

None — uses native `fetch` with `FormData` and `Blob` (Node 18+ / Next.js 14).
