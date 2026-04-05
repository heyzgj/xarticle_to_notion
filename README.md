# X Article to Notion

A Chrome extension that saves X (Twitter) posts and articles to your Notion database with one click.

## What it does

- Click the extension icon on any X post or article
- Pick a category (or create a new one)
- The full content — text, images, metadata — gets saved to your Notion database

Works with regular tweets, long-form X Articles, and threads.

## Setup

### 1. Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name it anything (e.g. "X Article")
4. Copy the **Internal Integration Secret** (starts with `ntn_...`)

### 2. Create a Notion Database

Create a database with these properties:

| Property | Type |
|----------|------|
| Title | Title |
| URL | URL |
| Author | Text |
| Handle | Text |
| Published | Date |
| Saved | Date |
| Category | Select |
| Tags | Multi-select |

Then **connect your integration** to the database: click `...` → `Connect to` → select your integration.

### 3. Install the Extension

```bash
git clone https://github.com/heyzgj/xarticle_to_notion.git
cd xarticle_to_notion
npm install
npm run build
```

Then load it in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `dist/` folder

### 4. Configure

Click the extension icon → if not configured, click **Open Settings**:

- **Notion API Token**: paste your integration secret
- **Database ID**: from your database URL — the 32-char hex string before `?v=`
  ```
  notion.so/workspace/da9f4193e99a4776b0aa4d299724e3f5?v=...
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  ```
- Click **Test Connection** to verify, then **Save Settings**

## Usage

1. Open any X post or article in your browser
2. Click the extension icon
3. Select a category (or create a new one)
4. Optionally add tags
5. Click **Save to Notion**

The article's title, author, date, full text, and images are saved to your Notion database.

## Development

```bash
npm run dev       # build + watch for changes
npm run build     # production build
npm run typecheck # type check without emitting
```

## Tech Stack

- TypeScript
- Chrome Extension Manifest V3
- Notion API (raw fetch, no SDK)
- Webpack
