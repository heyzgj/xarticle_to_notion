# Chrome Web Store — Submission Answer Sheet (v1.4)

Paste-ready answers for every field the dev console asks, tab by tab. Listing *copy*
(name/description/screenshots) lives in `STORE_LISTING.md`; this file covers the
**Privacy practices** tab + account fields where most reviews stall.

> Manifest facts these answers are built on (`public/manifest.json`):
> - `permissions`: `storage`, `activeTab`, `tabs`, `scripting`
> - `host_permissions`: `https://api.notion.com/*`, `https://127.0.0.1:27124/*`, `http://127.0.0.1:27123/*`
> - content scripts: `x.com`, `twitter.com`, `mp.weixin.qq.com/s/*`, `www.xiaohongshu.com/explore/*` + `/discovery/item/*`, `zhuanlan.zhihu.com/p/*`, `www.zhihu.com/question/*/answer/*`
> - `web_accessible_resources`: `welcome.html` → `<all_urls>`
> - No remote code; all JS bundled.

---

## 1. Single purpose (one field)

```
Lope is a web clipper with a single purpose: saving the content of the web page the user is actively viewing — articles, posts, threads, and notes from X, WeChat, RedNote, Zhihu, and any readable article — into a destination the user owns: their Notion database, their local Obsidian vault, or the system clipboard as Markdown. Every feature exists to capture the current page on an explicit user action and store it for the user (or their AI assistant) to reference later. The extension does nothing else — no browsing analytics, no background collection, no ads.
```

---

## 2. Permission justifications (one box each)

**`activeTab`**
```
When the user clicks the Lope toolbar icon or presses the save shortcut, activeTab lets Lope read the content of the page they are currently viewing so it can be extracted and saved. It is invoked only by that explicit user gesture and grants no standing or background access to any tab.
```

**`storage`**
```
Stores the user's own settings locally in the browser: their Notion connection (OAuth token + chosen database), optional Obsidian Local REST API credentials, UI preferences, a short-lived category cache, and a one-time OAuth nonce used to secure sign-in. Nothing stored via this permission is sent to the developer or any third party.
```

**`tabs`**
```
Used to (1) open the saved page in a new tab after a successful save (e.g. the new Notion page), (2) open the one-time onboarding/welcome page on first install and to complete the Notion sign-in redirect, and (3) read the active tab's URL on save to choose the correct extractor and skip unsupported pages (chrome://, etc.). Lope does not read the contents of background tabs and does not track browsing history.
```

**`scripting`**
```
Used to inject, only when the user saves, two bundled scripts into the active tab: (1) a generic Readability-based extractor for sites without a dedicated content script, and (2) the small in-page "Saved" confirmation toast. Injection runs only in response to an explicit user save action, only into the tab being saved, and only injects code packaged inside the extension — never remote code.
```

**Host permissions** (single combined box — cover each host)
```
- https://api.notion.com/* — to send the saved page to the user's own Notion workspace via the official Notion API. Used only when the user chooses to save to Notion.
- https://127.0.0.1:27124/* and http://127.0.0.1:27123/* — to send the saved page to the user's own local Obsidian vault via the Obsidian Local REST API plugin running on their machine. Traffic stays on localhost; used only when the user saves to Obsidian.
- Content scripts on x.com, twitter.com, mp.weixin.qq.com, xiaohongshu.com (RedNote) and zhihu.com — to detect and extract the article/post/note the user is viewing on these platforms when they click save. These scripts read the page only on an explicit user save gesture; they do not run in the background or exfiltrate data.
```

**`web_accessible_resources` — why `welcome.html` is exposed** (if asked / for reviewer notes)
```
welcome.html is the onboarding + sign-in-return page. The Notion OAuth flow finishes by redirecting from our stateless sign-in proxy to chrome-extension://<id>/welcome.html, which requires that page to be web-accessible. It contains no user data and no logic beyond onboarding. (A future tightening could scope the match from <all_urls> to only the proxy origin.)
```

---

## 3. Remote code

**Are you using remote code?** → **No.**
```
No. All JavaScript and assets are bundled in the package. Lope executes no remotely hosted code and loads no external scripts. Its only network requests are: saving content to the user's chosen destination (Notion API or the user's local Obsidian), and a stateless OAuth proxy that completes Notion's sign-in. Fonts are self-hosted in the package (no CDN).
```

---

## 4. Data usage (the "Privacy" data-collection section)

**What user data does the item collect?** — Chrome counts any data that *leaves the device* as "collected," even when it goes to the user's own service. Check honestly:

| Category | Check? | Why |
|---|---|---|
| **Website content** | ☑ Yes | The page the user explicitly saves is transmitted — but only to the user's own Notion/Obsidian/clipboard, never to the developer. |
| **Authentication information** | ☑ Yes | The Notion OAuth token / Obsidian key are stored locally and sent only to the user's own Notion/Obsidian to perform saves. Never sent to the developer. |
| Personally identifiable info | ☐ No | Not collected. (Author names inside saved content are part of "website content," declared above.) |
| Location | ☐ No | RedNote's public IP-location label may appear inside saved content (website content), but Lope does not collect device location. |
| Financial / Health / Personal communications / Web history / User activity | ☐ No | Not collected. |

**Handling note (paste into the "data handling" / context box if present):**
```
Lope is a local-first clipper. All data the user saves goes directly from the user's browser to a destination the user controls (their Notion workspace, their local Obsidian vault, or the clipboard). The developer operates no analytics and no server that receives user content. The only developer-operated component is a stateless OAuth proxy that exchanges Notion's auth code for a token and immediately hands it back to the user's browser — it stores and logs nothing.
```

**Three required certifications — check all (all true):**
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ☑ I do not use or transfer user data for purposes unrelated to my item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:**
```
https://raw.githubusercontent.com/heyzgj/xarticle_to_notion/main/PRIVACY.md
```

---

## 5. Account / contact fields

- **Category:** Productivity (secondary: Tools)
- **Language:** English
- **Support email:** the email on your developer account
- **Website:** https://github.com/heyzgj/xarticle_to_notion

---

## 6. Reviewer-friction pre-empts (worth knowing)

- **Why so many host permissions?** Each maps 1:1 to a supported save source or destination (answered above). None is for tracking.
- **Why `scripting` + broad-ish content scripts?** Extraction must read the page being saved; injection is user-gesture-gated and bundled-code-only.
- **127.0.0.1 cleartext (`:27123`)** — loopback only, the user's own machine; the https `:27124` is the default. Harmless but expect a possible question.
- **Single purpose consistency** — the name ("Web Clipper for your agents"), description, and this single-purpose statement all say the same thing: save the current page to the user's knowledge base. Keep them aligned if you edit one.
