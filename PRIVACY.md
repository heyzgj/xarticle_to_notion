# Privacy Policy — Lope

**Last updated: 2026-04-27**

Lope ("the extension") is a Chrome extension that saves web content — X (Twitter) articles, threads, tweets, and quote tweets; WeChat 公众号 articles; Xiaohongshu notes; Zhihu articles and answers; and any Readability-friendly article on any other site — to your personal Notion workspace or local Obsidian vault. This policy explains what the extension does with your data — in plain English.

## TL;DR

- **We do not collect, store, transmit, sell, share, or see any of your data.**
- Everything the extension does happens **locally in your browser**, or directly between your browser and the destination you choose (Notion's servers, or your own Obsidian vault running on 127.0.0.1).
- The only server we operate is a tiny stateless OAuth proxy that helps you connect your Notion account. It never stores your data.

## What data the extension handles

### 1. Your Notion access token
When you click "Connect to Notion" during onboarding, Notion redirects you through an OAuth flow and issues an access token tied to the pages/databases you chose to share. This token is stored **only in your browser** (`chrome.storage.sync`) so the extension can save content on your behalf. It never leaves your browser except when you make an API call to Notion.

### 2. The database you selected
The name and ID of the Notion database you chose to save to. Stored in `chrome.storage.sync`. Same scope as the token — never sent anywhere else.

### 3. The content you save
When you click Save on a supported page, the extension reads the content (text, author, date, images, tags, location, video poster URLs as applicable) **from the current browser tab** and posts it directly to your selected destination(s) using your stored credentials. The content is **not sent to us or any third party** — it goes straight from your browser to your destination(s).

### 4. Obsidian Local REST API credentials (optional)
If you choose to save to a local Obsidian vault, the extension stores the API key and host URL you provide for the [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin. Stored in `chrome.storage.sync`. Used only to PUT files into your local vault on `127.0.0.1`. Never sent anywhere else.

### 5. Local preferences
A single boolean flag remembering whether you want the "category & tags" form expanded by default. Stored in `chrome.storage.local`.

## What data the extension does NOT handle

- **No analytics.** The extension does not include any analytics, telemetry, crash reporting, or usage tracking.
- **No remote code.** The extension bundles all its code. It does not download or execute any code at runtime.
- **No user accounts.** There is no Lope account, login, password, or user database. You authenticate directly with Notion.
- **No cross-site tracking.** Content scripts run only on the platforms listed in the manifest (X, WeChat, Xiaohongshu, Zhihu) and only read the page when you explicitly click the extension. The generic Readability fallback is injected on demand only when you click Save on an unsupported site — it never auto-runs.

## The OAuth proxy

To complete Notion's OAuth flow, the extension briefly redirects you through a small Cloudflare Worker we run at `x2notion-oauth.heyzgj.workers.dev`. This Worker does exactly one thing: it exchanges Notion's temporary authorization code for an access token and immediately redirects that token back to your browser. **The Worker is stateless — it logs nothing, stores nothing, and forgets about you the moment the redirect completes.**

The Worker exists only because Notion's OAuth spec requires a confidential client secret that cannot be embedded in an extension. The Worker holds that secret and nothing else.

> The Worker still uses the legacy `x2notion-oauth` subdomain even though the extension is now branded Lope. Renaming it would require a re-deploy plus updating the Notion developer-portal callback URL — a separate ops task that does not affect privacy or behavior.

## Permissions we request and why

- **`storage`** — Save your Notion token, database ID, optional Obsidian credentials, and local preferences to `chrome.storage`.
- **`activeTab`** — When you click the extension icon, access the current tab to read the content you want to save.
- **`tabs`** — Open the saved page after a successful save, open the welcome tab on first install.
- **`scripting`** — Inject the generic Readability extractor on demand when you save from a non-platform site. This permission is invoked only by your explicit click; the extension never injects scripts in the background or across pages.
- **`https://api.notion.com/*`** — Send content directly to Notion's servers (only if you save to Notion).
- **`https://127.0.0.1:27124/*` and `http://127.0.0.1:27123/*`** — Send content to your local Obsidian Local REST API plugin (only if you save to Obsidian; both endpoints stay on your own machine).
- **Content scripts on `x.com` / `twitter.com` / `mp.weixin.qq.com/s/*` / `xiaohongshu.com/explore/*` / `xiaohongshu.com/discovery/item/*` / `zhuanlan.zhihu.com/p/*` / `zhihu.com/question/*/answer/*`** — Detect supported content on each platform and extract its content when you click Save.

## Your choices

- **Disconnect at any time.** Open the extension settings → "Disconnect". This deletes your token and database ID from your browser. You can reconnect whenever you want.
- **Uninstall the extension.** All data stored by the extension is removed automatically when you uninstall it from Chrome.
- **Revoke Notion access directly.** Visit [notion.so/my-integrations](https://www.notion.so/my-integrations) and revoke the integration. Existing users may see it listed under its previous integration name; revoking it works the same way.

## Children

Lope is not directed to children under 13. We do not knowingly collect data from children.

## Changes to this policy

If we ever change this policy, we will update the "Last updated" date at the top and, if the changes are material, announce them in the extension's Chrome Web Store listing.

## Contact

Questions? Open an issue at [github.com/heyzgj/xarticle_to_notion](https://github.com/heyzgj/xarticle_to_notion). (The repo name has not yet been renamed; link stability matters more than rebrand consistency for now.)
