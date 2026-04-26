import { Readability, isProbablyReaderable } from '@mozilla/readability';
import type { SiteProfile, ArticleData, ArticleBlock } from '../types';
import { rehydrateImages } from '../primitives/rehydrate-imgs';
import { htmlToBlocks } from '../primitives/html-to-blocks';

/**
 * Generic profile — Mozilla Readability fallback for unknown domains.
 *
 * Wired as the `fallback` argument to createPipeline (or as the last entry of
 * the registry with `match: () => true`). Should never run on URLs covered by
 * a dedicated profile.
 *
 * Pipeline:
 *   1. isProbablyReaderable() gate → null if the page has no readable content
 *   2. cloneNode(true) → Readability mutates its input, so clone first
 *   3. Readability.parse() → cleaned article HTML + standard metadata
 *   4. rehydrateImages → cover any data-src lazy patterns Readability missed
 *   5. htmlToBlocks → ArticleBlock[] for Notion / Obsidian downstream
 */
export const generic: SiteProfile = {
  name: 'generic',
  match: () => true,
  detect: () => 'article',
  extract(doc, url): ArticleData | null {
    if (!isProbablyReaderable(doc, { minContentLength: 140 })) return null;

    const docClone = doc.cloneNode(true) as Document;
    const parsed = new Readability(docClone, {
      // Strip presentational classes — agent-first body should be plain
      keepClasses: false,
      // Skip JSON-LD parsing; we don't need the extra metadata fields and the
      // structured-data path adds latency we can't await inline reliably.
      disableJSONLD: true,
    }).parse();

    if (!parsed?.content) return null;

    const container = doc.createElement('div');
    container.innerHTML = parsed.content;
    rehydrateImages(container);
    const body = htmlToBlocks(container);

    if (body.length === 0) return null;

    const title = stripSiteSuffix(
      (parsed.title ?? doc.title ?? '').trim() || 'Untitled',
      parsed.siteName ?? '',
    );
    const author = (parsed.byline ?? '').trim();
    const site = (parsed.siteName ?? hostnameOf(url)).trim();
    const publishedDate = pickPublishedDate(doc, parsed.publishedTime);

    return {
      source: 'generic',
      contentType: 'article',
      title,
      author: { displayName: author, handle: '' },
      publishedDate,
      url,
      body,
      site,
    };
  },
  notionSchema: {
    Title:     { type: 'title' },
    Author:    { type: 'rich_text' },
    Site:      { type: 'select' },
    Published: { type: 'date' },
    URL:       { type: 'url' },
    Type:      { type: 'select' },
  },
};

function pickPublishedDate(doc: Document, fromReadability: string | null | undefined): string {
  if (fromReadability && isIsoLike(fromReadability)) return fromReadability;
  // Common semantic-meta fallbacks
  const candidates = [
    doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content'),
    doc.querySelector('meta[itemprop="datePublished"]')?.getAttribute('content'),
    doc.querySelector('meta[name="pubdate"]')?.getAttribute('content'),
    doc.querySelector('time[datetime]')?.getAttribute('datetime'),
  ];
  for (const c of candidates) if (c && isIsoLike(c)) return c;
  return new Date().toISOString();
}

function isIsoLike(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(s);
}

function stripSiteSuffix(title: string, siteName: string): string {
  if (!siteName) return title;
  // Common patterns: "Article Title | The Verge", "Article Title - The Verge",
  // "Article Title — The Verge". Only strip when the suffix is a clean tail.
  const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\s*[|\\-—–]\\s*${escaped}\\s*$`);
  return title.replace(re, '').trim() || title;
}

function hostnameOf(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}
