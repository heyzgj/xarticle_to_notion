# Lope

> Save now. Your agent reads later.

Lope is a Chrome extension that clips articles, threads, tweets, and notes from across the web into a structured pile your AI agent can actually use. Five extractors out of the box (X, WeChat, RedNote, Zhihu, generic Readability fallback). Saves to Notion or Obsidian. No API keys for the common path — connect Notion once with OAuth and you're done.

![Lope icon](public/icons/icon128.png)

## What it does

- **One-click save** across X, WeChat, RedNote, Zhihu, and any Readability-friendly article
- **Agent-first body** — clean paragraphs, structured metadata (Title / Author / Published / Type / Tags / Location), zero UI chrome
- **OAuth onboarding** — Connect with Notion's official flow. Pick a database from a dropdown, or let us create one for you.
- **Multi-destination** — Notion + Obsidian (Local REST API) simultaneously
- **Private by design** — Your token stays in your browser. No analytics, no servers see your content.

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

> Note: the GitHub repo is still named `xarticle_to_notion` for link stability — the rename is a separate ops task.

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
       │   pipeline.run(document, url) → ArticleData
       ▼
┌─────────────────────┐    ┌─────────────────────┐
│ destinations/notion │    │ destinations/obsid. │
└─────────────────────┘    └─────────────────────┘
```

Extraction lives in `src/pipeline/profiles/{x,wechat,xhs,zhihu,generic}.ts`. Each profile implements a `SiteProfile` contract and is registered in a per-platform content script. Generic fallback (Mozilla Readability) is injected on demand from the popup when no platform script matches the active tab.

The extension runs entirely in your browser. The only server we operate is a stateless Cloudflare Worker that handles Notion's OAuth code-exchange step (required by the OAuth spec because the client secret can't live in extension code). The Worker logs nothing, stores nothing, and forgets about you the moment the redirect completes. Article content goes directly from your browser to `api.notion.com`.

## Project layout

```
.
├── public/
│   ├── manifest.json       Extension manifest
│   └── icons/              16/32/48/128 px app icons (Lope visual identity TBD)
├── src/
│   ├── pipeline/
│   │   ├── types.ts        ArticleData, ArticleBlock, SiteProfile, Pipeline
│   │   ├── pipeline.ts     URL router
│   │   ├── primitives/     strip-noise, rehydrate-imgs, html-to-blocks, blocks-to-markdown
│   │   └── profiles/       x, wechat, xhs, zhihu, generic (Readability)
│   ├── content/
│   │   ├── registerPipeline.ts   chrome.runtime listener + dispatch
│   │   └── platforms/      one entry per content script
│   ├── background/         Service worker (message router, Notion + Obsidian destinations)
│   ├── popup/              Popup UI (daily-use surface)
│   ├── options/            Settings page
│   ├── welcome/            First-run onboarding + OAuth flow
│   ├── shared/             Design tokens + base CSS
│   ├── types/              ArticleData + Notion + messages + destinations
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

Reload the extension in `chrome://extensions` after rebuilding. If you're debugging a platform's content script, also reload the corresponding tab so the updated script injects.

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

- TypeScript (strict, ES2020)
- Chrome Extension Manifest V3 (scripting + activeTab)
- `@mozilla/readability` for the generic profile
- Notion REST API (raw fetch, no SDK)
- Webpack 5
- Cloudflare Workers (OAuth proxy)

## License

MIT
