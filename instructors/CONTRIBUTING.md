# Contributing Guide

## Getting Started

1. Clone the repository and follow [RUN_LOCAL.md](./RUN_LOCAL.md) to set up your environment.
2. Read [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) to understand the codebase.
3. Read [FEATURES.md](./FEATURES.md) to understand existing functionality.

---

## Development Workflow

### Branch Naming
```
feature/short-description    # New features
fix/short-description        # Bug fixes
refactor/short-description   # Code refactoring
```

### Commit Messages
Use clear, descriptive commit messages:
```
feat: add batch download for generated images
fix: handle empty response from Imagen API
refactor: extract prompt builder to utility function
```

---

## Code Conventions

### File Organization

| Type            | Location                     | Naming             |
|-----------------|------------------------------|---------------------|
| Pages           | `app/<route>/page.tsx`       | `page.tsx`          |
| API Routes      | `app/api/<name>/route.ts`    | `route.ts`          |
| Components      | `components/<feature>/`      | `PascalCase.tsx`    |
| Hooks           | `lib/hooks/`                 | `use-kebab-case.ts` |
| Utilities       | `lib/`                       | `kebab-case.ts`     |

### Component Guidelines

- **Client components** (`"use client"`) — Only when you need hooks, event handlers, or browser APIs.
- **Server components** (default) — For everything else. They render on the server and are faster.
- Keep components focused — one component per file.
- Export types alongside components when they're used externally (see `ImageGenerationConfig`).

### Styling
- Use **Tailwind CSS** utility classes.
- Use the design system tokens: `bg-background`, `text-foreground`, `text-accent`, `bg-accent`.
- For custom colors, add them to `globals.css` as CSS variables and map them in `tailwind.config.ts`.
- Prefer `transition-all` or specific transition properties for animations.

### API Routes
- Always validate the API key from `x-google-api-key` header.
- Return proper HTTP status codes (401 for auth, 400 for bad input, 500 for server errors).
- Use `try/catch` with meaningful error messages.

---

## Adding a New Feature Page

To add a new tool (e.g., "Text Generator"):

1. **Create the page:**
   ```
   app/text-generator/page.tsx
   ```

2. **Create components:**
   ```
   components/text-generator/TextGeneratorForm.tsx
   ```

3. **Create API route (if needed):**
   ```
   app/api/generate-text/route.ts
   ```

4. **Add to the Hub page** — Add a new card in `app/page.tsx` following the existing card pattern.

5. **Update documentation** — Add the new feature to `instructors/FEATURES.md`.

---

## Adding a New API Route

1. Create the route file at `app/api/<name>/route.ts`.
2. Export the appropriate HTTP method handler (`GET`, `POST`, etc.).
3. Always check for the API key:
   ```typescript
   const apiKey = req.headers.get("x-google-api-key");
   if (!apiKey) {
     return NextResponse.json({ error: "Missing API Key" }, { status: 401 });
   }
   ```
4. Wrap all logic in try/catch and return structured error responses.
5. Document the endpoint in `instructors/FEATURES.md`.

---

## Testing

Currently the project does not have automated tests. When adding:
- Use the `/api` routes for integration testing.
- Test with different API key states (missing, invalid, valid).
- Test responsive layouts at common breakpoints (mobile, tablet, desktop).

---

## Common Pitfalls

1. **localStorage on server** — Always guard with `typeof window !== "undefined"` or use the `useLocalStorage` hook.
2. **API key format** — The `useLocalStorage` hook JSON-stringifies values, so API keys stored by it have surrounding quotes. When reading directly from `localStorage`, remember to `JSON.parse`.
3. **Image model API format** — Gemini image preview models use `generateContent` (v1alpha), while Imagen models use `predict` (v1beta). The route handles both, but be careful when adding new models.
4. **Base64 image size** — Reference images are stored as base64 in memory and localStorage. Large images can cause performance issues or hit localStorage limits (~5MB).
