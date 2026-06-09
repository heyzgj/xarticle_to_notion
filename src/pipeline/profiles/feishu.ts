import type { SiteProfile, ArticleData, ArticleBlock } from '../types';

/**
 * Feishu / Lark cloud docs (docx + wiki).
 *
 * A Feishu doc is a virtualized block editor. Two facts shape this profile:
 *
 *  1. The live DOM only holds the ~8 blocks around the viewport, so scraping
 *     `document` yields a fraction of a long doc.
 *  2. The initial page response (SSR) embeds a flat block map — but for a LONG
 *     doc that map is only the above-the-fold slice. The rest streams in over a
 *     WebSocket as the user navigates. Programmatic scroll / synthetic wheel are
 *     ignored by the editor (only trusted input triggers the lazy load), so we
 *     cannot force-render by faking a scroll.
 *
 * Strategy:
 *   - Re-fetch the doc URL (session cookie) and parse the SSR block map. This is
 *     the full doc for short docs, and structure + early content + ALL headings
 *     for long docs.
 *   - Detect truncation (a block whose child id isn't in the map → the rest is
 *     lazy). When truncated, walk the outline (TOC): clicking an outline entry is
 *     a discrete UI event Feishu honors, and its own navigation renders + loads
 *     that section. Harvest each section's rendered text and splice it back into
 *     the SSR structure under the matching heading.
 *
 * Route-agnostic (docx + wiki), tenant-agnostic (feishu.cn / larkoffice.com /
 * larksuite.com share one front end), restriction-proof (copy/print locks are
 * client-side, applied after the data has arrived).
 *
 * Block model (each block keyed by id in the embedded map):
 *   { id, version, data: { type, parent_id, children: string[], text?, image? } }
 * Plain line text lives at data.text.initialAttributedTexts.text["0"].
 */

const FEISHU_HOSTS = /\.(feishu\.cn|larkoffice\.com|larksuite\.com)$/;
const DOC_ROUTE = /^\/(docx|docs|wiki)\/[A-Za-z0-9]+/;

// Per-section render budget for the outline walk. The async extract pipeline
// lets us await between clicks (a content script can't fake a trusted scroll,
// but it can .click() and wait for Feishu to navigate + stream the section in).
const TOC_STEP_MS = 380;

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

    const ssrBody: ArticleBlock[] = [];
    walk(rootId, blocks, ssrBody, new Set(), false);
    if (ssrBody.length === 0) return null;

    // Only pay the outline-walk cost when the SSR payload is actually truncated
    // (long doc). Short docs are fully present — skip the walk and stay instant.
    let body = ssrBody;
    if (isTruncated(blocks)) {
      try {
        const harvest = await autoTocHarvest(doc);
        body = mergeHarvest(ssrBody, harvest);
      } catch {
        /* outline walk failed — fall back to SSR-only (early sections) */
      }
    }

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
    // Same-origin GET from the content script — sends the user's session cookie,
    // returns the SSR HTML with the (partial, for long docs) block model embedded.
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Extract the flat block map from the SSR payload. Each block serializes as
 * `{"id":"<id>","version":<n>,"data":{...}}`. We scan for that stable prefix and
 * brace-match each object, rather than depending on the (minified, churny) local
 * variable the page assigns them to.
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
  for (const id in blocks) {
    const p = blocks[id].parent_id;
    if (!p || !blocks[p]) return id;
  }
  return null;
}

/** A child reference to a block not in the map ⇒ the SSR payload is partial. */
function isTruncated(blocks: Record<string, FeishuData>): boolean {
  for (const id in blocks) {
    for (const c of blocks[id].children ?? []) {
      if (!blocks[c]) return true;
    }
  }
  return false;
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
      // Feishu images use short-lived, cookie-gated URLs an external store can't
      // fetch — emit a grep-safe marker, mirroring the [Video] convention.
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
  return clean(t ?? '');
}

// ---------------------------------------------------------------------------
// Outline walk — recover the lazy-loaded tail of a long doc.
// ---------------------------------------------------------------------------

/**
 * Click each outline (TOC) entry top-to-bottom. Feishu's own navigation renders
 * and streams in that section; we harvest the freshly-rendered lines and tag
 * them to the section heading. Returns Map<sectionHeadingText, lines[]>.
 *
 * A line is attributed to the first section that surfaced it (the walk is
 * ordered), so each line lands under the heading it belongs to.
 */
async function autoTocHarvest(doc: Document): Promise<Map<string, string[]>> {
  const bySection = new Map<string, string[]>();
  const cat = doc.querySelector('.catalogue__scroller');
  if (!cat) return bySection; // no outline (short doc / headings off) — SSR suffices

  const entries = tocEntries(cat);
  if (entries.length === 0) return bySection;

  const seenLine = new Set<string>();
  for (const entry of entries) {
    const section = norm(entry.textContent ?? '');
    if (!section) continue;
    try {
      entry.click();
    } catch {
      continue;
    }
    await sleep(TOC_STEP_MS); // let Feishu navigate + render + stream the section
    const fresh: string[] = [];
    for (const ln of harvestVisibleLines(doc)) {
      if (seenLine.has(ln)) continue;
      seenLine.add(ln);
      fresh.push(ln);
    }
    if (fresh.length) {
      bySection.set(section, (bySection.get(section) ?? []).concat(fresh));
    }
  }
  return bySection;
}

/** Leaf text entries inside the outline panel, de-duped by text, in order. */
function tocEntries(cat: Element): HTMLElement[] {
  const all = Array.from(cat.querySelectorAll<HTMLElement>('*')).filter(
    (e) =>
      (e.textContent ?? '').trim().length > 1 &&
      e.children.length === 0 &&
      e.getBoundingClientRect().height > 0,
  );
  const seen = new Set<string>();
  return all.filter((e) => {
    const t = (e.textContent ?? '').trim();
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

/** Rendered content lines right now (excludes the outline panel). */
function harvestVisibleLines(doc: Document): string[] {
  const out: string[] = [];
  doc.querySelectorAll<HTMLElement>('[data-record-id]').forEach((el) => {
    if (el.closest('.catalogue__scroller')) return;
    for (const raw of (el.innerText ?? '').split('\n')) {
      const ln = clean(raw);
      if (ln.length > 1) out.push(ln);
    }
  });
  return out;
}

/**
 * Splice harvested late content back into the SSR structure: emit SSR blocks in
 * order, and after each heading append any harvested lines for that section that
 * the SSR didn't already contain. Early sections are SSR-complete (harvest lines
 * dedupe away); late sections are heading-only in SSR and get filled here.
 */
function mergeHarvest(ssrBody: ArticleBlock[], harvest: Map<string, string[]>): ArticleBlock[] {
  if (harvest.size === 0) return ssrBody;

  const seen = new Set<string>();
  for (const b of ssrBody) seen.add(norm(blockText(b)));

  const out: ArticleBlock[] = [];
  const used = new Set<string>();
  for (const b of ssrBody) {
    out.push(b);
    if (b.type === 'heading_1' || b.type === 'heading_2' || b.type === 'heading_3') {
      const key = norm(b.text);
      const lines = harvest.get(key);
      if (!lines) continue;
      used.add(key);
      for (const ln of lines) {
        const k = norm(ln);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ type: 'paragraph', richText: [{ text: ln }] });
      }
    }
  }

  // Safety net: any harvested section that didn't string-match an SSR heading —
  // append its unseen lines so nothing is silently dropped.
  for (const [key, lines] of harvest) {
    if (used.has(key)) continue;
    const fresh = lines.filter((ln) => !seen.has(norm(ln)));
    if (fresh.length === 0) continue;
    out.push({ type: 'heading_3', text: key });
    for (const ln of fresh) {
      seen.add(norm(ln));
      out.push({ type: 'paragraph', richText: [{ text: ln }] });
    }
  }
  return out;
}

function blockText(b: ArticleBlock): string {
  if (b.type === 'paragraph') return b.richText.map((s) => s.text).join('');
  if (b.type === 'heading_1' || b.type === 'heading_2' || b.type === 'heading_3') return b.text;
  if (b.type === 'bulleted_list_item' || b.type === 'numbered_list_item' || b.type === 'quote') return b.text;
  return '';
}

// ---------------------------------------------------------------------------
// Metadata + small helpers
// ---------------------------------------------------------------------------

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

function clean(s: string): string {
  return s.replace(/​/g, '').trim();
}

function norm(s: string): string {
  return s.replace(/​/g, '').replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
