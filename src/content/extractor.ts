import type { ArticleData, ArticleBlock, RichTextSegment } from '../types/article';

export function extractArticle(): ArticleData {
  const url = window.location.href;
  const { displayName, handle } = extractAuthor();
  const publishedDate = extractDate();
  const rawBody = extractBody();

  // Title: use dedicated extraction, fall back to first body paragraph
  let title = extractTitle();
  if (isGenericTitle(title)) {
    const firstText = rawBody.find(b => b.type === 'paragraph');
    if (firstText?.type === 'paragraph') {
      const text = firstText.richText.map(s => s.text).join('');
      const firstLine = text.split('\n')[0].trim();
      title = firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine || 'Untitled';
    }
  }

  // Strip leading body blocks that just duplicate the title (X renders the
  // title at the top of the article body — we already store it as page title)
  const body = stripLeadingTitle(rawBody, title);

  return { title, author: { displayName, handle }, publishedDate, url, body };
}

function stripLeadingTitle(body: ArticleBlock[], title: string): ArticleBlock[] {
  if (!title || body.length === 0) return body;

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const normTitle = normalize(title);
  if (!normTitle) return body;

  // Try matching the title against an increasing number of leading blocks.
  // Stop as soon as the combined leading text covers the title (or diverges).
  for (let numBlocks = 1; numBlocks <= Math.min(5, body.length); numBlocks++) {
    let combined = '';
    let textOnly = true;

    for (let i = 0; i < numBlocks; i++) {
      const block = body[i];
      if (block.type === 'paragraph') {
        combined += ' ' + block.richText.map(s => s.text).join('');
      } else if ('text' in block) {
        combined += ' ' + block.text;
      } else {
        textOnly = false;
        break;
      }
    }

    if (!textOnly) break;

    const normCombined = normalize(combined);

    // Exact match — strip these blocks
    if (normCombined === normTitle) {
      return body.slice(numBlocks);
    }
    // Title + small trailing content (e.g., byline "(@handle)") — strip
    if (normCombined.startsWith(normTitle) && normCombined.length <= normTitle.length + 60) {
      return body.slice(numBlocks);
    }
    // We've overshot the title length without matching — stop trying
    if (normCombined.length > normTitle.length + 60) break;
  }

  return body;
}

const GENERIC_TITLES = [
  'untitled', 'conversation', 'post', 'x', 'twitter',
  'home', 'notifications', 'messages', 'explore',
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

function extractTitle(): string {
  const primary = document.querySelector('[data-testid="primaryColumn"]');

  if (primary) {
    const heading = primary.querySelector('h1') ?? primary.querySelector('h2');
    if (heading?.textContent?.trim()) return heading.textContent.trim();
  }

  if (primary) {
    const tweetText = primary.querySelector('[data-testid="tweetText"]') as HTMLElement | null;
    if (tweetText) {
      const text = tweetText.innerText?.trim() ?? '';
      const firstLine = text.split('\n')[0].trim();
      if (firstLine && !isGenericTitle(firstLine)) {
        return firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine;
      }
    }
  }

  const docTitle = document.title
    .replace(/\s*[/|·]\s*X\s*$/i, '')
    .replace(/\s*on X:?\s*"?.*"?\s*$/i, '')
    .trim();
  return docTitle || 'Untitled';
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

    // Container — recurse, but also check for direct content
    const innerText = (child.innerText ?? '').trim();
    const hasBlockChildren = !!child.querySelector(
      'div, p, article, section, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, figure, picture, hr, img'
    );

    if (hasBlockChildren) {
      // X often uses nested <div>s for inline layout (flex rows). If all the
      // visible children of this container sit on the same horizontal line,
      // treat the whole container as ONE inline flow (single paragraph) so we
      // don't shred a sentence into one block per word/link.
      if (shouldFlattenAsInline(child)) {
        emitParagraph(child, blocks);
      } else {
        walkStructured(child, blocks, seenImages);
      }
      continue;
    }

    // Leaf div with text — treat as paragraph
    if (innerText && !isNoiseText(innerText)) {
      emitParagraph(child, blocks);
    }
  }
}

function shouldFlattenAsInline(parent: HTMLElement): boolean {
  const children = Array.from(parent.children) as HTMLElement[];
  if (children.length < 2) return false;

  // Skip if any child is a real block element (heading, list, image, etc.)
  for (const child of children) {
    const tag = child.tagName.toLowerCase();
    if (
      tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' ||
      tag === 'ul' || tag === 'ol' || tag === 'blockquote' || tag === 'hr' ||
      tag === 'figure' || tag === 'picture' || tag === 'img' || tag === 'p'
    ) {
      return false;
    }
  }

  // Collect rendered top positions of visible children
  const tops: number[] = [];
  for (const child of children) {
    const rect = child.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      tops.push(rect.top);
    }
  }
  if (tops.length < 2) return false;

  // All visible children on roughly the same horizontal line?
  const minTop = Math.min(...tops);
  const maxTop = Math.max(...tops);
  return (maxTop - minTop) < 8;
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

  // Split paragraph by double-newline (in case innerText has multiple paragraphs)
  // Most of the time it's one paragraph
  if (plainText.length <= 2000 && !plainText.includes('\n\n')) {
    blocks.push({ type: 'paragraph', richText });
    return;
  }

  // Long paragraph or contains multiple — split safely
  const text = plainText.replace(/\n{3,}/g, '\n\n');
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  for (const para of paragraphs) {
    for (let i = 0; i < para.length; i += 2000) {
      blocks.push({
        type: 'paragraph',
        richText: [{ text: para.slice(i, i + 2000) }],
      });
    }
  }
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

    for (const child of Array.from(e.childNodes)) {
      walk(child, newFmt);
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
];

function isNoiseText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return NOISE_PATTERNS.some(p => p.test(trimmed));
}
