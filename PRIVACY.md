# Privacy Policy — X2Notion

**Last updated: 2026-04-08**

X2Notion ("the extension") is a Chrome extension that saves long-form X (Twitter) Articles to your personal Notion workspace. This policy explains what the extension does with your data — in plain English.

## TL;DR

- **We do not collect, store, transmit, sell, share, or see any of your data.**
- Everything the extension does happens **locally in your browser**, or directly between your browser and Notion's own servers.
- The only server we operate is a tiny stateless OAuth proxy that helps you connect your Notion account. It never stores your data.

## What data the extension handles

### 1. Your Notion access token
When you click "Connect to Notion" during onboarding, Notion redirects you through an OAuth flow and issues an access token tied to the pages/databases you chose to share. This token is stored **only in your browser** (`chrome.storage.sync`) so the extension can save articles on your behalf. It never leaves your browser except when you make an API call to Notion.

### 2. The database you selected
The name and ID of the Notion database you chose to save articles to. Stored in `chrome.storage.sync`. Same scope as the token — never sent anywhere else.

### 3. The content of the article you save
When you click "Save to Notion" on an X article, the extension reads the article's text, author, date, and images **from the current browser tab** and posts it directly to `api.notion.com` using your access token. The article content is **not sent to us or any third party** — it goes straight from your browser to Notion.

### 4. Local preferences
A single boolean flag remembering whether you want the "category & tags" form expanded by default. Stored in `chrome.storage.local`.

## What data the extension does NOT handle

- **No analytics.** The extension does not include any analytics, telemetry, crash reporting, or usage tracking.
- **No remote code.** The extension bundles all its code. It does not download or execute any code at runtime.
- **No user accounts.** There is no X2Notion account, login, password, or user database. You authenticate directly with Notion.
- **No cross-site tracking.** The content script runs only on `x.com` and `twitter.com`, and only reads the page when you explicitly click the extension.

## The OAuth proxy

To complete Notion's OAuth flow, the extension briefly redirects you through a small Cloudflare Worker we run at `x2notion-oauth.heyzgj.workers.dev`. This Worker does exactly one thing: it exchanges Notion's temporary authorization code for an access token and immediately redirects that token back to your browser. **The Worker is stateless — it logs nothing, stores nothing, and forgets about you the moment the redirect completes.**

The Worker exists only because Notion's OAuth spec requires a confidential client secret that cannot be embedded in an extension. The Worker holds that secret and nothing else.

## Permissions we request and why

- **`storage`** — Save your Notion token, database ID, and local preferences to `chrome.storage`.
- **`activeTab`** — When you click the extension icon, access the current X tab to read the article you want to save.
- **`tabs`** — Open the Notion page after a successful save, open the welcome tab on first install.
- **`https://api.notion.com/*`** — Send article content directly to Notion's servers.
- **Content script on `x.com`/`twitter.com`** — Detect whether the current page is a long-form Article and extract its content when you click Save.

## Your choices

- **Disconnect at any time.** Open the extension settings → "Disconnect". This deletes your token and database ID from your browser. You can reconnect whenever you want.
- **Uninstall the extension.** All data stored by the extension is removed automatically when you uninstall it from Chrome.
- **Revoke Notion access directly.** Visit [notion.so/my-integrations](https://www.notion.so/my-integrations) and revoke the X2Notion integration.

## Children

X2Notion is not directed to children under 13. We do not knowingly collect data from children.

## Changes to this policy

If we ever change this policy, we will update the "Last updated" date at the top and, if the changes are material, announce them in the extension's Chrome Web Store listing.

## Contact

Questions? Open an issue at [github.com/heyzgj/xarticle_to_notion](https://github.com/heyzgj/xarticle_to_notion).
