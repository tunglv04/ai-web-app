# Deployment Guide

## Production Build

```bash
# Build the optimized production bundle
yarn build

# Test the production build locally
yarn start
```

The production server runs on **http://localhost:3000** by default.

---

## Deploy to Vercel (Recommended)

Vercel is the creators of Next.js and provides the easiest deployment path.

### Method 1: Git Integration (Recommended)
1. Push your code to GitHub/GitLab/Bitbucket.
2. Go to [https://vercel.com](https://vercel.com) and sign in.
3. Click **"Add New Project"** → Import your repository.
4. Vercel auto-detects Next.js — no configuration needed.
5. Click **"Deploy"**.

Every push to `main` will trigger a new deployment automatically.

### Method 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow the prompts)
vercel

# Deploy to production
vercel --prod
```

---

## Deploy to Other Platforms

### Docker

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

> **Note:** For standalone Docker builds, update `next.config.mjs`:
> ```js
> const nextConfig = { output: 'standalone' };
> ```

```bash
# Build and run
docker build -t eagle-ai-hub .
docker run -p 3000:3000 eagle-ai-hub
```

### Static Export (Not Recommended)
This app uses API routes (serverless functions), so **static export is not supported**. You must deploy to a platform that supports Node.js server-side rendering.

---

## Environment Variables

This project **does not use server-side environment variables** by default. The Google API key is provided by each user through the browser and stored in `localStorage`.

If you want to add a default/fallback API key on the server, you could create a `.env.local` file:

```env
GOOGLE_API_KEY=your_key_here
```

Then modify the API routes to fall back to this key when no client key is provided.

---

## Post-Deployment Checklist

- [ ] Verify the app loads at the deployed URL
- [ ] Navigate to General Image and enter an API key
- [ ] Generate a test image successfully
- [ ] Verify the "Reset Key" button works
- [ ] Check that saved settings persist across page reloads
- [ ] Test on mobile viewport sizes
