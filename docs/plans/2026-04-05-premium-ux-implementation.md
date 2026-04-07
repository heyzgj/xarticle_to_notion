# Premium UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the X Article to Notion Chrome extension from engineering prototype to premium, Chrome Web Store-ready product with OAuth onboarding, one-click save, and polished UI.

**Architecture:** Four surfaces — (1) Welcome tab for first-time onboarding + Notion OAuth, (2) Popup for daily quick-save, (3) Minimal settings page, (4) Cloudflare Worker for OAuth token exchange. The extension keeps its existing content script detection/extraction and Notion API integration intact — this plan only touches UI, auth flow, and the new worker.

**Tech Stack:** TypeScript, Webpack 5, Chrome Extension Manifest V3, Cloudflare Workers (Wrangler), Notion OAuth 2.0

**Design doc:** `docs/plans/2026-04-05-premium-ux-redesign.md`

**Project root:** `/Users/supergeorge/project/xarticle_to_notion`

---

## Task 1: Design System CSS Foundation

**Files:**
- Create: `src/shared/design-tokens.css`
- Create: `src/shared/base.css`

**Step 1: Create shared CSS directory**

```bash
mkdir -p src/shared
```

**Step 2: Write design tokens**

Create `src/shared/design-tokens.css`:

```css
:root {
  /* Colors */
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;
  --text-disabled: #D1D5DB;
  --surface: #FFFFFF;
  --background: #FAFAFA;
  --border: #E5E7EB;
  --brand: #1d9bf0;
  --brand-hover: #1a8cd8;
  --brand-active: #1680c9;
  --success: #10B981;
  --error: #DC2626;
  --error-bg: #FEF2F2;
  --error-border: #FECACA;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 999px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-button-hover: 0 2px 8px rgba(29,155,240,0.25);
  --shadow-focus: 0 0 0 3px rgba(29,155,240,0.12);

  /* Motion */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 300ms;
}
```

**Step 3: Write base styles**

Create `src/shared/base.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: rgba(29, 155, 240, 0.15);
}

/* Shared button styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  outline: none;
}

.btn:focus-visible {
  box-shadow: var(--shadow-focus);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--brand);
  color: #fff;
  padding: 10px 20px;
  height: 40px;
}

.btn-primary:hover:not(:disabled) {
  background: var(--brand-hover);
  box-shadow: var(--shadow-button-hover);
}

.btn-primary:active:not(:disabled) {
  background: var(--brand-active);
  transform: scale(0.98);
  box-shadow: none;
}

.btn-primary.btn-large {
  height: 48px;
  font-size: 15px;
  border-radius: var(--radius-lg);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  padding: 6px 12px;
  border: 1px solid var(--border);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--background);
}

.btn-full {
  width: 100%;
}

/* Shared input styles */
.input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  background: var(--surface);
  outline: none;
  transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
}

.input::placeholder {
  color: #C9CDD3;
}

.input:focus {
  border-color: var(--brand);
  box-shadow: var(--shadow-focus);
}

/* Shared label styles */
.label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

/* Fade-up entrance animation */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeUp var(--duration-normal) var(--ease-standard) both;
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spinner--dark {
  border-color: var(--border);
  border-top-color: var(--brand);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Step 4: Update webpack to handle shared CSS**

Modify `webpack.config.js` — no change needed since CSS imports are already handled by css-loader + MiniCssExtractPlugin. The shared CSS will be imported by each entry point's CSS file.

**Step 5: Commit**

```bash
git add src/shared/
git commit -m "feat: add design system tokens and shared base CSS"
```

---

## Task 2: Cloudflare Worker — OAuth Token Exchange

**Files:**
- Create: `worker/wrangler.toml`
- Create: `worker/src/index.ts`
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`

**Step 1: Scaffold the worker project**

```bash
mkdir -p worker/src
```

**Step 2: Write worker/package.json**

```json
{
  "name": "x2notion-oauth-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.7.3"
  }
}
```

**Step 3: Write worker/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src"]
}
```

**Step 4: Write worker/wrangler.toml**

```toml
name = "x2notion-oauth"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
NOTION_CLIENT_ID = ""
# NOTION_CLIENT_SECRET goes in wrangler secrets, not here
```

Note: Before deploying, the user must run:
- `wrangler secret put NOTION_CLIENT_SECRET` (from Notion integration page)
- Set `NOTION_CLIENT_ID` in wrangler.toml (public, safe to commit)
- The user also needs to create a Notion OAuth integration at https://www.notion.so/my-integrations
  and set the redirect URI to `https://x2notion-oauth.<account>.workers.dev/callback`

**Step 5: Write worker/src/index.ts**

```typescript
interface Env {
  NOTION_CLIENT_ID: string;
  NOTION_CLIENT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      const extensionId = url.searchParams.get('extension_id');
      if (!extensionId) {
        return new Response('Missing extension_id', { status: 400 });
      }
      const state = extensionId;
      const redirectUri = `${url.origin}/callback`;
      const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${env.NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      return Response.redirect(notionAuthUrl, 302);
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const extensionId = url.searchParams.get('state');
      if (!code || !extensionId) {
        return new Response('Missing code or state', { status: 400 });
      }

      const redirectUri = `${url.origin}/callback`;
      const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`)}`,
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        return new Response(`OAuth failed: ${error}`, { status: 500 });
      }

      const data = await tokenResponse.json() as {
        access_token: string;
        workspace_name: string;
        workspace_id: string;
      };

      // Redirect back to the extension's welcome page with the token data
      const params = new URLSearchParams({
        access_token: data.access_token,
        workspace_name: data.workspace_name,
        workspace_id: data.workspace_id,
      });
      const extensionUrl = `chrome-extension://${extensionId}/welcome.html?${params.toString()}`;
      return Response.redirect(extensionUrl, 302);
    }

    return new Response('Not found', { status: 404 });
  },
};
```

**Step 6: Install worker dependencies**

```bash
cd worker && npm install
```

**Step 7: Commit**

```bash
git add worker/
git commit -m "feat: add Cloudflare Worker for Notion OAuth token exchange"
```

---

## Task 3: Update Types and Storage for OAuth

**Files:**
- Modify: `src/types/settings.ts`
- Modify: `src/types/messages.ts`
- Modify: `src/utils/storage.ts`
- Modify: `src/utils/constants.ts`

**Step 1: Update settings type**

Replace `src/types/settings.ts` entirely:

```typescript
export interface ExtensionSettings {
  notionApiToken: string;
  databaseId: string;
  workspaceName?: string;
  workspaceId?: string;
  databaseName?: string;
  expandFormByDefault?: boolean;
}
```

**Step 2: Update message types**

Replace `src/types/messages.ts` entirely:

```typescript
import type { ArticleData } from './article';

export type Message =
  | { type: 'EXTRACT_ARTICLE' }
  | { type: 'ARTICLE_DATA'; data: ArticleData }
  | { type: 'ARTICLE_NOT_FOUND' }
  | { type: 'GET_CATEGORIES' }
  | { type: 'CATEGORIES_RESULT'; categories: string[] }
  | { type: 'CREATE_CATEGORY'; name: string }
  | { type: 'CREATE_CATEGORY_RESULT'; success: boolean; error?: string }
  | { type: 'SAVE_TO_NOTION'; article: ArticleData; category: string; tags: string[] }
  | { type: 'SAVE_RESULT'; success: boolean; pageUrl?: string; error?: string }
  | { type: 'CHECK_CONFIGURED' }
  | { type: 'CONFIGURED_RESULT'; configured: boolean }
  | { type: 'CREATE_DATABASE' }
  | { type: 'CREATE_DATABASE_RESULT'; success: boolean; databaseId?: string; error?: string }
  | { type: 'LIST_DATABASES' }
  | { type: 'LIST_DATABASES_RESULT'; databases: Array<{ id: string; title: string }> }
  | { type: 'GET_CONNECTION_STATUS' }
  | { type: 'CONNECTION_STATUS'; connected: boolean; workspaceName?: string; databaseName?: string };
```

**Step 3: Update constants**

Add to `src/utils/constants.ts`:

```typescript
export const NOTION_API_BASE = 'https://api.notion.com/v1';
export const NOTION_VERSION = '2022-06-28';
export const CATEGORY_CACHE_TTL = 5 * 60 * 1000;
export const CATEGORY_CACHE_KEY = 'categoryCache';
export const NOTION_MAX_BLOCKS_PER_REQUEST = 100;
export const OAUTH_WORKER_URL = 'https://x2notion-oauth.<WORKER_SUBDOMAIN>.workers.dev';
export const FORM_EXPANDED_KEY = 'formExpanded';
```

Note: `<WORKER_SUBDOMAIN>` must be replaced with the actual Cloudflare Workers subdomain after first deploy.

**Step 4: Update storage utilities**

Replace `src/utils/storage.ts` entirely:

```typescript
import type { ExtensionSettings } from '../types/settings';

const SETTINGS_KEY = 'extensionSettings';

export async function getSettings(): Promise<ExtensionSettings | null> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] ?? null;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export function isConfigured(settings: ExtensionSettings | null): boolean {
  return !!(settings?.notionApiToken && settings?.databaseId);
}

export async function getFormExpanded(): Promise<boolean> {
  const result = await chrome.storage.local.get('formExpanded');
  return result.formExpanded ?? false;
}

export async function setFormExpanded(expanded: boolean): Promise<void> {
  await chrome.storage.local.set({ formExpanded: expanded });
}
```

**Step 5: Commit**

```bash
git add src/types/ src/utils/
git commit -m "feat: update types and storage for OAuth flow and new UI states"
```

---

## Task 4: Background Worker — New Message Handlers

**Files:**
- Modify: `src/background/index.ts`
- Modify: `src/background/messageHandler.ts`
- Modify: `src/background/notionApi.ts`

**Step 1: Add onInstalled listener to background/index.ts**

Replace `src/background/index.ts`:

```typescript
import { handleMessage } from './messageHandler';
import type { Message } from '../types/messages';

// Open welcome tab on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});
```

**Step 2: Add new handlers to messageHandler.ts**

Replace `src/background/messageHandler.ts`:

```typescript
import type { Message } from '../types/messages';
import { getSettings, isConfigured, saveSettings } from '../utils/storage';
import { saveArticle, getCategories, createX2NotionDatabase, listDatabases } from './notionApi';
import { getCachedCategories, invalidateCache } from './categoryCache';

export async function handleMessage(message: Message): Promise<Message> {
  switch (message.type) {
    case 'CHECK_CONFIGURED': {
      const settings = await getSettings();
      return { type: 'CONFIGURED_RESULT', configured: isConfigured(settings) };
    }

    case 'GET_CATEGORIES': {
      try {
        const categories = await getCachedCategories();
        return { type: 'CATEGORIES_RESULT', categories };
      } catch {
        return { type: 'CATEGORIES_RESULT', categories: [] };
      }
    }

    case 'CREATE_CATEGORY': {
      await invalidateCache();
      return { type: 'CREATE_CATEGORY_RESULT', success: true };
    }

    case 'SAVE_TO_NOTION': {
      try {
        const result = await saveArticle(message.article, message.category, message.tags);
        await invalidateCache();
        return { type: 'SAVE_RESULT', success: true, pageUrl: result.url };
      } catch (e) {
        return { type: 'SAVE_RESULT', success: false, error: (e as Error).message };
      }
    }

    case 'CREATE_DATABASE': {
      try {
        const settings = await getSettings();
        if (!settings?.notionApiToken) {
          return { type: 'CREATE_DATABASE_RESULT', success: false, error: 'Not connected' };
        }
        const db = await createX2NotionDatabase(settings.notionApiToken);
        await saveSettings({
          ...settings,
          databaseId: db.id,
          databaseName: 'X2Notion',
        });
        return { type: 'CREATE_DATABASE_RESULT', success: true, databaseId: db.id };
      } catch (e) {
        return { type: 'CREATE_DATABASE_RESULT', success: false, error: (e as Error).message };
      }
    }

    case 'LIST_DATABASES': {
      try {
        const databases = await listDatabases();
        return { type: 'LIST_DATABASES_RESULT', databases };
      } catch {
        return { type: 'LIST_DATABASES_RESULT', databases: [] };
      }
    }

    case 'GET_CONNECTION_STATUS': {
      const settings = await getSettings();
      if (!isConfigured(settings)) {
        return { type: 'CONNECTION_STATUS', connected: false };
      }
      return {
        type: 'CONNECTION_STATUS',
        connected: true,
        workspaceName: settings!.workspaceName,
        databaseName: settings!.databaseName,
      };
    }

    default:
      return { type: 'CONFIGURED_RESULT', configured: false };
  }
}
```

**Step 3: Add createX2NotionDatabase and listDatabases to notionApi.ts**

Add these two functions at the end of `src/background/notionApi.ts`, before the `sleep` helper:

```typescript
export async function createX2NotionDatabase(token: string): Promise<{ id: string }> {
  // Search for a parent page to create the database in
  const searchResult = await notionFetch('/search', 'POST', {
    filter: { value: 'page', property: 'object' },
    page_size: 1,
  }) as { results: Array<{ id: string }> };

  // Use the first available page, or create at workspace top level
  const parent = searchResult.results.length > 0
    ? { type: 'page_id' as const, page_id: searchResult.results[0].id }
    : { type: 'workspace' as const, workspace: true };

  const result = await notionFetch('/databases', 'POST', {
    parent,
    title: [{ type: 'text', text: { content: 'X2Notion' } }],
    properties: {
      Title: { title: {} },
      URL: { url: {} },
      Author: { rich_text: {} },
      Handle: { rich_text: {} },
      Published: { date: {} },
      Saved: { date: {} },
      Category: { select: { options: [] } },
      Tags: { multi_select: { options: [] } },
    },
  }) as { id: string };

  return { id: result.id };
}

export async function listDatabases(): Promise<Array<{ id: string; title: string }>> {
  const settings = await getSettings();
  if (!settings?.notionApiToken) return [];

  const result = await notionFetch('/search', 'POST', {
    filter: { value: 'database', property: 'object' },
    page_size: 50,
  }) as { results: Array<{ id: string; title: Array<{ plain_text: string }> }> };

  return result.results.map(db => ({
    id: db.id,
    title: db.title.map(t => t.plain_text).join('') || 'Untitled',
  }));
}
```

Also add the import for `getSettings` at the top of notionApi.ts:

```typescript
import { getSettings } from '../utils/storage';
```

**Step 4: Commit**

```bash
git add src/background/
git commit -m "feat: add OAuth onboarding handlers and database creation to background worker"
```

---

## Task 5: Welcome Page — HTML + CSS + TypeScript

**Files:**
- Create: `src/welcome/welcome.html`
- Create: `src/welcome/welcome.css`
- Create: `src/welcome/index.ts`
- Modify: `webpack.config.js` (add entry point)
- Modify: `public/manifest.json` (declare welcome.html as web_accessible_resource)

**Step 1: Create welcome directory**

```bash
mkdir -p src/welcome
```

**Step 2: Write welcome.html**

Create `src/welcome/welcome.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>X Article to Notion</title>
  <link rel="stylesheet" href="welcome.css">
</head>
<body>
  <div class="container">

    <!-- Step 1: Connect -->
    <div id="step-connect" class="step">
      <div class="hero">
        <img src="icons/icon128.png" alt="X2Notion" class="hero-icon" width="64" height="64">
        <h1>X Article to Notion</h1>
        <p class="subtitle">Save X articles to Notion in one click.</p>
      </div>

      <div class="how-it-works">
        <div class="step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <div class="step-title">Read an article on X</div>
            <div class="step-desc">Find a long-form post worth keeping</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <div class="step-title">Click the extension icon</div>
            <div class="step-desc">We'll detect and preview the article</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <div class="step-title">Saved to Notion</div>
            <div class="step-desc">Title, author, full text — all captured</div>
          </div>
        </div>
      </div>

      <button id="btn-connect" class="btn btn-primary btn-large btn-full">
        Connect to Notion
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <p class="privacy">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M12 7H4a1 1 0 00-1 1v5a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Your data stays in your browser. We never store or access your Notion content.
      </p>
    </div>

    <!-- Step 2: Choose database -->
    <div id="step-database" class="step" hidden>
      <div class="hero">
        <div class="check-circle animate-in">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path class="check-path" d="M10 16l4 4 8-8" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h1>Connected!</h1>
        <p class="subtitle">Where should we save your articles?</p>
      </div>

      <div class="db-options">
        <button id="btn-create-db" class="db-option db-option--recommended">
          <div class="db-option-badge">Recommended</div>
          <div class="db-option-title">Create "X2Notion" for me</div>
          <div class="db-option-desc">We'll set up a ready-to-go database in your Notion workspace.</div>
        </button>

        <button id="btn-existing-db" class="db-option">
          <div class="db-option-title">Use an existing database</div>
          <div class="db-option-desc">Pick one you've already set up.</div>
        </button>
      </div>

      <!-- Database picker (hidden until "Use existing" clicked) -->
      <div id="db-picker" hidden>
        <select id="db-select" class="input">
          <option value="">Select a database...</option>
        </select>
        <button id="btn-use-selected" class="btn btn-primary btn-full" style="margin-top: 12px" disabled>Use this database</button>
      </div>

      <div id="db-loading" hidden>
        <div class="spinner spinner--dark" style="width: 24px; height: 24px; border-width: 3px; margin: 20px auto;"></div>
        <p class="text-center text-muted">Setting up your database...</p>
      </div>
    </div>

    <!-- Step 3: All set -->
    <div id="step-done" class="step" hidden>
      <div class="hero">
        <div class="check-circle animate-in">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path class="check-path" d="M10 16l4 4 8-8" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h1>You're all set!</h1>
        <p class="subtitle">Articles will be saved to: <strong id="db-name">X2Notion</strong></p>
      </div>

      <div class="next-step">
        <p>Now visit any X article and click the extension icon in your toolbar.</p>
      </div>
    </div>

  </div>
  <script src="welcome.js"></script>
</body>
</html>
```

**Step 3: Write welcome.css**

Create `src/welcome/welcome.css` — full premium CSS for the onboarding page. This is a long file — see design doc for all token values.

```css
@import '../shared/design-tokens.css';
@import '../shared/base.css';

body {
  background: var(--background);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: 80px 20px;
}

.container {
  width: 100%;
  max-width: 480px;
}

/* Steps */
.step {
  background: var(--surface);
  border-radius: var(--radius-2xl);
  padding: 40px 36px;
  box-shadow: var(--shadow-card);
  animation: fadeUp var(--duration-normal) var(--ease-standard) both;
}

.step[hidden] {
  display: none;
}

/* Hero */
.hero {
  text-align: center;
  margin-bottom: 32px;
}

.hero-icon {
  margin-bottom: 16px;
  border-radius: var(--radius-xl);
}

.hero h1 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.subtitle strong {
  color: var(--text-primary);
  font-weight: 600;
}

/* How it works */
.how-it-works {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(29, 155, 240, 0.1);
  color: var(--brand);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.step-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Privacy */
.privacy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.privacy svg {
  flex-shrink: 0;
  color: var(--text-disabled);
}

/* Check circle */
.check-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--success);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.check-path {
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: drawCheck var(--duration-slow) ease-out 0.2s forwards;
}

@keyframes drawCheck {
  to { stroke-dashoffset: 0; }
}

/* Database options */
.db-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.db-option {
  width: 100%;
  padding: 16px;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius-xl);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease;
  position: relative;
}

.db-option:hover {
  border-color: var(--brand);
  background: rgba(29, 155, 240, 0.02);
}

.db-option--recommended {
  border-color: var(--brand);
  background: rgba(29, 155, 240, 0.03);
}

.db-option-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.db-option-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.db-option-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Database picker */
#db-picker select {
  font-family: inherit;
}

/* Next step */
.next-step {
  text-align: center;
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Utilities */
.text-center { text-align: center; }
.text-muted { color: var(--text-muted); font-size: 13px; }
```

**Step 4: Write welcome/index.ts**

Create `src/welcome/index.ts`:

```typescript
import type { Message } from '../types/messages';
import { saveSettings, getSettings } from '../utils/storage';
import { OAUTH_WORKER_URL } from '../utils/constants';

const stepConnect = document.getElementById('step-connect')!;
const stepDatabase = document.getElementById('step-database')!;
const stepDone = document.getElementById('step-done')!;
const btnConnect = document.getElementById('btn-connect')!;
const btnCreateDb = document.getElementById('btn-create-db')!;
const btnExistingDb = document.getElementById('btn-existing-db')!;
const dbPicker = document.getElementById('db-picker')!;
const dbSelect = document.getElementById('db-select') as HTMLSelectElement;
const btnUseSelected = document.getElementById('btn-use-selected')!;
const dbLoading = document.getElementById('db-loading')!;
const dbNameEl = document.getElementById('db-name')!;

function showStep(step: HTMLElement) {
  [stepConnect, stepDatabase, stepDone].forEach(s => s.hidden = true);
  step.hidden = false;
}

async function sendMessage(msg: Message): Promise<Message> {
  return chrome.runtime.sendMessage(msg);
}

// Check if we're returning from OAuth (URL has access_token param)
async function checkOAuthReturn() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const workspaceName = params.get('workspace_name');
  const workspaceId = params.get('workspace_id');

  if (accessToken) {
    // Save the token
    const existing = await getSettings();
    await saveSettings({
      ...existing,
      notionApiToken: accessToken,
      databaseId: existing?.databaseId ?? '',
      workspaceName: workspaceName ?? undefined,
      workspaceId: workspaceId ?? undefined,
    });

    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);

    // Move to database step
    showStep(stepDatabase);
    return true;
  }
  return false;
}

// Connect button — start OAuth
btnConnect.addEventListener('click', () => {
  const extensionId = chrome.runtime.id;
  window.location.href = `${OAUTH_WORKER_URL}/auth?extension_id=${extensionId}`;
});

// Create X2Notion database
btnCreateDb.addEventListener('click', async () => {
  dbLoading.hidden = false;
  btnCreateDb.setAttribute('disabled', '');
  btnExistingDb.setAttribute('disabled', '');

  const result = await sendMessage({ type: 'CREATE_DATABASE' });

  if (result.type === 'CREATE_DATABASE_RESULT' && result.success) {
    dbNameEl.textContent = 'X2Notion';
    showStep(stepDone);
  } else {
    dbLoading.hidden = true;
    btnCreateDb.removeAttribute('disabled');
    btnExistingDb.removeAttribute('disabled');
    alert('Could not create database. Please try again.');
  }
});

// Use existing database
btnExistingDb.addEventListener('click', async () => {
  dbPicker.hidden = false;
  btnExistingDb.classList.add('db-option--recommended');
  btnCreateDb.classList.remove('db-option--recommended');

  // Load databases
  const result = await sendMessage({ type: 'LIST_DATABASES' });
  if (result.type === 'LIST_DATABASES_RESULT') {
    // Clear existing options
    while (dbSelect.options.length > 1) dbSelect.remove(1);

    for (const db of result.databases) {
      const option = document.createElement('option');
      option.value = db.id;
      option.textContent = db.title;
      dbSelect.appendChild(option);
    }
  }
});

// Database select change
dbSelect.addEventListener('change', () => {
  btnUseSelected.toggleAttribute('disabled', !dbSelect.value);
});

// Use selected database
btnUseSelected.addEventListener('click', async () => {
  const dbId = dbSelect.value;
  const dbName = dbSelect.options[dbSelect.selectedIndex].textContent ?? '';
  if (!dbId) return;

  const settings = await getSettings();
  await saveSettings({
    ...settings!,
    databaseId: dbId,
    databaseName: dbName,
  });

  dbNameEl.textContent = dbName;
  showStep(stepDone);
});

// Initialize
checkOAuthReturn().then(returned => {
  if (!returned) {
    // Check if already configured (user revisiting welcome page)
    getSettings().then(settings => {
      if (settings?.notionApiToken && settings?.databaseId) {
        dbNameEl.textContent = settings.databaseName ?? 'X2Notion';
        showStep(stepDone);
      }
    });
  }
});
```

**Step 5: Add welcome entry point to webpack.config.js**

Add `welcome: './src/welcome/index.ts'` to the entry object in `webpack.config.js`. Also add the welcome.html to the CopyPlugin or HtmlWebpackPlugin patterns (same approach as popup.html and options.html are handled).

Modify `webpack.config.js` entry:

```javascript
entry: {
  content: './src/content/index.ts',
  background: './src/background/index.ts',
  popup: './src/popup/index.ts',
  options: './src/options/index.ts',
  welcome: './src/welcome/index.ts',
},
```

And add `welcome.html` to the CopyPlugin patterns alongside the existing HTML copies.

**Step 6: Update manifest.json**

Add to `public/manifest.json`:

```json
"web_accessible_resources": [
  {
    "resources": ["welcome.html"],
    "matches": ["<all_urls>"]
  }
]
```

This is needed because the OAuth callback redirects back to `chrome-extension://<id>/welcome.html`.

**Step 7: Commit**

```bash
git add src/welcome/ webpack.config.js public/manifest.json
git commit -m "feat: add welcome page with OAuth onboarding flow"
```

---

## Task 6: Popup Redesign — HTML + CSS

**Files:**
- Rewrite: `src/popup/popup.html`
- Rewrite: `src/popup/popup.css`

**Step 1: Replace popup.html**

Replace `src/popup/popup.html` entirely:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app">

    <!-- Header (always visible) -->
    <header class="header">
      <div class="header-left">
        <img src="icons/icon16.png" alt="" width="18" height="18" class="header-icon">
        <span class="header-title">X → Notion</span>
      </div>
      <button id="btn-settings" class="header-action" title="Settings">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.5 1.75a1.5 1.5 0 013 0v.35a.75.75 0 00.463.693l.057.025a.75.75 0 00.819-.163l.248-.248a1.5 1.5 0 012.121 2.121l-.248.248a.75.75 0 00-.163.82l.025.056a.75.75 0 00.693.463h.35a1.5 1.5 0 010 3h-.35a.75.75 0 00-.693.463l-.025.057a.75.75 0 00.163.819l.248.248a1.5 1.5 0 01-2.121 2.121l-.248-.248a.75.75 0 00-.82-.163l-.056.025a.75.75 0 00-.463.693v.35a1.5 1.5 0 01-3 0v-.35a.75.75 0 00-.463-.693l-.057-.025a.75.75 0 00-.819.163l-.248.248a1.5 1.5 0 01-2.121-2.121l.248-.248a.75.75 0 00.163-.82l-.025-.056a.75.75 0 00-.693-.463H1.75a1.5 1.5 0 010-3h.35a.75.75 0 00.693-.463l.025-.057a.75.75 0 00-.163-.819l-.248-.248A1.5 1.5 0 014.528 2.528l.248.248a.75.75 0 00.82.163l.056-.025A.75.75 0 006.114 2.22v-.47zM8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
      </button>
    </header>

    <!-- State: Not Connected -->
    <div id="state-unconfigured" class="state" hidden>
      <div class="empty-state">
        <svg class="empty-icon" width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" stroke-width="2"/><path d="M12 16h8M16 12v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <p class="empty-title">Connect your Notion</p>
        <p class="empty-desc">to start saving articles</p>
        <button id="btn-connect" class="btn btn-primary" style="margin-top: 12px">Connect to Notion</button>
      </div>
    </div>

    <!-- State: No Article -->
    <div id="state-no-article" class="state" hidden>
      <div class="empty-state">
        <svg class="empty-icon" width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 6h10l6 6v14a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" stroke-width="2"/><path d="M18 6v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M11 17h10M11 21h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <p class="empty-title">No article found</p>
        <p class="empty-desc">Open a long-form X post and click here again.</p>
      </div>
    </div>

    <!-- State: Loading (Skeleton) -->
    <div id="state-loading" class="state" hidden>
      <div class="skeleton-card">
        <div class="skeleton-line skeleton-line--long"></div>
        <div class="skeleton-line skeleton-line--medium"></div>
        <div class="skeleton-meta">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-line skeleton-line--short"></div>
        </div>
      </div>
      <div class="skeleton-line skeleton-line--medium" style="margin-top:16px"></div>
      <div class="skeleton-btn"></div>
    </div>

    <!-- State: Preview + Save -->
    <div id="state-preview" class="state" hidden>
      <div class="article-card">
        <h2 id="preview-title" class="article-title"></h2>
        <div class="article-meta">
          <div id="preview-avatar" class="author-avatar"></div>
          <div class="author-info">
            <span id="preview-author" class="author-name"></span>
            <span class="meta-sep">&middot;</span>
            <span id="preview-date" class="meta-date"></span>
          </div>
        </div>
      </div>

      <!-- Collapsible form -->
      <button id="btn-toggle-form" class="form-toggle">
        <svg class="toggle-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 4.5l2 2 2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Add category & tags
      </button>

      <div id="form-section" class="form-section" hidden>
        <div class="form-group">
          <label class="label" for="category-select">Category</label>
          <select id="category-select" class="input">
            <option value="">None</option>
          </select>
          <div id="new-category-row" class="new-category-row" hidden>
            <input type="text" id="new-category-input" class="input" placeholder="New category name">
            <button id="btn-confirm-category" class="btn btn-primary" style="padding:6px 12px;height:auto;font-size:13px">Add</button>
            <button id="btn-cancel-category" class="btn btn-ghost" style="padding:6px 12px;height:auto;font-size:13px">Cancel</button>
          </div>
        </div>

        <div class="form-group">
          <label class="label" for="tags-input">Tags</label>
          <input type="text" id="tags-input" class="input" placeholder="e.g. AI, productivity">
        </div>
      </div>

      <!-- Action area -->
      <div id="action-area" class="action-area">
        <button id="btn-save" class="btn btn-primary btn-full">Save to Notion</button>
      </div>

      <!-- Error (inline) -->
      <div id="inline-error" class="inline-error" hidden>
        <p id="error-message"></p>
      </div>

      <!-- Success link -->
      <a id="link-notion" class="notion-link" href="#" target="_blank" hidden>Open in Notion
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5h5v5M9.5 2.5L2.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
    </div>

  </div>
  <script src="popup.js"></script>
</body>
</html>
```

**Step 2: Replace popup.css**

Replace `src/popup/popup.css` entirely:

```css
@import '../shared/design-tokens.css';
@import '../shared/base.css';

body {
  width: 360px;
  background: var(--surface);
}

#app {
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  border-radius: 3px;
}

.header-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.header-action {
  background: none;
  border: none;
  padding: 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-primary);
  opacity: 0.35;
  transition: opacity var(--duration-fast) ease;
}

.header-action:hover {
  opacity: 0.6;
}

/* States */
.state {
  padding: 16px;
  animation: fadeUp var(--duration-normal) var(--ease-standard) both;
}

.state[hidden] {
  display: none !important;
}

/* Empty states */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 0;
}

.empty-icon {
  color: var(--text-disabled);
  margin-bottom: 12px;
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Skeleton loading */
.skeleton-card {
  background: var(--background);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  margin-bottom: 8px;
}

.skeleton-line--long { width: 90%; }
.skeleton-line--medium { width: 60%; }
.skeleton-line--short { width: 40%; }

.skeleton-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.skeleton-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  flex-shrink: 0;
}

.skeleton-btn {
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  margin-top: 16px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Article card */
.article-card {
  background: var(--background);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin-bottom: 4px;
}

.article-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.author-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  text-transform: uppercase;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
  min-width: 0;
}

.author-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-sep {
  margin: 0 5px;
  color: var(--text-disabled);
  font-size: 12px;
}

.meta-date {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Form toggle */
.form-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 8px 0;
  transition: color var(--duration-fast) ease;
}

.form-toggle:hover {
  color: var(--text-primary);
}

.toggle-chevron {
  transition: transform var(--duration-fast) ease;
}

.form-toggle.expanded .toggle-chevron {
  transform: rotate(180deg);
}

/* Form section */
.form-section {
  overflow: hidden;
  transition: max-height 200ms ease-out, opacity 200ms ease-out;
}

.form-section[hidden] {
  display: none;
}

.form-group {
  margin-bottom: 12px;
}

.new-category-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  align-items: center;
}

.new-category-row[hidden] {
  display: none;
}

.new-category-row .input {
  flex: 1;
}

/* Action area */
.action-area {
  margin-top: 8px;
}

/* Save button states */
.btn-saving {
  background: var(--brand) !important;
  pointer-events: none;
}

.btn-success {
  background: var(--success) !important;
  pointer-events: none;
}

/* Inline error */
.inline-error {
  background: var(--error-bg);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin-top: 8px;
}

.inline-error[hidden] {
  display: none;
}

.inline-error p {
  font-size: 13px;
  color: var(--error);
  line-height: 1.4;
}

/* Notion link */
.notion-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--brand);
  text-decoration: none;
  padding: 8px 0;
  margin-top: 4px;
  transition: opacity var(--duration-fast) ease;
}

.notion-link[hidden] {
  display: none;
}

.notion-link:hover {
  opacity: 0.8;
}

/* Form disabled state during save */
.form-disabled {
  opacity: 0.4;
  pointer-events: none;
}
```

**Step 3: Commit**

```bash
git add src/popup/popup.html src/popup/popup.css
git commit -m "feat: redesign popup with premium UI, skeleton loading, and inline states"
```

---

## Task 7: Popup Redesign — TypeScript Logic

**Files:**
- Rewrite: `src/popup/index.ts`

**Step 1: Replace popup/index.ts**

Replace `src/popup/index.ts` entirely:

```typescript
import type { Message } from '../types/messages';
import type { ArticleData } from '../types/article';
import { getFormExpanded, setFormExpanded } from '../utils/storage';
import { OAUTH_WORKER_URL } from '../utils/constants';

// State elements
const states = {
  unconfigured: document.getElementById('state-unconfigured')!,
  noArticle: document.getElementById('state-no-article')!,
  loading: document.getElementById('state-loading')!,
  preview: document.getElementById('state-preview')!,
};

// Preview elements
const previewTitle = document.getElementById('preview-title')!;
const previewAuthor = document.getElementById('preview-author')!;
const previewDate = document.getElementById('preview-date')!;
const previewAvatar = document.getElementById('preview-avatar')!;

// Form elements
const btnToggleForm = document.getElementById('btn-toggle-form')!;
const formSection = document.getElementById('form-section')!;
const categorySelect = document.getElementById('category-select') as HTMLSelectElement;
const newCategoryRow = document.getElementById('new-category-row')!;
const newCategoryInput = document.getElementById('new-category-input') as HTMLInputElement;
const btnConfirmCategory = document.getElementById('btn-confirm-category')!;
const btnCancelCategory = document.getElementById('btn-cancel-category')!;
const tagsInput = document.getElementById('tags-input') as HTMLInputElement;

// Action elements
const actionArea = document.getElementById('action-area')!;
const btnSave = document.getElementById('btn-save')!;
const inlineError = document.getElementById('inline-error')!;
const errorMessage = document.getElementById('error-message')!;
const linkNotion = document.getElementById('link-notion') as HTMLAnchorElement;

// Header actions
const btnSettings = document.getElementById('btn-settings')!;
const btnConnect = document.getElementById('btn-connect');

let currentArticle: ArticleData | null = null;

// --- State management ---

function showState(name: keyof typeof states) {
  Object.values(states).forEach(el => el.hidden = true);
  states[name].hidden = false;
}

async function sendMessage(msg: Message): Promise<Message> {
  return chrome.runtime.sendMessage(msg);
}

async function sendTabMessage(tabId: number, msg: Message): Promise<Message> {
  return chrome.tabs.sendMessage(tabId, msg);
}

// --- Avatar color from name ---

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const AVATAR_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#34D399',
  '#22D3EE', '#60A5FA', '#A78BFA', '#F472B6',
];

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// --- Preview ---

function showPreview(article: ArticleData) {
  previewTitle.textContent = article.title;
  previewAuthor.textContent = article.author.displayName;

  // Avatar
  const initials = getInitials(article.author.displayName);
  previewAvatar.textContent = initials;
  previewAvatar.style.backgroundColor = getAvatarColor(article.author.displayName);

  // Date
  const date = new Date(article.publishedDate);
  previewDate.textContent = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// --- Form toggle ---

async function initFormToggle() {
  const expanded = await getFormExpanded();
  if (expanded) {
    formSection.hidden = false;
    btnToggleForm.classList.add('expanded');
  }
}

btnToggleForm.addEventListener('click', () => {
  const isExpanded = !formSection.hidden;
  formSection.hidden = isExpanded;
  btnToggleForm.classList.toggle('expanded', !isExpanded);
  setFormExpanded(!isExpanded);
});

// --- Category ---

async function loadCategories() {
  const result = await sendMessage({ type: 'GET_CATEGORIES' });
  if (result.type !== 'CATEGORIES_RESULT') return;

  while (categorySelect.options.length > 1) categorySelect.remove(1);

  for (const cat of result.categories) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  }

  const newOption = document.createElement('option');
  newOption.value = '__new__';
  newOption.textContent = '+ Create new...';
  categorySelect.appendChild(newOption);
}

categorySelect.addEventListener('change', () => {
  if (categorySelect.value === '__new__') {
    newCategoryRow.hidden = false;
    newCategoryInput.focus();
    categorySelect.value = '';
  }
});

btnConfirmCategory.addEventListener('click', () => {
  const name = newCategoryInput.value.trim();
  if (!name) return;

  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  const createOption = categorySelect.querySelector('option[value="__new__"]');
  categorySelect.insertBefore(option, createOption);
  categorySelect.value = name;

  newCategoryInput.value = '';
  newCategoryRow.hidden = true;
});

btnCancelCategory.addEventListener('click', () => {
  newCategoryInput.value = '';
  newCategoryRow.hidden = true;
});

// --- Save flow (inline states) ---

function setFormDisabled(disabled: boolean) {
  const formEls = document.querySelectorAll('.article-card, .form-toggle, .form-section');
  formEls.forEach(el => el.classList.toggle('form-disabled', disabled));
}

btnSave.addEventListener('click', async () => {
  if (!currentArticle) return;

  const category = categorySelect.value === '__new__' ? '' : categorySelect.value;
  const tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  // Saving state
  inlineError.hidden = true;
  linkNotion.hidden = true;
  setFormDisabled(true);
  btnSave.innerHTML = '<div class="spinner"></div> Saving...';
  btnSave.classList.add('btn-saving');

  const result = await sendMessage({
    type: 'SAVE_TO_NOTION',
    article: currentArticle,
    category,
    tags,
  });

  if (result.type === 'SAVE_RESULT' && result.success && result.pageUrl) {
    // Success state
    btnSave.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Saved to Notion`;
    btnSave.classList.remove('btn-saving');
    btnSave.classList.add('btn-success');
    linkNotion.href = result.pageUrl;
    linkNotion.hidden = false;
  } else {
    // Error state
    setFormDisabled(false);
    btnSave.textContent = 'Save to Notion';
    btnSave.classList.remove('btn-saving');
    errorMessage.textContent = (result.type === 'SAVE_RESULT' && result.error) ? result.error : 'Could not save. Check your connection and try again.';
    inlineError.hidden = false;
  }
});

// --- Header actions ---

btnSettings.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

btnConnect?.addEventListener('click', () => {
  const extensionId = chrome.runtime.id;
  chrome.tabs.create({ url: `${OAUTH_WORKER_URL}/auth?extension_id=${extensionId}` });
});

// --- Init ---

async function init() {
  const configResult = await sendMessage({ type: 'CHECK_CONFIGURED' });
  if (configResult.type === 'CONFIGURED_RESULT' && !configResult.configured) {
    showState('unconfigured');
    return;
  }

  showState('loading');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showState('noArticle');
    return;
  }

  try {
    const result = await sendTabMessage(tab.id, { type: 'EXTRACT_ARTICLE' });

    if (result.type === 'ARTICLE_NOT_FOUND') {
      showState('noArticle');
      return;
    }

    if (result.type === 'ARTICLE_DATA') {
      currentArticle = result.data;
      showPreview(result.data);
      await Promise.all([loadCategories(), initFormToggle()]);
      showState('preview');
    }
  } catch {
    showState('noArticle');
  }
}

init();
```

**Step 2: Commit**

```bash
git add src/popup/index.ts
git commit -m "feat: rewrite popup logic with inline save states and collapsible form"
```

---

## Task 8: Options Page Redesign

**Files:**
- Rewrite: `src/options/options.html`
- Rewrite: `src/options/options.css`
- Rewrite: `src/options/index.ts`

**Step 1: Replace options.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>X Article to Notion — Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="container">
    <h1>Settings</h1>

    <!-- Connection card -->
    <div class="card">
      <h2 class="card-title">Connection</h2>
      <div id="status-connected" hidden>
        <div class="connection-status">
          <div class="status-dot status-dot--connected"></div>
          <span>Connected</span>
        </div>
        <div class="connection-details">
          <div class="detail-row">
            <span class="detail-label">Workspace</span>
            <span id="workspace-name" class="detail-value">—</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Database</span>
            <span id="database-name" class="detail-value">—</span>
          </div>
        </div>
        <button id="btn-disconnect" class="link-danger">Disconnect</button>
      </div>
      <div id="status-disconnected" hidden>
        <div class="connection-status">
          <div class="status-dot"></div>
          <span>Not connected</span>
        </div>
        <button id="btn-connect" class="btn btn-primary" style="margin-top:12px">Connect to Notion</button>
      </div>
    </div>

    <!-- Preferences card -->
    <div class="card">
      <h2 class="card-title">Preferences</h2>
      <div class="toggle-row">
        <div>
          <div class="toggle-label">Expand category & tags by default</div>
          <div class="toggle-desc">Show the form fields when opening the popup</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="toggle-expand">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <p class="version">v1.0.0</p>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

**Step 2: Replace options.css**

```css
@import '../shared/design-tokens.css';
@import '../shared/base.css';

body {
  background: var(--background);
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.container {
  width: 100%;
  max-width: 480px;
}

h1 {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 20px;
}

/* Card */
.card {
  background: var(--surface);
  border-radius: var(--radius-xl);
  padding: 20px 24px;
  box-shadow: var(--shadow-card);
  margin-bottom: 12px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 14px;
}

/* Connection */
.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-disabled);
}

.status-dot--connected {
  background: var(--success);
}

.connection-details {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 13px;
  color: var(--text-muted);
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.link-danger {
  display: inline-block;
  background: none;
  border: none;
  color: var(--error);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  margin-top: 14px;
  opacity: 0.8;
  transition: opacity var(--duration-fast) ease;
}

.link-danger:hover {
  opacity: 1;
}

/* Toggle */
.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.toggle-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.toggle {
  position: relative;
  width: 40px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: background var(--duration-fast) ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  left: 3px;
  top: 3px;
  transition: transform var(--duration-fast) ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.toggle input:checked + .toggle-slider {
  background: var(--brand);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(16px);
}

/* Version */
.version {
  text-align: center;
  font-size: 12px;
  color: var(--text-disabled);
  margin-top: 20px;
}
```

**Step 3: Replace options/index.ts**

```typescript
import type { Message } from '../types/messages';
import { getSettings, saveSettings, getFormExpanded, setFormExpanded } from '../utils/storage';
import { OAUTH_WORKER_URL } from '../utils/constants';

const statusConnected = document.getElementById('status-connected')!;
const statusDisconnected = document.getElementById('status-disconnected')!;
const workspaceName = document.getElementById('workspace-name')!;
const databaseName = document.getElementById('database-name')!;
const btnDisconnect = document.getElementById('btn-disconnect')!;
const btnConnect = document.getElementById('btn-connect')!;
const toggleExpand = document.getElementById('toggle-expand') as HTMLInputElement;

async function sendMessage(msg: Message): Promise<Message> {
  return chrome.runtime.sendMessage(msg);
}

async function loadStatus() {
  const result = await sendMessage({ type: 'GET_CONNECTION_STATUS' });
  if (result.type !== 'CONNECTION_STATUS') return;

  if (result.connected) {
    statusConnected.hidden = false;
    statusDisconnected.hidden = true;
    workspaceName.textContent = result.workspaceName ?? '—';
    databaseName.textContent = result.databaseName ?? '—';
  } else {
    statusConnected.hidden = true;
    statusDisconnected.hidden = false;
  }
}

async function loadPreferences() {
  toggleExpand.checked = await getFormExpanded();
}

// Disconnect
btnDisconnect.addEventListener('click', async () => {
  if (!confirm('Disconnect from Notion? You can reconnect anytime.')) return;
  await saveSettings({ notionApiToken: '', databaseId: '' });
  loadStatus();
});

// Connect
btnConnect.addEventListener('click', () => {
  const extensionId = chrome.runtime.id;
  window.location.href = `${OAUTH_WORKER_URL}/auth?extension_id=${extensionId}`;
});

// Toggle preference
toggleExpand.addEventListener('change', () => {
  setFormExpanded(toggleExpand.checked);
});

// Init
loadStatus();
loadPreferences();
```

**Step 4: Commit**

```bash
git add src/options/
git commit -m "feat: redesign options page with connection status and preferences"
```

---

## Task 9: Webpack Config Update

**Files:**
- Modify: `webpack.config.js`

**Step 1: Read current webpack config and add welcome entry + HTML copy**

Add `welcome` to the entry points. Add `welcome.html` and `welcome.css` to the CopyPlugin patterns. The shared CSS files will be bundled automatically via the `@import` statements in each CSS file.

Exact changes depend on current CopyPlugin configuration — read the file and:
1. Add `welcome: './src/welcome/index.ts'` to `entry`
2. Add `{ from: 'src/welcome/welcome.html', to: 'welcome.html' }` to CopyPlugin patterns
3. Verify CSS imports (`@import '../shared/...'`) work with css-loader (they should by default)

**Step 2: Build and verify**

```bash
npm run build
```

Expected: `dist/` contains `welcome.html`, `welcome.js`, `welcome.css` alongside existing files.

**Step 3: Commit**

```bash
git add webpack.config.js
git commit -m "feat: add welcome page to webpack build"
```

---

## Task 10: Build Verification and Cleanup

**Files:**
- Possibly modify: any files with build errors

**Step 1: Run typecheck**

```bash
npm run typecheck
```

Fix any TypeScript errors.

**Step 2: Run production build**

```bash
npm run build
```

Verify all files present in `dist/`:
- `welcome.html`, `welcome.js`, `welcome.css`
- `popup.html`, `popup.js`, `popup.css`
- `options.html`, `options.js`, `options.css`
- `content.js`, `background.js`
- `manifest.json`, `icons/`

**Step 3: Manual smoke test**

Load `dist/` as unpacked extension in Chrome:
1. Verify welcome tab opens on install
2. Verify popup shows header + states correctly
3. Verify settings page renders
4. Verify skeleton loading appears

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve build errors and verify all pages render"
```

---

## Task 11: Deploy Cloudflare Worker

**Step 1: Set up Notion OAuth integration**

The user must manually:
1. Go to https://www.notion.so/my-integrations
2. Create a new **public** integration (not internal — public enables OAuth)
3. Set the redirect URI to the Worker URL + `/callback`
4. Copy the `client_id` and `client_secret`

**Step 2: Configure worker secrets**

```bash
cd worker
npx wrangler secret put NOTION_CLIENT_SECRET
```

Paste the client_secret when prompted.

**Step 3: Set client_id in wrangler.toml**

Update `NOTION_CLIENT_ID` in `worker/wrangler.toml`.

**Step 4: Deploy**

```bash
cd worker
npx wrangler deploy
```

Note the deployed URL (e.g. `https://x2notion-oauth.<subdomain>.workers.dev`).

**Step 5: Update OAUTH_WORKER_URL**

Update `src/utils/constants.ts` with the actual Worker URL.

**Step 6: Rebuild extension**

```bash
npm run build
```

**Step 7: Commit**

```bash
git add src/utils/constants.ts worker/wrangler.toml
git commit -m "chore: configure OAuth worker URL after deployment"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Design system CSS tokens + base | `src/shared/design-tokens.css`, `src/shared/base.css` |
| 2 | Cloudflare Worker (OAuth proxy) | `worker/src/index.ts`, `worker/wrangler.toml` |
| 3 | Types + storage for OAuth | `src/types/`, `src/utils/` |
| 4 | Background message handlers | `src/background/` |
| 5 | Welcome page (onboarding) | `src/welcome/` |
| 6 | Popup HTML + CSS | `src/popup/popup.html`, `src/popup/popup.css` |
| 7 | Popup TypeScript | `src/popup/index.ts` |
| 8 | Options page redesign | `src/options/` |
| 9 | Webpack config update | `webpack.config.js` |
| 10 | Build verification | All |
| 11 | Deploy worker | `worker/`, `src/utils/constants.ts` |
