# Engram — Roadmap

## Mission

Every article, thread, and video you save is an engram — a memory unit that shapes your
personal agent's understanding of you, your interests, and your world.

Engram is a personal content pipeline: you clip from the web, it lands in your knowledge
base as structured data, your agent reads it and knows you better.

---

## Shipped

### v1.0 — Foundation
- X long-form Article extraction (title, body, images, links)
- Notion OAuth setup (no API token copy-paste)
- Auto-create X2Notion database on first connect
- Category + tags metadata on save
- Premium popup UI

### v1.1 — Thread & Video Support
- X Thread detection and extraction (`**n/total**` agent-parseable format)
- X Video support (poster thumbnail + `[Video]` link back to tweet)
- `Type` (Article | Thread) and `TweetCount` properties in Notion schema
- Auto-migrate existing databases to new schema on first save

### v1.2 — Complete X Coverage + Multi-Destination Architecture
- Single tweet support — `Type=Tweet`, tweet body as Notion content
- Quote tweet support — outer tweet + quoted tweet as nested Notion quote blocks
- `DestinationAdapter` interface — clean abstraction over all destinations
- `destinations/notion.ts` — Notion reimplemented as an adapter
- `destinations/obsidian.ts` — Obsidian via Local REST API, Markdown + YAML frontmatter
- Multi-destination: save to Notion AND Obsidian simultaneously
- Duplicate detection — queries Notion by URL before saving; popup shows "Already saved"
- Keyboard shortcut — `Cmd+Shift+S` / `Ctrl+Shift+S` to trigger popup
- Multi-platform content script architecture (`content-x.js`, future `content-substack.js`, etc.)

---

## Upcoming

### v1.3 — Thread Edge Cases (if needed)
- [ ] Thread detection: reply chains vs self-threads — fix only if reported as broken in real use

---

## v2.0 — Rebrand + Lark Destination

### Rebrand
- [ ] Rename extension from "X2Notion" → "Engram"
- [ ] Update manifest, UI copy, store listing

---

### New destination in v2.0
- [ ] **Lark / Feishu** — OAuth flow, `destinations/lark.ts`, Chinese-locale UI copy

---

## v2.1 — First New Source: Substack

---

## v2.2 — Medium + Reddit
**Goal:** Prove the multi-source architecture with the highest-value external platform.

Substack articles are clean HTML — easiest extraction after X Articles.

- [ ] `content-substack.ts` content script
- [ ] Match `https://*.substack.com/p/*`
- [ ] Reuse existing `ArticleData` type and background pipeline unchanged
- [ ] `Type=Article`, `Source=Substack` property in Notion

### Architecture changes for multi-source
```json
"content_scripts": [
  { "matches": ["https://x.com/*"], "js": ["content-x.js"] },
  { "matches": ["https://*.substack.com/*"], "js": ["content-substack.js"] }
]
```

---

## v3.0 — Platform Suite

### Sources
- [ ] **Medium** — similar to Substack, clean article HTML
- [ ] **Reddit** — post + top-level comments (not full comment tree); `Type=RedditThread`
- [ ] **YouTube** — title, description, transcript via `/api/timedtext`; `Type=Video`
- [ ] **LinkedIn** — articles and posts (DOM extraction, no official API)

### Destinations
- [ ] **Logseq** — similar to Obsidian, Markdown-based
- [ ] **Readwise** — highlights and articles API

---

## Agent-First Design Principles

All features are evaluated against these before implementation. Full details in `CLAUDE.md`.

1. **Structured properties > body-embedded metadata** — agents filter by properties, not full-text search
2. **Consistent schema** — every saved item has the same property structure; auto-migrate on first save
3. **Agent-parseable markers** — `**n/total**` for threads, `[Video]` for video assets
4. **Zero noise** — UI chrome, engagement counts, timestamps never reach Notion
5. **Typed pipeline** — all content flows through `ArticleBlock` union; no bespoke API calls

---

## Open Questions

- **Obsidian sync model**: Local REST API requires the user to install a plugin and run Obsidian. Is that acceptable friction for the target user (power users who already use Obsidian)?
- **YouTube transcript**: Available for videos with captions. For videos without captions, fall back to title + description only, or skip?
- **Source property**: When multi-source lands, add `Source` (select: X, Substack, Medium, Reddit, YouTube) to Notion schema. Needs schema migration for existing databases.
