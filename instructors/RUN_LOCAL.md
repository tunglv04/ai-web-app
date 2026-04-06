# Running the Project Locally

## Prerequisites

| Tool    | Version  | Install                                        |
|---------|----------|------------------------------------------------|
| Node.js | ≥ 18.x   | [https://nodejs.org](https://nodejs.org)       |
| Yarn    | ≥ 1.22   | `npm install -g yarn`                          |

You also need a **Google AI Studio API Key** — get one at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

---

## Quick Start

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd AI-web-app

# 2. Install dependencies
yarn install

# 3. Start the dev server
yarn dev
```

The app will be available at **http://localhost:3000**.

---

## First-Time Setup

1. Open **http://localhost:3000** in your browser.
2. Navigate to **General Image** from the hub page.
3. A modal will appear asking for your **Google AI Studio API Key**.
4. Paste your key and click **"Save Key & Continue"**.
5. The key is stored in your browser's `localStorage` — you won't be asked again unless you clear it or click **"Reset Key"**.

---

## Available Scripts

| Command        | Description                               |
|----------------|-------------------------------------------|
| `yarn dev`     | Start development server (port 3000)      |
| `yarn build`   | Create optimized production build         |
| `yarn start`   | Start production server (requires build)  |
| `yarn lint`    | Run ESLint checks                         |

---

## Troubleshooting

### Port 3000 is already in use
```bash
# Kill the process on port 3000
lsof -ti:3000 | xargs kill -9
# Or start on a different port
yarn dev -p 3001
```

### `yarn install` fails
```bash
# Clear cache and retry
rm -rf node_modules yarn.lock
yarn install
```

### API Key issues
- Open DevTools → Application → Local Storage → `localhost:3000`
- Delete the `google_ai_studio_key` entry
- Refresh the page — the modal will reappear