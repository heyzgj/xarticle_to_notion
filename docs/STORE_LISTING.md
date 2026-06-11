# Chrome Web Store Listing Copy

Ready-to-paste text for the Chrome Web Store submission form. **v1.4.1 — three-act positioning (pain → flip → payoff), validated by community research 2026-06.**

Framing rules (from research — see memory/positioning-evidence.md):
- Lead with the pain (you won't read it), flip to the promise (your agent reads later).
- Say **agent / query / read / digest**. NEVER say "chat with your bookmarks" (tested badly).
- Lope is the capture layer; the reading happens in the USER'S AI. Never imply Lope analyzes content.

---

## Name (max 45 chars) — set via manifest `name`

```
Lope - Web Clipper for your agents
```

(34 chars) — taken from `public/manifest.json`.

---

## Short description (max 132 chars) — set via manifest `description`

```
You won't read it later — your AI will. Clip any page into agent-readable saves: Notion, Obsidian, or paste into any AI chat.
```

(~125 chars) — taken from the manifest `description` field.

---

## Category

**Productivity** (secondary: Tools)

---

## Language

English

---

## Detailed description (max 16,000 chars)

```
Let's be honest: you're never going to read it later.

Every read-later list becomes a graveyard — thousands of saves, never opened again. The problem isn't your discipline. It's that "future you" was never the right reader.

Lope flips the deal: save now — your agent reads later. Every page you clip lands as structured, agent-readable data, so your AI can digest it, query it, and answer from it. You stop owing your backlog. Your agent starts working it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
ONE KEYSTROKE TO ANY AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hit Copy (or Cmd/Ctrl+Shift+S) and Lope puts a clean Markdown "envelope" on your clipboard — title, author, source, date, full body, images. Paste it into ChatGPT, Claude, Cursor, or any AI and ask your question. No connector, no setup, no "go fetch this URL."

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOUR AGENT CAN DO WITH IT
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Saves land in your Notion database with consistent properties — Type, Source, Author, Published, Tags. Point your AI at that database (Notion's official connector takes about five minutes) and your saves become something your agent answers from:

✦ "What did I save about agent memory this week? Digest each in three bullets."
✦ "Which authors do I keep saving? What was the last thing I saved from them?"
✦ "Find every thread longer than 5 tweets tagged ai-agents."
✦ Morning briefing: a scheduled agent reads yesterday's saves and gives you the three worth your time.

These run in YOUR AI, on YOUR data. Lope itself never reads, analyzes, or transmits your content anywhere.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT IT SAVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ X (Twitter) — long-form Articles, threads (numbered n/total), single tweets, quote tweets, video posters
✦ WeChat — full article body, author, published date, all images
✦ RedNote — note title, body, image gallery, hashtags, location
✦ Zhihu — articles and answers
✦ Feishu / Lark — cloud docs you have access to
✦ Anywhere else — Mozilla Readability fallback for blogs, Substack, docs, news

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHERE IT SAVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ Your clipboard — the Markdown envelope, zero accounts needed
✦ Notion — connect with OAuth, pick a database, or let us create one for you
✦ Obsidian — local-first via the Local REST API plugin, YAML frontmatter (Dataview-ready)
✦ Or several at once

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY IT'S DIFFERENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ Structured at capture. Type, Author, and Tags are database fields your agent can filter — not prose it has to guess from. The intent of a save is preserved the moment you make it.

✦ Two verbs, no friction. Copy hands the page to your AI right now. Save files it for your agent to use later. Pick per save.

✦ Reflex save. Cmd/Ctrl+Shift+S saves and copies in one motion, confirms with a quiet toast, and you keep moving.

✦ Hand-built extractors. Each platform's quirks handled — WeChat's lazy-loaded images, RedNote's structured state, X's thread logic. Readability covers the rest.

✦ No API keys. Notion connects through the official OAuth flow.

✦ Private by design. Your tokens stay in your browser. We run no server that sees your content. Zero analytics. Zero telemetry.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW IT WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Install. A welcome tab opens.
2. (Optional) Connect Notion (OAuth) and/or Obsidian. Skip entirely if you only want the clipboard envelope.
3. On any supported page: click the icon or press Cmd/Ctrl+Shift+S. Copy for your AI now, or Save for your agent later.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERMISSIONS — WHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Storage — remember your Notion connection and (optional) Obsidian credentials locally
• Active tab — read the page you're viewing when you click the icon
• Tabs — open your saved page after save
• Scripting — inject the generic Readability extractor on demand (only fires on your click)
• x.com / twitter.com / mp.weixin.qq.com / xiaohongshu.com / zhihu.com / feishu.cn / larksuite.com — detect and extract content when you save
• api.notion.com — send content to your Notion (only if you save to Notion)
• 127.0.0.1:27124 / 27123 — send content to your local Obsidian (stays on your machine)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIVACY
━━━━━━━━━━━━━━━━━━━━━━━━━━━

We collect nothing. We store nothing. We see nothing. Tokens stay in your browser; content goes directly from your browser to your destination (or your clipboard). The only server we operate is a stateless OAuth proxy required by Notion's API spec — it never holds or logs your data.

Full privacy policy: https://raw.githubusercontent.com/heyzgj/xarticle_to_notion/main/PRIVACY.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found a bug? Have a feature idea? Open an issue at github.com/heyzgj/xarticle_to_notion
```

---

## Screenshots — three-act narrative (Soft Bloom)

`docs/screenshots/store/`, 1280×800, warm ink/paper, bundled fonts. Upload in this order:

1. `01-graveyard-1280x800.png` — **the pain**: "You're never going to read it." Fading never-opened saves; the live one read by your agent.
2. `02-envelope-1280x800.png` — **the flip, zero setup**: "One keystroke. Any AI." ⌘⇧S → Markdown envelope → any AI chat.
3. `03-ask-your-saves-1280x800.png` — **the payoff**: "It reads. You ask." Agent answers from your Lope database.
4. `04-structured-1280x800.png` — **the mechanism**: "Data, not screenshots." X post → Notion entry with queryable fields.
5. `05-destinations-1280x800.png` — **the destinations**: "Notion, Obsidian, or both." Popup + both destination artifacts.

Promo tile: `promo-tile-440x280.png` (unchanged — bloom + wordmark on warm ink).

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

---

## Privacy policy URL

```
https://raw.githubusercontent.com/heyzgj/xarticle_to_notion/main/PRIVACY.md
```

---

## Single purpose description

```
Lope is a web clipper with a single purpose: saving the content of the web page the user is actively viewing — articles, posts, threads, notes, and cloud docs from X, WeChat, RedNote, Zhihu, Feishu/Lark, and any readable article — into a destination the user owns: their Notion database, their local Obsidian vault, or the system clipboard as Markdown. Every feature exists to capture the current page on an explicit user action and store it for the user (or their AI assistant) to reference later. The extension does nothing else — no browsing analytics, no background collection, no ads.
```
