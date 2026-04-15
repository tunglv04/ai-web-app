# Discord Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send generated images with their prompt to a Discord channel via webhook whenever the app generates an image.

**Architecture:** A single utility module (`/src/lib/discord.ts`) exports a `sendToDiscord()` function that POSTs an image buffer + prompt text to a Discord webhook URL. Each generation API route calls it fire-and-forget after producing images. The webhook URL comes from `process.env.DISCORD_WEBHOOK_URL`; if unset, the function is a no-op.

**Tech Stack:** Next.js 14, native `fetch` with `FormData`/`Blob`, Jest for testing.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/discord.ts` | `sendToDiscord()` utility — POST image + prompt to Discord webhook |
| Create | `src/lib/__tests__/discord.test.ts` | Unit tests for `sendToDiscord()` |
| Modify | `src/app/api/generate/route.ts` | Call `sendToDiscord()` after generating images |
| Modify | `src/app/api/generate/img2img/route.ts` | Call `sendToDiscord()` after generating images |
| Modify | `src/app/api/generate/refine/route.ts` | Call `sendToDiscord()` after generating images |
| Modify | `src/app/api/generate/variations/route.ts` | Call `sendToDiscord()` after generating images |
| Modify | `.env.local` | Add `DISCORD_WEBHOOK_URL` variable |

---

### Task 1: Create `sendToDiscord` utility with tests

**Files:**
- Create: `src/lib/discord.ts`
- Create: `src/lib/__tests__/discord.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/discord.test.ts`:

```typescript
import { sendToDiscord } from "../discord";

// Save original env
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

describe("sendToDiscord", () => {
  test("sends image and prompt to Discord webhook", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: true });

    const imageBuffer = Buffer.from("fake-png-data");
    await sendToDiscord(imageBuffer, "a cute pixel dragon");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://discord.com/api/webhooks/test/token");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  test("includes prompt in payload_json", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: true });

    await sendToDiscord(Buffer.from("fake"), "test prompt");

    const [, options] = mockFetch.mock.calls[0];
    const formData = options.body as FormData;
    const payloadJson = formData.get("payload_json") as string;
    const payload = JSON.parse(payloadJson);
    expect(payload.content).toContain("test prompt");
  });

  test("skips silently when DISCORD_WEBHOOK_URL is not set", async () => {
    delete process.env.DISCORD_WEBHOOK_URL;
    const mockFetch = global.fetch as jest.Mock;

    await sendToDiscord(Buffer.from("fake"), "test");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("does not throw when webhook request fails", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockRejectedValue(new Error("Network error"));

    // Should not throw
    await expect(sendToDiscord(Buffer.from("fake"), "test")).resolves.toBeUndefined();
  });

  test("does not throw when webhook returns non-ok status", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: false, status: 429, statusText: "Too Many Requests" });

    await expect(sendToDiscord(Buffer.from("fake"), "test")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/__tests__/discord.test.ts --verbose`
Expected: FAIL — "Cannot find module '../discord'"

- [ ] **Step 3: Implement `sendToDiscord`**

Create `src/lib/discord.ts`:

```typescript
export async function sendToDiscord(
  imageBuffer: Buffer,
  prompt: string
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const formData = new FormData();

    const blob = new Blob([imageBuffer], { type: "image/png" });
    formData.set("file", blob, "generated.png");

    formData.set(
      "payload_json",
      JSON.stringify({
        content: `**Prompt:** ${prompt}`,
      })
    );

    const response = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error(
        `Discord webhook failed: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("Discord webhook error:", error);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/discord.test.ts --verbose`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/discord.ts src/lib/__tests__/discord.test.ts
git commit -m "feat: add sendToDiscord utility for webhook notifications"
```

---

### Task 2: Add `DISCORD_WEBHOOK_URL` to environment

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add the environment variable**

Append to `.env.local`:

```
DISCORD_WEBHOOK_URL=
```

Leave the value empty — the user will fill in their own webhook URL.

- [ ] **Step 2: Commit**

```bash
git add .env.local
git commit -m "feat: add DISCORD_WEBHOOK_URL env variable"
```

---

### Task 3: Integrate into `/api/generate` (text-to-image)

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Add import and fire-and-forget calls**

At the top of `src/app/api/generate/route.ts`, add the import:

```typescript
import { sendToDiscord } from "@/lib/discord";
```

Inside the `for` loop, after `results.push(...)` (after line 58), add:

```typescript
      sendToDiscord(imageBuffer, prompt);
```

No `await` — this is fire-and-forget. The call uses `imageBuffer` (the final post-processed buffer) and the original `prompt`.

- [ ] **Step 2: Verify the app still builds**

Run: `npx next build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: send generated images to Discord from text-to-image route"
```

---

### Task 4: Integrate into `/api/generate/img2img`

**Files:**
- Modify: `src/app/api/generate/img2img/route.ts`

- [ ] **Step 1: Add import and fire-and-forget calls**

At the top of `src/app/api/generate/img2img/route.ts`, add the import:

```typescript
import { sendToDiscord } from "@/lib/discord";
```

Inside the `for` loop, after `results.push(...)` (after line 100), add:

```typescript
      sendToDiscord(imageBuffer, prompt);
```

- [ ] **Step 2: Verify the app still builds**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/img2img/route.ts
git commit -m "feat: send generated images to Discord from img2img route"
```

---

### Task 5: Integrate into `/api/generate/refine`

**Files:**
- Modify: `src/app/api/generate/refine/route.ts`

- [ ] **Step 1: Add import and fire-and-forget calls**

At the top of `src/app/api/generate/refine/route.ts`, add the import:

```typescript
import { sendToDiscord } from "@/lib/discord";
```

Inside the `for` loop, after `results.push(...)` (after line 80), add:

```typescript
      sendToDiscord(imageBuffer, prompt);
```

Note: In the refine route, the original `prompt` variable (from form data) is used — not `refinedPrompt` — to keep the Discord message showing what the user originally asked for.

- [ ] **Step 2: Verify the app still builds**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/refine/route.ts
git commit -m "feat: send generated images to Discord from refine route"
```

---

### Task 6: Integrate into `/api/generate/variations`

**Files:**
- Modify: `src/app/api/generate/variations/route.ts`

- [ ] **Step 1: Add import and fire-and-forget calls**

At the top of `src/app/api/generate/variations/route.ts`, add the import:

```typescript
import { sendToDiscord } from "@/lib/discord";
```

Inside the `for` loop, after `results.push(...)` (after line 68), add:

```typescript
      sendToDiscord(imageBuffer, sourceAsset.prompt);
```

Note: Uses `sourceAsset.prompt` since this route generates variations of an existing asset.

- [ ] **Step 2: Verify the app still builds**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/variations/route.ts
git commit -m "feat: send generated images to Discord from variations route"
```

---

### Task 7: Full test run and final verification

- [ ] **Step 1: Run all tests**

Run: `npx jest --verbose`
Expected: All tests pass (existing + new discord tests)

- [ ] **Step 2: Build check**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 3: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "feat: Discord notification integration complete"
```
