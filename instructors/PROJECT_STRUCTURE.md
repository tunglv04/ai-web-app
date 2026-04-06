# Project Structure

## Overview

**BaldEagle AI Hub** (a.k.a. Eagle AI Hub) is a Next.js 14 web application built for the Creative team at Eagle Games. It provides AI-powered tools for image and video generation using Google's Generative AI APIs (Gemini + Imagen).

---

## Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Framework   | Next.js 14 (App Router)                             |
| Language    | TypeScript                                          |
| Styling     | Tailwind CSS 3.4                                    |
| AI SDK      | `@google/genai` (Google Generative AI)              |
| Icons       | `lucide-react`                                      |
| Fonts       | Inter (via `next/font/google`)                      |
| Package Mgr | Yarn                                                |

---

## Directory Layout

```
AI-web-app/
├── app/                          # Next.js App Router (pages + API routes)
│   ├── layout.tsx                # Root layout (font, metadata, body)
│   ├── page.tsx                  # Homepage — Hub with 3 tool cards
│   ├── globals.css               # Global CSS variables + Tailwind base
│   │
│   ├── general-image/
│   │   └── page.tsx              # General Image tool (fully functional)
│   │
│   ├── creative-image/
│   │   └── page.tsx              # Creative Image (Coming Soon placeholder)
│   │
│   ├── creative-video/
│   │   └── page.tsx              # Creative Video (Coming Soon placeholder)
│   │
│   └── api/                      # Backend API routes (serverless)
│       ├── generate-image/
│       │   └── route.ts          # POST — Prompt expansion + image generation
│       └── models/
│           └── route.ts          # GET — Fetch available models from Google API
│
├── components/                   # Reusable React components
│   └── general-image/
│       ├── ApiKeyModal.tsx       # Modal to collect/store Google API key
│       └── ImageGenerationForm.tsx  # Full form: prompts, models, settings, refs
│
├── lib/                          # Shared utilities and hooks
│   └── hooks/
│       └── use-local-storage.ts  # Generic localStorage hook with SSR safety
│
├── instructors/                  # Project documentation (this folder)
│
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind theme (custom colors)
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
└── .gitignore                    # Git ignore rules
```

---

## Page Routing

| Route              | File                              | Status       |
|--------------------|-----------------------------------|--------------|
| `/`                | `app/page.tsx`                    | ✅ Active    |
| `/general-image`   | `app/general-image/page.tsx`      | ✅ Active    |
| `/creative-image`  | `app/creative-image/page.tsx`     | 🔜 Coming Soon |
| `/creative-video`  | `app/creative-video/page.tsx`     | 🔜 Coming Soon |

---

## API Routes

| Endpoint               | Method | Purpose                                              |
|------------------------|--------|------------------------------------------------------|
| `/api/generate-image`  | POST   | Expand prompt via Gemini → Generate via Imagen/Gemini |
| `/api/models`          | GET    | Fetch available models for the given API key          |

Both routes receive the API key via the `x-google-api-key` custom header.

---

## Design System

The app uses a dark theme with gold accent colors defined as CSS custom properties:

```css
:root {
  --background: #0a0a0a;
  --foreground: #ffffff;
  --accent: #eab308;        /* Gold */
  --accent-hover: #ca8a04;  /* Darker gold */
}
```

These are mapped into Tailwind via `tailwind.config.ts` so you can use `bg-background`, `text-accent`, etc.
