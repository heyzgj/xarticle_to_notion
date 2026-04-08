# Chrome Web Store Listing Copy

Ready-to-paste text for the Chrome Web Store submission form.

---

## Name (max 45 chars)

```
X2Notion — Save X Articles to Notion
```

(35 chars — leaves room if you want to add a tagline)

Alt options:
- `X2Notion: Save X Articles to Notion`
- `X2Notion — Clip X Articles to Notion`

---

## Short description (max 132 chars)

```
Save X (Twitter) Articles to Notion in one click. Clean formatting, links preserved, zero setup friction.
```

(108 chars)

Alt options:
- `Clip X long-form Articles straight to your Notion workspace. One click. Clean formatting. Links preserved.` (108)
- `Save X Articles to Notion in one click. Connect with OAuth, pick a database, done. No API keys, no copy-paste.` (110)

---

## Category

**Productivity**

(Secondary if available: Tools)

---

## Language

English

---

## Detailed description (max 16,000 chars — use ~1200)

```
Save long-form X (formerly Twitter) Articles to your Notion workspace with a single click.

X2Notion is for people who treat X as a reading list but want their saved posts somewhere they can actually find them later. Instead of bookmarking an article and losing it forever, send it straight to a proper Notion database — with the title, author, date, full text, links, and images all preserved.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT MAKES IT DIFFERENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✦ One-click save. See the article. Click the icon. Done. Category and tags are optional — the default is zero friction.

✦ No API keys. No copy-paste. Connect with Notion's official OAuth flow and pick your database from a dropdown. We'll even create a ready-made "X2Notion" database for you if you don't have one.

✦ Clean formatting. The extractor preserves real paragraphs, headings, lists, quotes, and inline @mentions as clickable links. Engagement counts and UI chrome get filtered out automatically.

✦ Premium UI. A compact, polished popup with inline save states and a cared-for welcome flow. Not a dev prototype — a real product.

✦ Private by design. Your Notion token lives in your browser only. We don't run servers that see your data, don't track usage, don't include any analytics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW IT WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Install the extension. A welcome tab opens.
2. Click "Connect to Notion" and authorize X2Notion on Notion's permission screen.
3. Let us create an "X2Notion" database for you, or pick one you already have.
4. Visit any long-form X Article. Click the extension icon. Hit Save. Done.

Your saved article appears in your Notion database with:
• Title (from the article)
• Author name + @handle
• Published date
• Full article text with formatting
• Images
• Optional category and tags you chose

━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERMISSIONS — WHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Storage — remember your Notion connection locally
• Active tab — read the article you're currently viewing when you click the icon
• Tabs — open your saved article in Notion after save
• x.com / twitter.com — detect and extract article content
• api.notion.com — send the article content to Notion

━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIVACY
━━━━━━━━━━━━━━━━━━━━━━━━━━━

We collect nothing. We store nothing. We see nothing. Your Notion token stays in your browser's local storage; article content goes directly from your browser to Notion. The only server we operate is a stateless OAuth proxy required by Notion's API spec — it never holds or logs your data.

Full privacy policy: [your hosted URL]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found a bug? Have a feature idea? Open an issue at github.com/heyzgj/xarticle_to_notion
```

---

## Screenshots checklist

Chrome Web Store requires 1280×800 or 640×400 PNG/JPG. Provide at least 1, ideally 3-5.

Recommended shots:

1. **Hero** — Popup open on a real X Article, showing the preview card with the article title, author avatar, and big blue "Save to Notion" button
2. **Save success** — Popup after save, showing the green "Open in Notion" button
3. **Welcome tab** — The onboarding screen with "Connect to Notion" CTA and privacy line
4. **Database choice** — The "Create X2Notion for me" recommended card
5. **Notion result** — The saved article inside Notion (showing clean formatting)

Use a browser window screenshot tool. For the popup, right-click the extension icon → Inspect popup → DevTools device toolbar → set to 1280×800 → fill background.

---

## Promotional tile (optional, recommended)

440×280 PNG. A minimal composition:
- Dark background (#111827 to match your icon)
- Your owl icon at 96×96
- Text: "X2Notion" in large white sans, "Save X Articles to Notion" in smaller gray below

---

## Category tags (max 5)

```
notion, twitter, x, bookmarks, productivity
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

Host `PRIVACY.md` somewhere public. Options:
- GitHub: push the file, use `https://github.com/heyzgj/xarticle_to_notion/blob/main/PRIVACY.md`
- GitHub Pages: enable Pages on the repo and use `https://heyzgj.github.io/xarticle_to_notion/PRIVACY.html`
- Your own domain if you have one

---

## Single purpose description (Chrome Web Store asks)

```
X2Notion has one purpose: saving long-form X (Twitter) Articles to a user's personal Notion database. When the user clicks the extension icon on an X Article, the extension reads the article content from the current tab and sends it directly to Notion's API using an OAuth token stored locally in the user's browser.
```

---

## Permission justifications (Chrome Web Store asks for each permission)

### `storage`
```
Used to store the user's Notion OAuth access token, selected database ID, and a single UI preference flag in the browser's local storage. No data is transmitted anywhere.
```

### `activeTab`
```
When the user clicks the extension icon on an X Article, activeTab grants temporary access to the current tab so the content script can read the article's text, title, author, and images for saving to Notion.
```

### `tabs`
```
Used to open the welcome page on first install and to open the saved article's Notion page in a new tab after a successful save.
```

### Host permission `https://api.notion.com/*`
```
Required to send the extracted article content to the user's Notion workspace via the Notion REST API. This is the only external host the extension communicates with for its core functionality.
```

### Content scripts on `x.com` and `twitter.com`
```
The content script detects whether the current page is a long-form X Article and extracts the article content (title, author, text, images, formatting, links) when the user explicitly clicks Save.
```

### `web_accessible_resources` — `welcome.html`
```
The onboarding tab needs to be reachable via chrome-extension:// URL because Notion's OAuth flow redirects back to it after the user grants access.
```
