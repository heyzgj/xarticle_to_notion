# Chrome Web Store Listing Copy

Ready-to-paste text for the Chrome Web Store submission form. Update for v1.3 (Lope rebrand + multi-platform).

---

## Name (max 45 chars)

```
Lope — Save now, your agent reads later
```

(40 chars)

Alt options:
- `Lope: Save the web to your AI's memory` (39)
- `Lope — Web clipper for AI agents` (32)

---

## Short description (max 132 chars)

```
Save now. Your agent reads later. Clip X, WeChat, Xiaohongshu, Zhihu, and any article to your AI's memory.
```

(108 chars)

Alt options:
- `One-click web clipper for AI agents. Save X / WeChat / Xiaohongshu / Zhihu / any article to Notion or Obsidian.` (110)
- `Curate the web for your AI. Save articles, threads, and notes to a structured pile your agent reads later.` (107)

---

## Category

**Productivity**

(Secondary if available: Tools)

---

## Language

English (with Chinese platform support)

---

## Detailed description (max 16,000 chars — use ~1500)

```
Save anything you read on the web to a structured pile your AI agent can actually use — X articles, X threads, single tweets, quote tweets, WeChat 公众号 articles, Xiaohongshu notes (with images, tags, and location), Zhihu articles and answers, plus any Readability-friendly article on any other site.

Lope is for people who run a personal AI agent (Claude Code, OpenClaw, Hermes, custom MCP setup) and want their saved reading to feed that agent's memory. Instead of bookmarking into a graveyard, send everything you read straight to a structured database with title, author, published date, full text, images, tags, and location preserved — formatted so the agent can parse it, not just humans.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT IT SAVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ X (Twitter) — long-form Articles, threads (numbered n/total), single tweets, quote tweets, video posters
✦ WeChat 公众号 — full article body, author, published date, all images
✦ Xiaohongshu (小红书) — note title, body, image gallery, hashtags, IP location
✦ Zhihu (知乎) — articles and answers from zhuanlan.zhihu.com or question pages
✦ Anywhere else — Mozilla Readability fallback for blogs, Substack, HN, Medium, etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHERE IT SAVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ Notion — connect with OAuth, pick a database, done. Or let us create one for you.
✦ Obsidian — local-first via the Obsidian Local REST API plugin. Markdown files with YAML frontmatter (Dataview-ready).
✦ Both at once — fan out simultaneously.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT MAKES IT DIFFERENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ One-click save (or Cmd/Ctrl+Shift+S). See the content, click, done.

✦ No API keys for Notion. Connect with the official OAuth flow and pick your database from a dropdown.

✦ Five platform-specific extractors. Each one is hand-built for its platform's quirks — WeChat's lazy-loaded images, Xiaohongshu's structured JSON state, Zhihu's semantic-meta tags, X's thread/quote-tweet logic. The generic Readability fallback handles everything else.

✦ Agent-ready structure. Saved content uses consistent properties (Type, Source, Author, Published) and parse-safe markers — designed to be readable by AI agents, not just humans.

✦ Duplicate detection. If a URL is already saved, you get one click to open the existing entry.

✦ Private by design. Your tokens stay in your browser. We don't run servers that see your data. Zero analytics. Zero telemetry.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW IT WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Install the extension. A welcome tab opens.
2. Connect to Notion (OAuth) and/or Obsidian (paste your Local REST API key).
3. Visit any supported page. Click the extension icon (or press Cmd/Ctrl+Shift+S). Hit Save.

Your saved content appears in your destination(s) with:
• Title
• Author + handle (where the platform exposes one)
• Published date
• Full structured content with formatting
• Images
• Tags + location (Xiaohongshu)
• Type (Article / Thread / Tweet / Quote Tweet / Note / Video / Answer)
• Source (X / WeChat / Xiaohongshu / Zhihu / generic)
• Tweet count (threads)
• Source URL

━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERMISSIONS — WHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Storage — remember your Notion connection and (optional) Obsidian credentials locally
• Active tab — read the content you're currently viewing when you click the icon
• Tabs — open your saved page after save
• Scripting — inject the generic Readability extractor on demand when you save from a non-platform site (only fires on click; never auto-runs across pages)
• x.com / twitter.com / mp.weixin.qq.com / xiaohongshu.com / zhihu.com — detect and extract content
• api.notion.com — send content to Notion (only if you save to Notion)
• 127.0.0.1:27124 / 27123 — send content to your local Obsidian (only if you save to Obsidian; stays on your machine)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIVACY
━━━━━━━━━━━━━━━━━━━━━━━━━━━

We collect nothing. We store nothing. We see nothing. Tokens stay in your browser's local storage; content goes directly from your browser to your destination. The only server we operate is a stateless OAuth proxy required by Notion's API spec — it never holds or logs your data.

Full privacy policy: [your hosted URL]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found a bug? Have a feature idea? Open an issue at github.com/heyzgj/xarticle_to_notion
```

---

## Screenshots checklist

Chrome Web Store requires 1280×800 or 640×400 PNG/JPG. Provide at least 1, ideally 3-5.

Recommended shots for v1.3:

1. **Hero** — Popup open on a real X article, showing preview card and big "Save" button
2. **Multi-platform** — Side-by-side: same Save flow on WeChat / Xiaohongshu / Zhihu (one composite image)
3. **Save success** — Popup after save, showing the green "Open in Notion" button
4. **Welcome tab** — Onboarding with "Connect to Notion" CTA and privacy line
5. **Database choice** — The "Create Lope for me" recommended card
6. **Notion result** — A saved Xiaohongshu note inside Notion showing tags + location properties

---

## Promotional tile (optional, recommended)

440×280 PNG. Lope visual identity is monochrome — stay away from purple. Suggested:
- Black or near-black background
- Lope wordmark in large white sans
- Tagline below in muted gray: "Save now. Your agent reads later."
- No icons / illustrations until the icon-redesign pass lands

---

## Category tags (max 5)

```
notion, obsidian, knowledge-base, ai-agent, web-clipper
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
Lope has one purpose: saving content from the web — primarily X (Twitter) articles/threads/tweets, WeChat 公众号 articles, Xiaohongshu notes, Zhihu articles/answers, and any other Readability-compatible article — to a user's personal knowledge base. The user picks Notion (via OAuth) or a local Obsidian vault (via the Local REST API plugin) as their destination. When the user invokes the extension on a supported page, it reads the content from the current tab and sends it directly to the configured destination using credentials stored locally in the user's browser.
```
