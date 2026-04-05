import type { ArticleData, ArticleBlock } from '../types/article';

export function extractArticle(): ArticleData {
  const url = window.location.href;
  const { displayName, handle } = extractAuthor();
  const publishedDate = extractDate();
  const body = extractBody();

  // Title: use dedicated extraction, fall back to first body paragraph
  let title = extractTitle();
  if (isGenericTitle(title)) {
    const firstText = body.find(b => b.type === 'paragraph');
    if (firstText?.type === 'paragraph') {
      const text = firstText.richText[0]?.text ?? '';
      const firstLine = text.split('\n')[0].trim();
      title = firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine || 'Untitled';
    }
  }

  return { title, author: { displayName, handle }, publishedDate, url, body };
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

// --- Body: walk entire article, filter noise ---

function extractBody(): ArticleBlock[] {
  const primary = document.querySelector('[data-testid="primaryColumn"]') as HTMLElement;
  if (!primary) return [];

  // Strategy 1: structured walk of the <article> element (works for tweets)
  const article = primary.querySelector('article') as HTMLElement;
  if (article) {
    const blocks: ArticleBlock[] = [];
    const seenImages = new Set<string>();
    walkInOrder(article, blocks, seenImages);
    if (blocks.length > 0) return blocks;
  }

  // Strategy 2: fallback for X Articles or any other page structure
  // Use innerText of the entire primaryColumn — works regardless of DOM
  return fallbackExtract(primary);
}

function fallbackExtract(container: HTMLElement): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];

  // Collect content images
  const seenImages = new Set<string>();
  const imgs = container.querySelectorAll('img');
  for (const img of imgs) {
    const src = (img as HTMLImageElement).src;
    if (isContentImageUrl(src) && !seenImages.has(src)) {
      seenImages.add(src);
      blocks.push({ type: 'image', url: src, altText: (img as HTMLImageElement).alt ?? '' });
    }
  }

  // Get all text via innerText
  const rawText = container.innerText ?? '';

  // Clean noise line by line
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

  // Rejoin and split into paragraphs
  const text = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text) {
    emitText(blocks, text);
  }

  return blocks;
}

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

function walkInOrder(el: HTMLElement, blocks: ArticleBlock[], seenImages: Set<string>): void {
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i] as HTMLElement;
    if (!child.tagName) continue;
    const tag = child.tagName.toLowerCase();

    // Skip known non-content sections
    if (shouldSkipElement(child)) continue;

    // Direct <img>
    if (tag === 'img') {
      emitImage(child as HTMLImageElement, blocks, seenImages);
      continue;
    }

    // Check for content image in this element
    const contentImg = findContentImage(child);
    if (contentImg) {
      emitImage(contentImg, blocks, seenImages);
    }

    // Get text
    const innerText = child.innerText?.trim() ?? '';

    // Check for block children (need recursion)
    const hasBlockChildren = child.querySelector(
      'div, p, article, section, ul, ol, blockquote, h1, h2, h3, figure, picture'
    );

    // No text — still recurse for deeper images
    if (!innerText) {
      if (hasBlockChildren) walkInOrder(child, blocks, seenImages);
      continue;
    }

    // Skip noise text
    if (isNoiseText(innerText)) continue;

    // Leaf: emit text. Branch: recurse.
    if (!hasBlockChildren) {
      emitText(blocks, innerText);
    } else {
      walkInOrder(child, blocks, seenImages);
    }
  }
}

function findContentImage(el: HTMLElement): HTMLImageElement | null {
  const imgs = el.querySelectorAll('img');
  for (const img of imgs) {
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

function emitText(blocks: ArticleBlock[], text: string): void {
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
