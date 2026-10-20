# VisaHOBe Agent

A local-first starter for an AI browser workspace with a mobile-first Liquid Glass UI, Gemini chat, local Playwright/Chromium page inspection, PWA shell, and optional Browser Use Cloud API configuration.

## Honest implementation status

**Implemented in this starter:** responsive app UI; navigation for Home, Chat, Browser Agent, History, Projects, Skills, Knowledge, Files, Integrations, Settings; local theme toggle; PWA manifest and service worker; backend health checks; Gemini server-side chat; local Playwright page navigation, text extraction and screenshot capture; task state in the running backend; basic URL/IP safety checks; optional request to Browser Use API v4 using a server-side key.

**Not yet implemented:** autonomous model-driven browser action loop; clicking/filling/submitting forms; Browser Use CDP session attachment and remote browser cleanup; custom provider adapter; persistent database/cloud sync; real Google Workspace/GitHub/Vercel/Cloudflare OAuth/API operations; durable Knowledge Base/RAG; user authentication and multi-user authorization. These are shown as setup/planned states, not falsely reported as working.

The current task history is in memory and clears when the backend restarts. The app is intended for local single-user development and must not be exposed publicly without authentication, stronger isolation, durable storage, and a security review.

## Requirements

- Node.js 20+
- Chromium dependencies supported by Playwright
- Optional Google Gemini API key
- Optional Browser Use Cloud API key

## Run on Windows / macOS / Linux

```bash
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env locally; do not commit secrets.
npm start
```

On Windows PowerShell, copy the env file with `Copy-Item .env.example .env`.

Open http://127.0.0.1:8787 . To enable Gemini, set `GEMINI_API_KEY` in `.env` and restart the server. To enable the optional cloud browser request, set `BROWSER_USE_API_KEY`. Never paste keys into chat or commit them.

## Environment

- `PORT`: server port (default 8787)
- `HOST`: bind address (default 127.0.0.1; recommended for local use)
- `GEMINI_API_KEY`: optional server-side key
- `GEMINI_MODEL`: optional model ID (default `gemini-2.5-flash`)
- `BROWSER_USE_API_KEY`: optional server-side Browser Use API key
- `CORS_ORIGINS`: comma-separated allowed origins
- `BROWSER_ALLOWED_HOSTS`: optional comma-separated domain allowlist

## PWA

Serve over localhost for development or HTTPS in deployment. Use the browser's install menu / iOS Share → Add to Home Screen. The service worker caches only the app shell and deliberately does not cache `/api/` responses. For broad iOS icon compatibility, add PNG 192px and 512px icons before production release.

## Tests and checks

```bash
npm run check
npm test
```

The test suite currently checks IP range helpers only. Run a security audit and add authenticated API, DNS rebinding, redirect, browser isolation, task persistence, and real integration tests before production use.

## Deployment notes

The static frontend can be hosted on Vercel, but this Express + Playwright browser service needs a persistent Node/Docker host that supports Chromium and long-lived sessions. This repository does not include a verified live deployment. Do not deploy this unauthenticated backend to the public internet. Add authentication, durable storage, a trusted-host policy, request quotas, and complete SSRF/redirect protections first.
