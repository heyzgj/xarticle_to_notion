# X2Notion — Project Context for Claude Code

## What This Project Is

X2Notion is a Chrome extension that saves X (Twitter) content to Notion. The surface-level pitch is "one-click save for articles and threads." The actual product is a **structured content pipeline for AI agents**.

The Notion database is a knowledge base that agents query, filter, and digest. The human experience (clean popup, OAuth, one-click) exists to make the pipeline easy to feed. Agent consumption is the real output.

This distinction must inform every decision in this codebase.

---

## Architecture

```
X page DOM
  └─ content/detector.ts      — detect content type (article | thread | none)
  └─ content/extractor.ts     — extract into typed ArticleData structure
       └─ types/article.ts    — ArticleBlock union, ArticleData interface

background/notionApi.ts       — ArticleData → Notion API calls
  └─ ensureDatabaseSchema()   — auto-migrate schema once per session
  └─ articleToNotionBlocks()  — ArticleBlock → NotionBlock[]
  └─ saveArticle()            — create page + batch-append blocks

popup/index.ts                — UI chrome, routes messages to background
background/index.ts           — message router
```

---

## Agent-First Design Principles

These are non-negotiable. Apply them when adding features, changing extraction logic, or designing schema.

### 1. Structured properties over body-embedded metadata
Anything an agent might filter or sort on belongs in a Notion **property**, not buried in the body.

- `Type` (select: Article | Thread) — agents filter by content type
- `TweetCount` (number) — agents can sort threads by length
- `Author`, `Handle`, `Published`, `URL` — standard retrieval fields

Rule: if a future agent query looks like "find all threads longer than 5 tweets", the answer must come from a property lookup, not full-text search.

### 2. Agent-parseable markers for non-text content
When content can't be natively embedded (video), the marker must be machine-readable:

- Videos → `[Video]` paragraph + poster as image block above it
- The pattern `[Video]` is grep-safe, stable, and unambiguous
- Never use emoji-only markers (not grep-safe), vague labels ("media"), or skip the marker entirely

### 3. Consistent sequential structure for threads
Thread tweets use `**n/total**` bold paragraphs (e.g. `**3/7**`) before each tweet's content, with `---` dividers between tweets. This is regex-parseable: `/\*\*(\d+)\/(\d+)\*\*/`.

Agents reading a thread can reconstruct the sequence, count total tweets, and extract individual tweet content by splitting on dividers. Do not change this format without considering agent parsing.

### 4. Noise-free extraction
Every piece of text that reaches Notion was extracted deliberately. The `isNoiseText()` filter in `extractor.ts` eliminates UI chrome (engagement counts, timestamps, follow buttons, etc.). This is not optional aesthetic cleanup — it directly affects agent comprehension.

When adding new content sources, extend `NOISE_PATTERNS` rather than letting noise through.

### 5. Consistent schema across all databases
`ensureDatabaseSchema()` runs before every save. It ensures `Type` and `TweetCount` properties exist, auto-migrating older databases. Agents expect the same property structure on every page regardless of when the database was created.

Never add a new required property without also adding it to `ensureDatabaseSchema()`.

### 6. Typed `ArticleBlock` union — extend it, don't skip it
All content passes through the `ArticleBlock` union type. When new media types are supported, add them to the union in `types/article.ts` first, then implement extraction in `extractor.ts`, then rendering in `convertBlock()` in `notionApi.ts`. Never write bespoke Notion API calls that bypass this pipeline.

---

## Feature Evaluation Lens

Before implementing any new feature, ask:

1. **Can an agent reliably parse and act on this?** If the answer requires full-text search or guesswork, restructure.
2. **Is the schema consistent?** Will every saved item have this data, or only sometimes?
3. **Is the extraction signal stable?** X's DOM changes. Rely on `data-testid` attributes and structural heuristics over class names or element order.
4. **Does it add noise?** Any text that isn't content degrades agent comprehension.

---

## Current Content Types

| Type | Detector signal | Key properties | Body format |
|------|----------------|----------------|-------------|
| Article | `article-cover-image`, h1+long content | Type=Article | Structured blocks (headings, paragraphs, images, video) |
| Thread | 2+ same-author `<article>` elements | Type=Thread, TweetCount=N | `**n/total**` + dividers |

**Not yet supported:** Regular single tweet (no long-form content, no thread). Will need a third detector branch when implemented.

---

## Key Constraints

- **Notion text limit**: 2000 chars per rich text segment, 100 rich text segments per block — enforced in `segmentToRichText()` and `splitRichTextBlocks()`
- **Notion batch limit**: 100 blocks per API request — `NOTION_MAX_BLOCKS_PER_REQUEST` constant, handled in `saveArticle()`
- **Rate limiting**: `notionFetch()` retries on 429 with `Retry-After` header
- **Video source URLs**: X serves video via blob: URLs (session-only). Extract poster image + emit `[Video]` marker. The original URL is saved as a page property so agents can retrieve the source.
- **Schema migration**: `knownProperties` is module-level cache (reset on service worker restart). This is intentional — migration runs at most once per background session.
