# Lope — Roadmap

## Mission

Save now. Your agent reads later.

Lope is a personal content pipeline: you clip from the web, it lands in your knowledge base as structured data, your agent reads it and knows you better. The recall layer (`find-lope` skill + `~/Lope/` pile) is the product; the save extension is the curation surface.

---

## Shipped

### v1.0 — Foundation
- X long-form Article extraction (title, body, images, links)
- Notion OAuth setup (no API token copy-paste)
- Auto-create Notion database on first connect
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
- `destinations/notion.ts` + `destinations/obsidian.ts` — multi-destination saves
- Duplicate detection — queries Notion by URL before saving
- Keyboard shortcut — `Cmd+Shift+S` / `Ctrl+Shift+S`
- Multi-platform content script architecture

### v1.3 — Pipeline + Multi-Platform + Lope rebrand (current)
- **`SiteProfile` content pipeline** (M1, four commits 78d3cf2 → cc11e38)
  - `src/pipeline/{types,pipeline,primitives}.ts` shared infrastructure
  - 5 profiles: `x` / `wechat` / `xhs` / `zhihu` / `generic` (Mozilla Readability)
  - Generic profile injected on demand via `chrome.scripting.executeScript`
  - Unified `ArticleData` type with optional `tags` / `location` / `site` / `siteHandle`
  - `ContentType` widened: `note` / `video` / `answer` added
  - Replaces the previous `src/content/platforms/x/{detector,extractor}.ts` (978 LOC) with a single 700-LOC X profile
- **Lope agent layer** (separate session)
  - `find-lope` skill (Claude Code) — gated on `~/Lope/INDEX.md` existing
  - `/lope-refresh` slash command + `~/.lope/sync.py` — Notion → local pile
  - 6 saves enriched, INDEX built; cross-session recall live
- **Rebrand to Lope** — name / copy / Notion DB title / package / manifest. OAuth Worker URL stays on the legacy subdomain pending an ops migration.

### v1.4 — Agent hand-off + visual identity + security (2026-05-29)
- **Clipboard envelope hand-off** — save copies a Markdown envelope (frontmatter + body + image refs + `notion_url`) to the clipboard; paste into any AI chat, no Notion connector needed. Popup split into Copy (clipboard only) + Save to Notion (persist). Reflex `Cmd+Shift+S` = save + copy + toast.
- **Soft Bloom identity** — retired Twitter-blue for warm ink/paper + amber (save-moment only). `DESIGN.md` is the source of truth. Amber soft-bloom logo + `lope` wordmark; true-alpha icon set (seed+halo at 16/32); General Sans / Geist / Geist Mono self-hosted (woff2, OFL bundled). All surfaces migrated, WCAG AA.
- **OAuth worker security (P0)** — extension-ID allowlist (fail closed) + state nonce (login-CSRF) + token via URL fragment. ⚠️ needs deploy with `ALLOWED_EXTENSION_IDS` set.
- **Hygiene** — removed duplicate `notionApi.ts`; 429 retry ceiling; envelope href scheme-gating; Obsidian fetch timeout.

---

## Active

### v1.4 Web Store submission (the immediate goal)
- [ ] **Deploy gate** — set `worker/wrangler.toml` `ALLOWED_EXTENSION_IDS` (dev + published ID) and `wrangler deploy` the hardened OAuth worker. Token-theft fix is inert until deployed.
- [ ] 3 real-data screenshots (envelope-in-chat, real WeChat/XHS/Zhihu, Notion result) — mockups can't substitute. Drafted set + promo tile in `docs/screenshots/store/`.
- [ ] Host `PRIVACY.md` at a public URL; paste into the store form.
- [ ] Upload `lope.zip` (v1.4) + fill form from `docs/STORE_LISTING.md` (copy/single-purpose/data-use all drafted).

### Lope deferred items (next time touching Lope)
- [x] ~~Rotate Notion token~~ — dropped; the old token already expired, no action needed
- [ ] `sync.py` nit 1: `type_.lower()` in compares (Thread / Quote Tweet vs lowercase)
- [ ] `sync.py` nit 2: Author should be handle, not display name (parse from URL `/{handle}/`)
- [ ] OAuth worker subdomain rename (`x2notion-oauth` → `lope-oauth`) — fold into the deploy above if doing it

---

## Next: M2 — Reflex Save UX (1 week CC)

- `Cmd+Shift+S` → toast → done. No popup form on the default path.
- Popup retains form for the 5% case where user wants to override category / tags at save-time.
- Five platforms share one save flow; no platform-specific UX.
- Self-dogfood ≥5 saves/day for 7 days.

Ships as v1.4 internal.

---

## Then: M3.x — Pile architecture evolution

The Lope skill + `~/Lope/` pile is live but currently *derived* from Notion via `sync.py`. The medium-term direction is to make Lope the canonical source of truth, with Notion / Obsidian as fan-out destinations.

- [ ] **Lope-direct write path** — extension writes to `~/Lope/` directly via Native Messaging Host or local HTTP server (similar to Obsidian Local REST API pattern). Notion + Obsidian remain optional mirrors.
- [ ] **Notion schema migration** — auto-add `Site` / `Tags` / `Location` / `Source` properties on first v1.3+ save, gated by `dbProps.has(...)` guards already in place.
- [ ] **Per-source frontmatter** — XHS notes (short, image-heavy) vs Zhihu articles (long, code blocks) vs X threads (sequential) shape different YAML defaults.
- [ ] **OAuth Worker rename** — deploy at `lope-oauth.<account>.workers.dev`, update Notion integration callback, drop the legacy x2notion-oauth subdomain.

Ships as v1.5 internal.

---

## Future: M4 — MCP transport (gated on external users)

The `find-lope` skill works in Claude Code only. To reach Cursor / Cline / other MCP clients, ship an MCP server (stdio + ripgrep, ~6 tools). Defer until ≥5 external users want it; for personal infra the skill is sufficient.

- [ ] `kb_search`, `kb_recent`, `kb_topic`, `kb_get`, `kb_related`, `kb_topics` — MCP tools
- [ ] Source-typed retrieval (`kb_search source=zhihu` etc.)
- [ ] Setup CLI: `npx lope-mcp setup --vault ~/Lope/`

Ships as v2.0.

---

## Future: more sources / destinations

### Sources (one profile each)
- [ ] **Substack** — covered by generic profile today; could add a dedicated profile if quality matters
- [ ] **Medium** — same
- [ ] **Reddit** — post + top-level comments
- [ ] **YouTube** — title + description + transcript via `/api/timedtext`
- [ ] **LinkedIn** — articles and posts (DOM only, no official API)

### Destinations
- [ ] **Lope-direct** (M3.x above) — local files as canonical
- [ ] **Logseq** — Markdown-based, similar to Obsidian
- [ ] **Readwise** — highlights and articles API
- [ ] **Lark / Feishu** — OAuth, Chinese-locale UI copy (deferred from earlier roadmap)

---

## Agent-First Design Principles

All features are evaluated against these before implementation. Full details in `CLAUDE.md`.

1. **Structured properties > body-embedded metadata** — agents filter by properties, not full-text search
2. **Consistent schema** — every saved item has the same property structure; auto-migrate on first save
3. **Agent-parseable markers** — `**n/total**` for threads, `[Video]` for video assets
4. **Zero noise** — UI chrome, engagement counts, timestamps never reach the pile
5. **Typed pipeline** — all content flows through `ArticleBlock` union; no bespoke API calls per platform
6. **Recall is the magic** — save should be near-zero friction; the agent does the re-reading

---

## Open Questions

- **Lope-direct write transport**: Native Messaging Host (Python helper installed via post-install script) vs local HTTP server (similar to Obsidian Local REST API plugin). Trade-off is install friction vs cross-platform reliability.
- **External-user gating**: at what user count does MCP transport become worth the maintenance? Current floor is "≥5 daily users for ≥2 weeks", per the design doc.
- **Visual identity**: monochrome icon set TBD. Locked: name (Lope), no purple, no decorative motifs.
