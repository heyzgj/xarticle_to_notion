# Chrome Web Store Listing Copy

Ready-to-paste text for the Chrome Web Store submission form. **v1.4 — Lope rebrand (Soft Bloom identity) + clipboard hand-off + reflex save.**

---

## Name (max 45 chars) — set via manifest `name`

```
Lope - Web Clipper for your agents
```

(34 chars) — the Chrome Web Store title is taken from the manifest `name` field, so this is set in `public/manifest.json`, not typed in the dashboard.

---

## Short description (max 132 chars) — set via manifest `description`

```
One-click save to your own knowledge base. Clip X & any web content to Notion or Obsidian, or paste it into any AI agents.
```

(~123 chars) — also taken from the manifest `description` field.

---

## Category

**Productivity** (secondary: Tools)

---

## Language

English (with Chinese platform support)

---

## Detailed description (max 16,000 chars — use ~1500)

```
Save anything you read on the web to a structured pile your AI agent can actually use — X articles, X threads, single tweets, quote tweets, WeChat articles, RedNote notes (with images, tags, and location), Zhihu articles and answers, plus any Readability-friendly article on any other site.

Lope is for people who work with AI agents (Claude, ChatGPT, Cursor, Codex, custom MCP setups) and want what they read to feed those agents. Instead of bookmarking into a graveyard, send everything you read to a structured database — title, author, date, full text, images, tags, location preserved — formatted so an agent can parse it, not just a human.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
HAND IT STRAIGHT TO YOUR AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lope's fastest path skips the database entirely. Hit Copy (or Cmd/Ctrl+Shift+S) and Lope puts a clean Markdown "envelope" on your clipboard — YAML frontmatter (title, author, source, URL) plus the full article body with images preserved. Paste it into ChatGPT, Claude, Cursor, or any chatbot and ask your question immediately. No connector to wire up, no "go fetch this URL," no OAuth dance — the content is just there, structured, ready to reason over.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT IT SAVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ X (Twitter) — long-form Articles, threads (numbered n/total), single tweets, quote tweets, video posters
✦ WeChat — full article body, author, published date, all images
✦ RedNote — note title, body, image gallery, hashtags, IP location
✦ Zhihu — articles and answers from zhuanlan.zhihu.com or question pages
✦ Anywhere else — Mozilla Readability fallback for blogs, Substack, HN, Medium, etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHERE IT SAVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ Your clipboard — a paste-ready Markdown envelope for any AI chat (no setup at all)
✦ Notion — connect with OAuth, pick a database, done. Or let us create one for you.
✦ Obsidian — local-first via the Obsidian Local REST API plugin. Markdown files with YAML frontmatter (Dataview-ready).
✦ Notion + Obsidian at once — fan out simultaneously.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT MAKES IT DIFFERENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ Two verbs, no friction. Copy grabs the Markdown envelope for your AI. Save to Notion files it in your knowledge base. Pick per save.

✦ Reflex save. Press Cmd/Ctrl+Shift+S on any supported page — Lope saves and copies in one motion, confirms with a quiet toast, and you keep moving. No popup, no form.

✦ No API keys for Notion. Connect with the official OAuth flow and pick your database from a dropdown.

✦ Five platform-specific extractors. Each is hand-built for its platform's quirks — WeChat's lazy-loaded images, RedNote's structured state, Zhihu's semantic tags, X's thread/quote-tweet logic. The generic Readability fallback handles everything else.

✦ Agent-ready structure. Consistent properties (Type, Source, Author, Published) and parse-safe markers — built to be read by AI, not just humans.

✦ Duplicate detection. If a URL is already saved, you get one click to open the existing entry.

✦ Private by design. Your tokens stay in your browser. We run no server that sees your content. Zero analytics. Zero telemetry.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW IT WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Install the extension. A welcome tab opens.
2. (Optional) Connect to Notion (OAuth) and/or Obsidian (paste your Local REST API key). Skip this entirely if you only want the clipboard hand-off.
3. Visit any supported page. Click the icon (or press Cmd/Ctrl+Shift+S). Hit Copy to grab it for your AI, or Save to Notion to file it.

Your saved content carries:
• Title • Author + handle • Published date • Full structured body with formatting • Images
• Tags + location (RedNote) • Type (Article / Thread / Tweet / Quote Tweet / Note / Video / Answer)
• Source (X / WeChat / RedNote / Zhihu / generic) • Tweet count (threads) • Source URL

━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERMISSIONS — WHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Storage — remember your Notion connection and (optional) Obsidian credentials locally
• Active tab — read the content you're viewing when you click the icon
• Tabs — open your saved page after save
• Scripting — inject the generic Readability extractor on demand when you save from a non-platform site (only fires on click; never auto-runs across pages)
• x.com / twitter.com / mp.weixin.qq.com / xiaohongshu.com / zhihu.com — detect and extract content
• api.notion.com — send content to Notion (only if you save to Notion)
• 127.0.0.1:27124 / 27123 — send content to your local Obsidian (only if you save to Obsidian; stays on your machine)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIVACY
━━━━━━━━━━━━━━━━━━━━━━━━━━━

We collect nothing. We store nothing. We see nothing. Tokens stay in your browser's local storage; content goes directly from your browser to your destination (or your clipboard). The only server we operate is a stateless OAuth proxy required by Notion's API spec — it never holds or logs your data.

Full privacy policy: https://raw.githubusercontent.com/heyzgj/xarticle_to_notion/main/PRIVACY.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found a bug? Have a feature idea? Open an issue at github.com/heyzgj/xarticle_to_notion
```

---

## Screenshots — DONE (all rebranded to Soft Bloom)

The full set is in `docs/screenshots/store/`, 1280×800, warm ink/paper, real bundled fonts. The old v1.2-era Twitter-blue shots have been deleted. Upload in this order:

1. `01-hero-1280x800.png` — value prop ("Save it. Or hand it to your AI.") + popup Copy / Save to Notion
2. `02-reflex-1280x800.png` — reflex save: ⌘⇧S keycaps + amber "Saved · Copied" toast
3. `03-welcome-1280x800.png` — onboarding (real page): Soft Bloom mark + ink "Connect to Notion" CTA
4. `04-options-1280x800.png` — settings: Notion + Obsidian connected, "Notion, Obsidian, or both."
5. `05-success-1280x800.png` — post-save popup: "Copied" + "Open in Notion" ("One click. Two destinations.")

Promo tile: `promo-tile-440x280.png` (Soft Bloom — bloom + wordmark on warm ink).

> Optional future swap-ins (real captures, only if you want platform authenticity): envelope pasted into a live ChatGPT/Claude chat; the Save flow on a real WeChat/RedNote/Zhihu page; a saved RedNote note in Notion with Tags+Location. Not required — the branded set above is submission-ready.

---

## Promotional tile

440×280 PNG (small tile) — generated at `docs/screenshots/store/promo-tile-440x280.png`. **Soft Bloom identity:**
- Warm ink background (`#1A1916`)
- `lope` wordmark in General Sans, warm off-white (`#FAF8F3`)
- The amber Soft Bloom mark (`#D98A2B`) to the left of the wordmark
- Tagline in muted warm gray: "Save now. Your agent reads later."
- Marquee tile (1400×560) optional, same system.

---

## Category tags (max 5)

```
notion, obsidian, ai-agent, web-clipper, knowledge-base
```

---

## Support email

The email tied to your developer account.

---

## Website

```
https://github.com/heyzgj/xarticle_to_notion
```

(GitHub repo rename to `lope` is a deferred ops task — link stability matters more.)

---

## Privacy policy URL

Host `PRIVACY.md` somewhere public. Current:
- `https://raw.githubusercontent.com/heyzgj/xarticle_to_notion/main/PRIVACY.md`

---

## Single purpose description (Chrome Web Store asks)

```
Lope has one purpose: saving content from the web — primarily X (Twitter) articles/threads/tweets, WeChat articles, RedNote notes, Zhihu articles/answers, and any other Readability-compatible article — to a user's personal knowledge base or clipboard. The user picks Notion (via OAuth), a local Obsidian vault (via the Local REST API plugin), or a copy-to-clipboard Markdown export as the destination. When the user invokes the extension on a supported page, it reads the content from the current tab and sends it directly to the configured destination using credentials stored locally in the user's browser.
```
```

---

## Data-use disclosures (Chrome Web Store privacy tab)

Check these to match actual behavior:
- ☑ Does NOT sell or transfer user data to third parties (beyond approved use cases)
- ☑ Does NOT use/transfer data for purposes unrelated to the single purpose
- ☑ Does NOT use/transfer data to determine creditworthiness / lending
- Data collected: **none** leaves the browser except to the user's chosen destination (Notion API / local Obsidian). Declare "Website content" as handled-but-not-collected-by-developer (transmitted directly to the user's own destination, never to us).
