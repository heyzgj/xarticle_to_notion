import type { SiteProfile, ArticleData, ArticleBlock } from '../types';

/**
 * Feishu / Lark cloud docs (docx + wiki).
 *
 * Unlike the server-rendered article sites (zhihu/wechat), a Feishu doc is a
 * virtualized block editor — the live DOM only holds the ~8 blocks around the
 * viewport, so scraping `document` yields a fraction of a long doc. The full
 * document, however, ships inside the initial page response as a flat block
 * map (the same model the editor hydrates from). So instead of scraping the
 * DOM we re-fetch the doc URL with the user's session cookie and parse the
 * embedded block tree.
 *
 * This is:
 *   - route-agnostic   — docx and wiki both embed the same block model
 *   - tenant-agnostic  — feishu.cn / larkoffice.com / larksuite.com share one
 *                        front end (only the host differs)
 *   - restriction-proof — copy/print/export locks are applied client-side
 *                        *after* the data has already arrived in the payload
 *
 * Block model (each block keyed by id in the embedded map):
 *   { id, version, data: { type, parent_id, children: string[], text?, image? } }
 * data.type ∈ page | text | heading1..9 | bullet | ordered | code | image |
 *            callout | quote_container | divider | table | ...
 * Text is Etherpad-style attributed text; the plain line for a block lives at
 *   data.text.initialAttributedTexts.text["0"].
 * Styling/links live in the parallel `attribs` run encoding — deferred; v1
 * extracts plain text (links/bold are a follow-up).
 */

const FEISHU_HOSTS = /\.(feishu\.cn|larkoffice\.com|larksuite\.com)$/;
const DOC_ROUTE = /^\/(docx|docs|wiki)\/[A-Za-z0-9]+/;

interface FeishuData {
  type: string;
  parent_id?: string;
  children?: string[];
  text?: { initialAttributedTexts?: { text?: Record<string, string> } };
  image?: { token?: string; name?: string };
}

export const feishu: SiteProfile = {
  name: 'feishu',
  match(url) {
    try {
      const u = new URL(url);
      return FEISHU_HOSTS.test(u.hostname) && DOC_ROUTE.test(u.pathname);
    } catch {
      return false;
    }
  },
  async extract(doc, url): Promise<ArticleData | null> {
    const html = await fetchDocHtml(url);
    if (!html) return null;

    const blocks = parseBlockMap(html);
    const rootId = findRoot(blocks);
    if (!rootId) return null;

    const body: ArticleBlock[] = [];
    walk(rootId, blocks, body, new Set(), false);
    if (body.length === 0) return null;

    const isLark = /larksuite|larkoffice/.test(safeHost(url));
    return {
      source: 'feishu',
      contentType: 'article',
      title: cleanTitle(doc.title),
      author: { displayName: '', handle: '' },
      publishedDate: parseEditTimestamp(html) ?? new Date().toISOString(),
      url,
      body,
      site: isLark ? 'Lark' : 'Feishu',
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

async function fetchDocHtml(url: string): Promise<string | null> {
  try {
    // Same-origin GET from the content script — sends the user's session
    // cookie, returns the SSR HTML with the full block model embedded.
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Extract the flat block map from the SSR payload. Each block serializes as
 * `{"id":"<id>","version":<n>,"data":{...}}`. We scan for that stable prefix
 * and brace-match each object, rather than depending on the (minified, churny)
 * local variable the page assigns them to.
 */
function parseBlockMap(html: string): Record<string, FeishuData> {
  const blocks: Record<string, FeishuData> = {};
  const re = /\{"id":"([A-Za-z0-9_-]{6,60})","version":\d+,"data":\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const start = m.index;
    const end = braceMatch(html, start);
    if (end < 0) {
      re.lastIndex = start + 10;
      continue;
    }
    try {
      const obj = JSON.parse(html.slice(start, end)) as { id?: string; data?: FeishuData };
      if (obj?.id && obj.data) blocks[obj.id] = obj.data;
    } catch {
      /* skip a malformed entry, keep going */
    }
    re.lastIndex = end;
  }
  return blocks;
}

/** Index of the char after the object that starts at `start` (a `{`), or -1. */
function braceMatch(s: string, start: number): number {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function findRoot(blocks: Record<string, FeishuData>): string | null {
  for (const id in blocks) if (blocks[id].type === 'page') return id;
  // Fallback: a block whose parent isn't in the map (an orphan root).
  for (const id in blocks) {
    const p = blocks[id].parent_id;
    if (!p || !blocks[p]) return id;
  }
  return null;
}

// Container blocks carry no text of their own — they only group children.
const CONTAINER = new Set(['page', 'callout', 'quote_container']);

function walk(
  id: string,
  blocks: Record<string, FeishuData>,
  out: ArticleBlock[],
  seen: Set<string>,
  inQuote: boolean,
): void {
  if (seen.has(id)) return;
  seen.add(id);
  const b = blocks[id];
  if (!b) return;

  const quoteCtx = inQuote || b.type === 'quote_container';
  if (!CONTAINER.has(b.type)) {
    const block = mapBlock(b, quoteCtx);
    if (block) out.push(block);
  }
  for (const c of b.children ?? []) walk(c, blocks, out, seen, quoteCtx);
}

function mapBlock(b: FeishuData, inQuote: boolean): ArticleBlock | null {
  const text = plainText(b);
  switch (b.type) {
    case 'heading1':
      return { type: 'heading_1', text };
    case 'heading2':
      return { type: 'heading_2', text };
    case 'heading3':
    case 'heading4':
    case 'heading5':
    case 'heading6':
    case 'heading7':
    case 'heading8':
    case 'heading9':
      return { type: 'heading_3', text };
    case 'bullet':
      return text ? { type: 'bulleted_list_item', text } : null;
    case 'ordered':
      return text ? { type: 'numbered_list_item', text } : null;
    case 'divider':
      return { type: 'divider' };
    case 'image': {
      // Feishu images are served via short-lived, cookie-gated URLs an external
      // store (Notion) can't fetch — emit a grep-safe marker, mirroring the
      // [Video] convention. Real images are a download+reupload follow-up.
      const name = b.image?.name ? ` ${b.image.name}` : '';
      return { type: 'paragraph', richText: [{ text: `[Image]${name}` }] };
    }
    case 'text':
    case 'code':
    default:
      if (!text) return null;
      return inQuote
        ? { type: 'quote', text }
        : { type: 'paragraph', richText: [{ text }] };
  }
}

function plainText(b: FeishuData): string {
  const t = b.text?.initialAttributedTexts?.text?.['0'];
  // Strip zero-width spaces Feishu sprinkles into empty/placeholder lines.
  return (t ?? '').replace(/​/g, '').trim();
}

/** window.__SSR_DOC_INFO__ = JSON.parse(decodeURIComponent('...{edit_timestamp}...')) */
function parseEditTimestamp(html: string): string | null {
  const a = html.indexOf('__SSR_DOC_INFO__');
  if (a < 0) return null;
  const m = html.slice(a, a + 4000).match(/decodeURIComponent\('([^']+)'\)/);
  if (!m) return null;
  try {
    const info = JSON.parse(decodeURIComponent(m[1])) as {
      edit_timestamp?: number;
      create_timestamp?: number;
    };
    const ts = info.edit_timestamp ?? info.create_timestamp;
    if (ts) return new Date(ts * (ts > 1e12 ? 1 : 1000)).toISOString();
  } catch {
    /* ignore */
  }
  return null;
}

function cleanTitle(t: string): string {
  return (
    (t || 'Untitled')
      .replace(/\s*[-–—]\s*(Feishu Docs|Lark Docs|Lark|Feishu)\s*$/i, '')
      .trim() || 'Untitled'
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
