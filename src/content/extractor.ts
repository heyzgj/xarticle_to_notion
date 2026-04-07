import type { ArticleData, ArticleBlock, RichTextSegment } from '../types/article';

type TitleSource = 'heading' | 'tweet' | 'document';

export function extractArticle(): ArticleData {
  const url = window.location.href;
  const { displayName, handle } = extractAuthor();
  const publishedDate = extractDate();
  const rawBody = extractBody();

  const { title: extractedTitle, source: titleSource } = extractTitleWithSource();
  let title = extractedTitle;
  let titleFromBodyFallback = false;

  if (isGenericTitle(title)) {
    const firstText = rawBody.find(b => b.type === 'paragraph');
    if (firstText?.type === 'paragraph') {
      const text = firstText.richText.map(s => s.text).join('');
      const firstLine = text.split('\n')[0].trim();
      title = firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine || 'Untitled';
      titleFromBodyFallback = true;
    }
  }

  // The detector only triggers on long-form X Articles, so we can always try
  // to strip the duplicate title from the body — UNLESS we synthesized the
  // title from a body paragraph (in which case stripping would lose content).
  let body = rawBody;
  if (!titleFromBodyFallback) {
    body = stripDuplicateTitle(body, title);
  }

  // --- Diagnostic logging (visible in the X tab DevTools console) ---
  try {
    const blockSummary = (b: ArticleBlock) => {
      if (b.type === 'paragraph') return { type: b.type, text: b.richText.map(s => s.text).join('').slice(0, 120) };
      if ('text' in b) return { type: b.type, text: b.text.slice(0, 120) };
      return { type: b.type };
    };
    console.log('[X2Notion] title source:', titleSource, '| fallback:', titleFromBodyFallback);
    console.log('[X2Notion] title:', JSON.stringify(title));
    console.log('[X2Notion] rawBody (first 5):', rawBody.slice(0, 5).map(blockSummary));
    console.log('[X2Notion] strippedBody (first 5):', body.slice(0, 5).map(blockSummary));
    console.log('[X2Notion] blocks removed:', rawBody.length - body.length);
  } catch {}

  return { title, author: { displayName, handle }, publishedDate, url, body };
}

/**
 * Normalize text for fuzzy comparison: lowercase, collapse whitespace,
 * fold smart quotes/apostrophes/dashes to ASCII, drop zero-width chars,
 * and strip punctuation. This is intentionally lossy — we just want to
 * know if two strings represent the SAME human-readable phrase.
 */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    // Smart quotes / apostrophes → ASCII
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Various dashes → hyphen
    .replace(/[\u2013\u2014\u2015]/g, '-')
    // Ellipsis → three dots
    .replace(/\u2026/g, '...')
    // Zero-width / BOM characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Drop all punctuation for comparison
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Drop body blocks that duplicate the title. Searches the first 10 blocks
 * (X often puts a hero image, byline, date, etc. above the title) and may
 * remove up to 2 blocks (some Articles render the title in BOTH a header
 * area and at the top of the body). Multiple match strategies — any one
 * suffices.
 */
function stripDuplicateTitle(body: ArticleBlock[], title: string): ArticleBlock[] {
  if (!title || body.length === 0) return body;

  const normTitle = normalizeForMatch(title);
  if (normTitle.length < 3) return body;

  const SEARCH_RANGE = 10;
  const MAX_STRIPS = 2;
  const result: ArticleBlock[] = [];
  let stripped = 0;

  for (let i = 0; i < body.length; i++) {
    if (stripped >= MAX_STRIPS || i >= SEARCH_RANGE) {
      result.push(body[i]);
      continue;
    }

    const block = body[i];
    let text = '';
    if (block.type === 'paragraph') {
      text = block.richText.map(s => s.text).join('');
    } else if ('text' in block) {
      text = block.text;
    } else {
      result.push(block);
      continue;
    }

    const normText = normalizeForMatch(text);
    if (!normText) {
      result.push(block);
      continue;
    }

    const exactMatch = normText === normTitle;
    const blockContainsTitle = normText.includes(normTitle) && normText.length <= normTitle.length + 120;
    const titleContainsBlock = normTitle.includes(normText) && normText.length >= Math.min(10, normTitle.length);
    // First-N-chars match: catches cases where title and block start with
    // the same phrase but diverge later (bylines, metadata, etc.).
    const matchLen = Math.min(25, normTitle.length, normText.length);
    const firstNMatch = matchLen >= 25 && normText.slice(0, matchLen) === normTitle.slice(0, matchLen);

    if (exactMatch || blockContainsTitle || titleContainsBlock || firstNMatch) {
      stripped++;
      continue; // Skip this block (don't push it)
    }

    result.push(block);
  }

  return result;
}

const GENERIC_TITLES = [
  'untitled', 'conversation', 'post', 'x', 'twitter',
  'home', 'notifications', 'messages', 'explore',
  'article', 'articles', 'tweet', 'thread', 'profile',
];

function isGenericTitle(title: string): boolean {
  if (!title) return true;
  return GENERIC_TITLES.includes(title.toLowerCase().trim());
}

// --- Author ---

function extractAuthor(): { displayName: string; handle: string } {
  const userNames = document.querySelector('[data-testid="User-Name"]');
  if (userNames) {
    const links = userNames.querySelectorAll('a');
    let displayName = 'Unknown';
    let handle = '@unknown';
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      const text = link.textContent?.trim() ?? '';
      if (href.startsWith('/') && !href.includes('/status/')) {
        if (text.startsWith('@')) handle = text;
        else if (displayName === 'Unknown' && text) displayName = text;
      }
    }
    if (displayName !== 'Unknown' || handle !== '@unknown') {
      return { displayName, handle };
    }
  }

  const urlMatch = window.location.pathname.match(/^\/([^/]+)/);
  if (urlMatch) return { displayName: urlMatch[1], handle: `@${urlMatch[1]}` };
  return { displayName: 'Unknown', handle: '@unknown' };
}

// --- Date ---

function extractDate(): string {
  const timeEl = document.querySelector('[data-testid="primaryColumn"] time[datetime]');
  if (timeEl) return timeEl.getAttribute('datetime') ?? new Date().toISOString();
  return new Date().toISOString();
}

// --- Title ---

function extractTitleWithSource(): { title: string; source: TitleSource } {
  const primary = document.querySelector('[data-testid="primaryColumn"]') as HTMLElement | null;

  // 1. document.title — X uses this for shareable article titles. This is
  //    the most reliable source: it's set by X to the actual article title,
  //    not random h1s scattered through the body.
  let docTitle = document.title;
  const onXMatch = docTitle.match(/^.+?\son X:?\s*["\u201C']?(.+?)["\u201D']?\s*(?:[\/|·]\s*X)?\s*$/i);
  if (onXMatch && onXMatch[1]) {
    docTitle = onXMatch[1];
  } else {
    docTitle = docTitle.replace(/\s*[/|·]\s*X\s*$/i, '');
  }
  docTitle = docTitle.trim();
  if (docTitle && docTitle.length >= 5 && !isGenericTitle(docTitle)) {
    return { title: docTitle, source: 'document' };
  }

  // 2. h1/h2 inside the article element (only if document.title was unhelpful)
  const articleEl = primary?.querySelector('article') as HTMLElement | null;
  if (articleEl) {
    const headings = Array.from(articleEl.querySelectorAll('h1, h2')) as HTMLElement[];
    for (const h of headings) {
      const text = h.textContent?.trim() ?? '';
      if (text.length >= 10 && !isGenericTitle(text)) {
        return { title: text, source: 'heading' };
      }
    }
  }

  // 3. Any h1/h2 in primaryColumn (last-resort, requires substantial text)
  if (primary) {
    const headings = Array.from(primary.querySelectorAll('h1, h2')) as HTMLElement[];
    for (const h of headings) {
      const text = h.textContent?.trim() ?? '';
      if (text.length >= 15 && !isGenericTitle(text)) {
        return { title: text, source: 'heading' };
      }
    }
  }

  // 4. tweetText fallback
  if (primary) {
    const tweetText = primary.querySelector('[data-testid="tweetText"]') as HTMLElement | null;
    if (tweetText) {
      const text = tweetText.innerText?.trim() ?? '';
      const firstLine = text.split('\n')[0].trim();
      if (firstLine && !isGenericTitle(firstLine)) {
        const truncated = firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine;
        return { title: truncated, source: 'tweet' };
      }
    }
  }

  return { title: 'Untitled', source: 'document' };
}

// --- Body extraction (structured, tag-aware) ---

function extractBody(): ArticleBlock[] {
  const primary = document.querySelector('[data-testid="primaryColumn"]') as HTMLElement;
  if (!primary) return [];

  // Strategy 1: structured walk of the <article> element (works for tweets and X Articles)
  const article = primary.querySelector('article') as HTMLElement;
  if (article) {
    const blocks: ArticleBlock[] = [];
    const seenImages = new Set<string>();
    walkStructured(article, blocks, seenImages);
    if (blocks.length > 0) return blocks;
  }

  // Strategy 2: fallback for unusual page structures
  return fallbackExtract(primary);
}

function walkStructured(el: HTMLElement, blocks: ArticleBlock[], seenImages: Set<string>): void {
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i] as HTMLElement;
    if (!child.tagName) continue;
    if (shouldSkipElement(child)) continue;

    const tag = child.tagName.toLowerCase();

    // Direct image
    if (tag === 'img') {
      emitImage(child as HTMLImageElement, blocks, seenImages);
      continue;
    }

    // Image wrappers
    if (tag === 'figure' || tag === 'picture') {
      const img = child.querySelector('img') as HTMLImageElement | null;
      if (img) emitImage(img, blocks, seenImages);
      continue;
    }

    // Headings
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const text = (child.innerText ?? '').trim();
      if (text && !isNoiseText(text)) {
        const headingType = tag === 'h1' ? 'heading_1' : tag === 'h2' ? 'heading_2' : 'heading_3';
        blocks.push({ type: headingType, text });
      }
      continue;
    }
    if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const text = (child.innerText ?? '').trim();
      if (text && !isNoiseText(text)) {
        blocks.push({ type: 'heading_3', text });
      }
      continue;
    }

    // Lists
    if (tag === 'ul') {
      emitListItems(child, blocks, 'bulleted_list_item', seenImages);
      continue;
    }
    if (tag === 'ol') {
      emitListItems(child, blocks, 'numbered_list_item', seenImages);
      continue;
    }

    // Quote
    if (tag === 'blockquote') {
      const text = (child.innerText ?? '').trim();
      if (text && !isNoiseText(text)) {
        blocks.push({ type: 'quote', text });
      }
      continue;
    }

    // Divider
    if (tag === 'hr') {
      blocks.push({ type: 'divider' });
      continue;
    }

    // Paragraph
    if (tag === 'p') {
      emitParagraph(child, blocks);
      continue;
    }

    // Container (div / span / section / article / etc.)
    //
    // If the subtree contains REAL semantic block elements or images, recurse
    // so we handle them by their tag handlers above.
    const hasRealBlockOrImage = !!child.querySelector(
      'h1, h2, h3, h4, h5, h6, ul, ol, blockquote, hr, figure, picture, img, p'
    );
    if (hasRealBlockOrImage) {
      walkStructured(child, blocks, seenImages);
      continue;
    }

    // No semantic blocks anywhere inside — this is X's div-soup case.
    const innerText = (child.innerText ?? '').trim();
    if (!innerText || isNoiseText(innerText)) continue;

    const elementChildren = Array.from(child.children) as HTMLElement[];

    // 1. All inline children (or no element children) → leaf paragraph
    const onlyInlineChildren =
      elementChildren.length === 0 ||
      elementChildren.every(c => isInlineTag(c.tagName.toLowerCase()));
    if (onlyInlineChildren) {
      emitParagraph(child, blocks);
      continue;
    }

    // 2. Use total inner-text length as the recurse-vs-flatten heuristic.
    //    - Short total content (<500 chars) → almost certainly a single
    //      logical paragraph rendered as div soup with inline fragments
    //      (X uses display:block divs for sentence parts in some articles).
    //      Flatten so we don't shred a sentence.
    //    - Long total content (>=500 chars) → this is a real container
    //      wrapping multiple paragraphs. Recurse so each becomes a block.
    if (innerText.length >= 500) {
      walkStructured(child, blocks, seenImages);
    } else {
      emitParagraph(child, blocks);
    }
  }
}

const INLINE_TAGS = new Set([
  'span', 'a', 'b', 'strong', 'i', 'em', 'u', 'small',
  'sub', 'sup', 'mark', 'code', 'br', 'time', 'abbr',
]);

function isInlineTag(tag: string): boolean {
  return INLINE_TAGS.has(tag);
}

function emitListItems(
  list: HTMLElement,
  blocks: ArticleBlock[],
  itemType: 'bulleted_list_item' | 'numbered_list_item',
  seenImages: Set<string>
): void {
  const items = list.querySelectorAll(':scope > li');
  for (const li of Array.from(items)) {
    const liEl = li as HTMLElement;
    const text = (liEl.innerText ?? '').trim();
    if (text && !isNoiseText(text)) {
      blocks.push({ type: itemType, text });
    }
    // Check for nested images inside list items
    const img = findContentImage(liEl);
    if (img) emitImage(img, blocks, seenImages);
  }
}

function emitParagraph(el: HTMLElement, blocks: ArticleBlock[]): void {
  const richText = extractRichText(el);
  const plainText = richText.map(s => s.text).join('').trim();
  if (!plainText || isNoiseText(plainText)) return;

  // Common case: short, single paragraph — emit with rich text intact
  if (plainText.length <= 2000 && !plainText.includes('\n\n')) {
    blocks.push({ type: 'paragraph', richText });
    return;
  }

  // Multi-paragraph (separated by blank lines): split and emit each
  const text = plainText.replace(/\n{3,}/g, '\n\n');
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  for (const para of paragraphs) {
    if (para.length <= 2000) {
      blocks.push({ type: 'paragraph', richText: [{ text: para }] });
      continue;
    }
    // Long paragraph: split at sentence/word boundaries (never mid-word)
    for (const chunk of chunkText(para, 2000)) {
      blocks.push({ type: 'paragraph', richText: [{ text: chunk }] });
    }
  }
}

/** Split a long string into chunks of at most `maxLen` chars without
 *  cutting mid-word. Prefers sentence breaks, falls back to whitespace. */
function chunkText(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cutAt = -1;
    // Prefer the last sentence boundary (., !, ?) before maxLen
    const slice = remaining.slice(0, maxLen);
    const sentenceEnd = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('.\n'),
    );
    if (sentenceEnd >= maxLen / 2) {
      cutAt = sentenceEnd + 1;
    } else {
      // Fall back to last whitespace
      const ws = slice.lastIndexOf(' ');
      cutAt = ws >= maxLen / 2 ? ws : maxLen;
    }
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

// --- Rich text extraction (preserves links, bold, italic, underline) ---

function extractRichText(el: HTMLElement): RichTextSegment[] {
  const segments: RichTextSegment[] = [];

  function walk(node: Node, fmt: { bold?: boolean; italic?: boolean; underline?: boolean; href?: string }): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text) {
        segments.push({ text, ...fmt });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const e = node as HTMLElement;
    const tag = e.tagName.toLowerCase();

    // Skip non-content elements
    if (tag === 'script' || tag === 'style' || tag === 'svg') return;

    // <br> = newline
    if (tag === 'br') {
      segments.push({ text: '\n', ...fmt });
      return;
    }

    let newFmt = fmt;
    if (tag === 'strong' || tag === 'b') newFmt = { ...fmt, bold: true };
    else if (tag === 'em' || tag === 'i') newFmt = { ...fmt, italic: true };
    else if (tag === 'u') newFmt = { ...fmt, underline: true };
    else if (tag === 'a') {
      const href = e.getAttribute('href');
      if (href) {
        // Resolve relative URLs (X uses /username for internal links)
        let absHref = href;
        if (href.startsWith('/')) absHref = `https://x.com${href}`;
        else if (href.startsWith('//')) absHref = `https:${href}`;
        if (absHref.startsWith('http://') || absHref.startsWith('https://')) {
          newFmt = { ...fmt, href: absHref };
        }
      }
    }

    // Check if this is a block-level element (display:block / flex / etc).
    // For block-level elements, we need to insert a separator AFTER walking
    // so adjacent block siblings don't run together ("foo"+"bar" → "foo bar").
    let isBlockLevel = false;
    if (tag !== 'a' && tag !== 'span' && !INLINE_TAGS.has(tag)) {
      try {
        const display = window.getComputedStyle(e).display;
        isBlockLevel = display === 'block' || display === 'flex' ||
          display === 'grid' || display === 'list-item' || display === 'table';
      } catch {}
    }

    const segmentsBefore = segments.length;
    for (const child of Array.from(e.childNodes)) {
      walk(child, newFmt);
    }

    // After a block element with content, append a space if the last
    // segment doesn't already end with whitespace
    if (isBlockLevel && segments.length > segmentsBefore) {
      const last = segments[segments.length - 1];
      if (last && last.text && !/\s$/.test(last.text)) {
        segments.push({ text: ' ', ...fmt });
      }
    }
  }

  for (const child of Array.from(el.childNodes)) {
    walk(child, {});
  }

  return mergeAdjacentSegments(segments);
}

function mergeAdjacentSegments(segments: RichTextSegment[]): RichTextSegment[] {
  const merged: RichTextSegment[] = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    const last = merged[merged.length - 1];
    if (
      last &&
      last.bold === seg.bold &&
      last.italic === seg.italic &&
      last.underline === seg.underline &&
      last.href === seg.href
    ) {
      last.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

// --- Fallback (when no <article>) ---

function fallbackExtract(container: HTMLElement): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const seenImages = new Set<string>();
  walkStructured(container, blocks, seenImages);
  if (blocks.length > 0) return blocks;

  // Last resort: pure text via innerText
  const imgs = container.querySelectorAll('img');
  for (const img of Array.from(imgs)) {
    const src = (img as HTMLImageElement).src;
    if (isContentImageUrl(src) && !seenImages.has(src)) {
      seenImages.add(src);
      blocks.push({ type: 'image', url: src, altText: (img as HTMLImageElement).alt ?? '' });
    }
  }

  const rawText = container.innerText ?? '';
  const lines = rawText.split('\n');
  const cleanedLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      cleanedLines.push('');
      continue;
    }
    if (isNoiseText(trimmed)) continue;
    cleanedLines.push(trimmed);
  }

  const text = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text) {
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    for (const para of paragraphs) {
      if (para.length <= 2000) {
        blocks.push({ type: 'paragraph', richText: [{ text: para }] });
      } else {
        for (let i = 0; i < para.length; i += 2000) {
          blocks.push({ type: 'paragraph', richText: [{ text: para.slice(i, i + 2000) }] });
        }
      }
    }
  }

  return blocks;
}

// --- Element filtering ---

function shouldSkipElement(child: HTMLElement): boolean {
  const isSmall = (child.innerText?.trim().length ?? 0) < 80;

  // Only skip user info if it's a small element (not a large content wrapper)
  if (isSmall && child.querySelector('[data-testid="User-Name"]')) return true;
  if (isSmall && child.querySelector('[data-testid="UserAvatar-Container"]')) return true;

  // Skip engagement buttons (but not if it contains content images or is a large wrapper)
  if (isSmall && child.querySelector('[role="group"]') && !findContentImage(child)) return true;

  // Skip elements that are ONLY a timestamp (small element with time inside)
  if (isSmall && child.querySelector('time[datetime]')) return true;

  return false;
}

function findContentImage(el: HTMLElement): HTMLImageElement | null {
  const imgs = el.querySelectorAll('img');
  for (const img of Array.from(imgs)) {
    if (isContentImageUrl((img as HTMLImageElement).src)) {
      return img as HTMLImageElement;
    }
  }
  return null;
}

function emitImage(img: HTMLImageElement, blocks: ArticleBlock[], seenImages: Set<string>): void {
  const src = img.src;
  if (src && isContentImageUrl(src) && !seenImages.has(src)) {
    seenImages.add(src);
    blocks.push({ type: 'image', url: src, altText: img.alt ?? '' });
  }
}

// --- Filters ---

function isContentImageUrl(src: string): boolean {
  if (!src) return false;
  if (src.includes('abs.twimg.com')) return false;
  if (src.includes('emoji')) return false;
  if (src.includes('profile_images')) return false;
  if (src.includes('hashflags')) return false;
  if (src.includes('.svg')) return false;
  if (src.includes('ton.twimg.com')) return false;
  return src.includes('pbs.twimg.com/media') || src.includes('pbs.twimg.com/card_img');
}

const NOISE_PATTERNS = [
  /^(Repost|Quote|Like|Share|Bookmark|Copy link|More|Follow)$/,
  /^Verified account$/,
  /^Post your reply/,
  /^Show (replies|more replies|this thread)$/,
  /^Replying to\s+@\w+$/,
  /^\d+[KMB]?\s*(Reposts?|Quotes?|Likes?|Views?|Bookmarks?|replies?)$/,
  /^Translate (post|bio)$/,
  /^Joined .+$/,
  /^\d+\s+Following$/,
  /^\d+[KMB]?\s+Followers?$/,
  /^Who can reply\?$/,
  /^Trending/,
  /^Subscribe$/,
  /^Sign up$/,
  /^Log in$/,
  /^Not now$/,
  /^·$/,
  /^Conversation$/,
  /^\d{1,2}:\d{2}\s*(AM|PM)/i,
  /^\d{1,2}:\d{2}\s*·/,
  /^\w{3}\s+\d{1,2},\s*\d{4}$/,
  /^\d{1,2}\s+\w{3}\s+\d{4}$/,
  /^\d+[KMB]?\s*Views?$/i,
  // Bare engagement-count numbers ("78", "1.7K", "1,234")
  /^[\d,]+(\.\d+)?[KMB]?$/i,
  // Multiple bare numbers separated by spaces ("78 402 1.7K 736K")
  /^[\d,]+(\.\d+)?[KMB]?(\s+[\d,]+(\.\d+)?[KMB]?){1,5}$/i,
];

function isNoiseText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return NOISE_PATTERNS.some(p => p.test(trimmed));
}
