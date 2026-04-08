# X2Notion

> Save X (Twitter) Articles to Notion in one click.

A premium Chrome extension that clips long-form X Articles straight into your Notion workspace. No API keys, no copy-paste — connect once with OAuth and you're done.

![X2Notion icon](public/icons/icon128.png)

## What it does

- **One-click save** — See the article. Click the icon. Done.
- **OAuth onboarding** — Connect with Notion's official OAuth flow. Pick a database from a dropdown (or let us create one for you).
- **Clean formatting** — Preserves paragraphs, headings, lists, inline links, @mentions, and images. Filters out engagement counts and UI chrome.
- **Inline save** — The save button morphs into "Open in Notion" after saving, keeping the article preview anchored.
- **Private by design** — Your Notion token stays in your browser. No analytics, no tracking, no servers see your data.

## Install

### From the Chrome Web Store

*Coming soon.*

### From source (unpacked)

```bash
git clone https://github.com/heyzgj/xarticle_to_notion.git
cd xarticle_to_notion
npm install
npm run build
```

Then load the extension:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `dist/` folder

On first install, a welcome tab opens automatically. Click **Connect to Notion** and follow the OAuth flow.

## How it works

```
┌─────────────┐      ┌────────────────┐      ┌─────────────────┐
│  Extension  │ ───▶ │ Worker (OAuth) │ ───▶ │ Notion OAuth UI │
└─────────────┘      └────────────────┘      └─────────────────┘
       │                                              │
       │              access token (via chrome        │
       │              identity redirect)              │
       │ ◀────────────────────────────────────────────┘
       │
       │   saveArticle(article)
       ▼
┌────────────────┐
│ Notion REST API│
└────────────────┘
```

The extension runs entirely in your browser. The only server we operate is a tiny stateless Cloudflare Worker that handles Notion's OAuth code-exchange step (required by the OAuth spec because the client secret can't live in extension code). The Worker logs nothing, stores nothing, and forgets about you the moment the redirect completes.

Article content goes directly from your browser to `api.notion.com`. It never touches our servers.

## Project layout

```
.
├── public/
│   ├── manifest.json       Extension manifest
│   └── icons/              16/32/48/128 px app icons
├── src/
│   ├── background/         Service worker (message router, Notion API, cache)
│   ├── content/            Content script (article detection + extraction)
│   ├── popup/              Popup UI (daily-use surface)
│   ├── options/            Settings page
│   ├── welcome/            First-run onboarding + OAuth flow
│   ├── shared/             Design tokens + base CSS
│   ├── types/              TypeScript interfaces
│   └── utils/              Constants, storage helpers
├── worker/                 Cloudflare Worker (OAuth code-exchange proxy)
└── docs/
    ├── plans/              Design + implementation plans
    └── STORE_LISTING.md    Chrome Web Store submission copy
```

## Development

```bash
npm run dev        # webpack --watch for live rebuild
npm run build      # production build → dist/
npm run typecheck  # tsc --noEmit
```

Reload the extension in `chrome://extensions` after rebuilding. If you're debugging the content script, also reload the X tab itself so the updated script injects.

## OAuth worker setup

If you want to fork and deploy your own Worker:

1. Create a **public** Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Set the redirect URI to your Worker's `/callback` URL
3. Copy the `client_id` into `worker/wrangler.toml`
4. `cd worker && npx wrangler secret put NOTION_CLIENT_SECRET`
5. `npx wrangler deploy`
6. Update `OAUTH_WORKER_URL` in `src/utils/constants.ts` with your deployed URL
7. `npm run build` and reload the extension

## Privacy

See [PRIVACY.md](PRIVACY.md). TL;DR: we collect nothing, store nothing, see nothing. Your Notion token stays in your browser.

## Tech stack

- TypeScript
- Chrome Extension Manifest V3
- Notion REST API (raw fetch, no SDK)
- Webpack 5
- Cloudflare Workers (OAuth proxy)

## License

MIT
