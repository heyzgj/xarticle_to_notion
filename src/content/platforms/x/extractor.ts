import type { ArticleData, ArticleBlock, RichTextSegment, QuotedTweet } from '../../../types/article';

// --- Thread extraction ---

export function extractThread(tweetCount: number): ArticleData {
  const url = window.location.href;
  const { displayName, handle } = extractAuthor();
  const publishedDate = extractDate();

  const threadTweets = getThreadTweets();
  const total = threadTweets.length || tweetCount;
  const body: ArticleBlock[] = [];

  for (let i = 0; i < threadTweets.length; i++) {
    if (i > 0) body.push({ type: 'divider' });

    // **n/total** — agent-parseable sequence marker
    body.push({ type: 'paragraph', richText: [{ text: `${i + 1}/${total}`, bold: true }] });
    body.push(...extractTweetBlocks(threadTweets[i]));
  }

  const hook = threadTweets.length > 0 ? firstLineOf(threadTweets[0]) : '';
  const title = composeTitle(handle, hook, 'Thread');

  return { source: 'x', contentType: 'thread', title, author: { displayName, handle }, publishedDate, url, body, tweetCount: total };
}

/**
 * Return the main tweet and its consecutive self-replies at the top of the
 * timeline (mirrors detector's countConsecutiveSelfReplies logic).
 */
function getThreadTweets(): HTMLElement[] {
  const primary = document.querySelector('[data-testid="primaryColumn"]');
  if (!primary) return [];

  const mainTweet = primary.querySelector('[data-testid="tweet"]') as HTMLElement | null;
  if (!mainTweet) return [];

  const mainHandle = getTweetAuthorHandle(mainTweet);
  if (!mainHandle) return [mainTweet];

  const mainCell = mainTweet.closest('[data-testid="cellInnerDiv"]');
  if (!mainCell) return [mainTweet];

  const tweets: HTMLElement[] = [mainTweet];
  let cursor: Element | null = mainCell.nextElementSibling;

  while (cursor) {
    const tweetInCell = cursor.querySelector('[data-testid="tweet"]') as HTMLElement | null;
    if (!tweetInCell) {
      if (cursor.querySelector('h2, section')) break;
      cursor = cursor.nextElementSibling;
      continue;
    }
    if (tweetInCell.closest('[data-testid="tweet"] [data-testid="tweet"]')) {
      cursor = cursor.nextElementSibling;
      continue;
    }
    const handle = getTweetAuthorHandle(tweetInCell);
    if (!handle || handle !== mainHandle) break;
    tweets.push(tweetInCell);
    cursor = cursor.nextElementSibling;
  }

  return tweets;
}

// --- Single tweet ---

export function extractTweet(): ArticleData {
  const url = window.location.href;
  const { displayName, handle } = extractAuthor();
  const publishedDate = extractDate();

  const primary = document.querySelector('[data-testid="primaryColumn"]');
  const tweet = primary?.querySelector('[data-testid="tweet"]') as HTMLElement | null;

  const body = tweet ? extractTweetBlocks(tweet) : [];
  const hook = tweet ? firstLineOf(tweet) : '';
  const title = composeTitle(handle, hook, 'Tweet');

  return { source: 'x', contentType: 'tweet', title, author: { displayName, handle }, publishedDate, url, body };
}

// --- Quote tweet ---

export function extractQuoteTweet(): ArticleData {
  const url = window.location.href;
  const { displayName, handle } = extractAuthor();
  const publishedDate = extractDate();

  const primary = document.querySelector('[data-testid="primaryColumn"]');
  const outerTweet = primary?.querySelector('[data-testid="tweet"]') as HTMLElement | null;

  let body: ArticleBlock[] = [];
  let quotedTweet: QuotedTweet | undefined;

  if (outerTweet) {
    // The nested tweet is a [data-testid="tweet"] inside the outer one (but not the outer itself)
    const nestedTweet = findNestedTweet(outerTweet);

    // Extract outer tweet content, skipping the nested tweet's DOM subtree
    body = extractTweetBlocksExcluding(outerTweet, nestedTweet);

    if (nestedTweet) {
      const quotedAuthor = extractAuthorFromArticle(nestedTweet);
      const quotedUrl = extractTweetUrlFromArticle(nestedTweet);
      const quotedBody = extractTweetBlocks(nestedTweet);
      quotedTweet = { author: quotedAuthor, url: quotedUrl, body: quotedBody };
    }
  }

  const hook = outerTweet ? firstLineOfOuter(outerTweet) : '';
  const quotedHandle = quotedTweet?.author.handle ?? '';
  const prefix = quotedHandle && quotedHandle !== '@unknown'
    ? `${handle} → ${quotedHandle}`
    : handle;
  const title = composeTitle(prefix, hook, 'Quote Tweet');

  return { source: 'x', contentType: 'quote_tweet', title, author: { displayName, handle }, publishedDate, url, body, quotedTweet };
}

function findNestedTweet(tweet: HTMLElement): HTMLElement | null {
  // Must match detector.ts — multi-strategy: [aria-labelledby], [role="link"],
  // or [data-testid="tweet"]. A candidate must contain both User-Name and tweetText.
  const selectors = ['[aria-labelledby]', '[role="link"]', '[data-testid="tweet"]'];
  for (const selector of selectors) {
    const candidates = tweet.querySelectorAll(selector);
    for (const c of Array.from(candidates)) {
      const el = c as HTMLElement;
      if (el === tweet) continue;
      if (!el.querySelector('[data-testid="User-Name"]')) continue;
      if (!el.querySelector('[data-testid="tweetText"]')) continue;
      return el;
    }
  }
  return null;
}

function getTweetAuthorHandle(tweet: HTMLElement): string | null {
  const userNameEl = tweet.querySelector('[data-testid="User-Name"]');
  if (!userNameEl) return null;
  const links = userNameEl.querySelectorAll('a');
  for (const link of Array.from(links)) {
    const href = link.getAttribute('href') ?? '';
    const text = link.textContent?.trim() ?? '';
    if (href.startsWith('/') && !href.includes('/status/') && text.startsWith('@')) {
      return text.toLowerCase();
    }
  }
  return null;
}

const MAX_TITLE_LENGTH = 120;

/**
 * Build a structured title: "{prefix}: {first-line hook}" truncated to 120 chars.
 * Prefix always includes @handle so title stays distinct from body content.
 */
function composeTitle(prefix: string, hookText: string, fallback: string): string {
  const prefixed = `${prefix}: `;
  const available = MAX_TITLE_LENGTH - prefixed.length;
  const cleanHook = hookText.trim();
  if (!cleanHook) return `${prefix}: ${fallback}`;
  if (cleanHook.length <= available) return `${prefixed}${cleanHook}`;
  return `${prefixed}${cleanHook.slice(0, available - 1).trim()}…`;
}

function firstLineOf(tweet: HTMLElement): string {
  const tweetText = tweet.querySelector('[data-testid="tweetText"]') as HTMLElement | null;
  if (!tweetText) return '';
  const text = (tweetText.innerText ?? '').trim();
  return text.split('\n')[0].trim();
}

function firstLineOfOuter(outerTweet: HTMLElement): string {
  // Find outer tweet's own tweetText (not the nested/quoted tweet's)
  const allTweetText = Array.from(outerTweet.querySelectorAll('[data-testid="tweetText"]')) as HTMLElement[];
  const nested = findNestedTweet(outerTweet);
  const outerText = allTweetText.find(el => !nested || !nested.contains(el));
  if (!outerText) return '';
  const text = (outerText.innerText ?? '').trim();
  return text.split('\n')[0].trim();
}

// --- Article extraction ---

export function extractArticle(): ArticleData {
  const url = window.location.href;
  const { displayName, handle } = extractAuthor();
  const publishedDate = extractDate();
  const rawBody = extractBody();

  let title = extractTitle();
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

  let body = rawBody;
  if (!titleFromBodyFallback) {
    body = stripDuplicateTitle(body, title);
  }

  return { source: 'x', contentType: 'article', title, author: { displayName, handle }, publishedDate, url, body };
}

// --- Tweet block extraction helpers ---

// Extracts content blocks from a single tweet element.
function extractTweetBlocks(article: HTMLElement): ArticleBlock[] {
  return extractTweetBlocksExcluding(article, null);
}

// Extracts content blocks from a tweet, skipping a nested tweet's DOM subtree.
function extractTweetBlocksExcluding(article: HTMLElement, exclude: HTMLElement | null): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const seenImages = new Set<string>();
  const seenVideos = new Set<string>();
  const inExclude = (el: Element | null): boolean => !!exclude && !!el && exclude.contains(el);

  // Text (use the first tweetText that's not inside the excluded nested tweet)
  const tweetTexts = Array.from(article.querySelectorAll('[data-testid="tweetText"]')) as HTMLElement[];
  const ownText = tweetTexts.find(el => !inExclude(el));
  if (ownText) {
    const richText = extractRichText(ownText);
    const plainText = richText.map(s => s.text).join('').trim();
    if (plainText) blocks.push({ type: 'paragraph', richText });
  }

  // Images
  for (const img of Array.from(article.querySelectorAll('img')) as HTMLImageElement[]) {
    if (inExclude(img)) continue;
    if (isContentImageUrl(img.src) && !seenImages.has(img.src)) {
      seenImages.add(img.src);
      blocks.push({ type: 'image', url: img.src, altText: img.alt ?? '' });
    }
  }

  // Videos
  for (const video of Array.from(article.querySelectorAll('video')) as HTMLVideoElement[]) {
    if (inExclude(video)) continue;
    emitVideo(video, blocks, seenImages, seenVideos);
  }

  // Link preview card (e.g. when a tweet quotes a link, or has a URL preview)
  const cards = Array.from(article.querySelectorAll('[data-testid="card.wrapper"]')) as HTMLElement[];
  for (const card of cards) {
    if (inExclude(card)) continue;
    const link = card.querySelector('a[href]') as HTMLAnchorElement | null;
    if (!link) continue;
    const href = link.href;
    if (!href || !/^https?:\/\//i.test(href)) continue;
    const label = link.getAttribute('aria-label') ?? '';
    const title = label.split(/\n/)[0]?.trim() || href;
    blocks.push({ type: 'paragraph', richText: [{ text: title, href }] });
  }

  return blocks;
}

function extractAuthorFromArticle(article: HTMLElement): { displayName: string; handle: string } {
  const userNameEl = article.querySelector('[data-testid="User-Name"]');
  if (!userNameEl) return { displayName: 'Unknown', handle: '@unknown' };

  // Strategy 1: Main tweet pattern — links with /username hrefs carry both parts
  let displayName = 'Unknown';
  let handle = '@unknown';
  const links = userNameEl.querySelectorAll('a');
  for (const link of Array.from(links)) {
    const href = link.getAttribute('href') ?? '';
    const text = link.textContent?.trim() ?? '';
    if (href.startsWith('/') && !href.includes('/status/')) {
      if (text.startsWith('@')) handle = text;
      else if (displayName === 'Unknown' && text) displayName = text;
    }
  }
  if (displayName !== 'Unknown' && handle !== '@unknown') {
    return { displayName, handle };
  }

  // Strategy 2: Quoted tweet pattern — two child divs, first is name, second is "@handle · date"
  const children = Array.from(userNameEl.children) as HTMLElement[];
  if (children.length >= 2) {
    const nameText = (children[0].textContent ?? '').trim();
    const secondText = (children[1].textContent ?? '').trim();
    const handleMatch = secondText.match(/@(\w+)/);
    if (nameText && displayName === 'Unknown') displayName = nameText;
    if (handleMatch && handle === '@unknown') handle = `@${handleMatch[1]}`;
  }

  // Strategy 3: Last resort — look anywhere inside User-Name for @handle text
  if (handle === '@unknown') {
    const fullText = (userNameEl.textContent ?? '').trim();
    const m = fullText.match(/@(\w+)/);
    if (m) handle = `@${m[1]}`;
  }

  return { displayName, handle };
}

function extractTweetUrlFromArticle(article: HTMLElement): string | undefined {
  // Find a link matching /username/status/id pattern
  const links = article.querySelectorAll('a');
  for (const link of Array.from(links)) {
    const href = link.getAttribute('href') ?? '';
    if (/^\/[^/]+\/status\/\d+/.test(href)) {
      return `https://x.com${href}`;
    }
  }
  return undefined;
}

// --- Article body extraction (structured, tag-aware) ---

function extractBody(): ArticleBlock[] {
  const primary = document.querySelector('[data-testid="primaryColumn"]') as HTMLElement;
  if (!primary) return [];

  const article = primary.querySelector('article') as HTMLElement;
  if (article) {
    const blocks: ArticleBlock[] = [];
    const seenImages = new Set<string>();
    const seenVideos = new Set<string>();
    walkStructured(article, blocks, seenImages, seenVideos);
    if (blocks.length > 0) return blocks;
  }

  return fallbackExtract(primary);
}

function walkStructured(el: HTMLElement, blocks: ArticleBlock[], seenImages: Set<string>, seenVideos: Set<string>): void {
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i] as HTMLElement;
    if (!child.tagName) continue;
    if (shouldSkipElement(child)) continue;

    const tag = child.tagName.toLowerCase();

    if (tag === 'img') { emitImage(child as HTMLImageElement, blocks, seenImages); continue; }
    if (tag === 'video') { emitVideo(child as HTMLVideoElement, blocks, seenImages, seenVideos); continue; }

    if (tag === 'figure' || tag === 'picture') {
      const video = child.querySelector('video') as HTMLVideoElement | null;
      if (video) { emitVideo(video, blocks, seenImages, seenVideos); continue; }
      const img = child.querySelector('img') as HTMLImageElement | null;
      if (img) emitImage(img, blocks, seenImages);
      continue;
    }

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
      if (text && !isNoiseText(text)) blocks.push({ type: 'heading_3', text });
      continue;
    }

    if (tag === 'ul') { emitListItems(child, blocks, 'bulleted_list_item', seenImages); continue; }
    if (tag === 'ol') { emitListItems(child, blocks, 'numbered_list_item', seenImages); continue; }

    if (tag === 'blockquote') {
      const text = (child.innerText ?? '').trim();
      if (text && !isNoiseText(text)) blocks.push({ type: 'quote', text });
      continue;
    }

    if (tag === 'hr') { blocks.push({ type: 'divider' }); continue; }

    if (tag === 'p') { emitParagraph(child, blocks); continue; }

    const hasRealBlockOrImage = !!child.querySelector(
      'h1, h2, h3, h4, h5, h6, ul, ol, blockquote, hr, figure, picture, img, video, p'
    );
    if (hasRealBlockOrImage) { walkStructured(child, blocks, seenImages, seenVideos); continue; }

    const innerText = (child.innerText ?? '').trim();
    if (!innerText || isNoiseText(innerText)) continue;

    const elementChildren = Array.from(child.children) as HTMLElement[];
    const onlyInlineChildren =
      elementChildren.length === 0 ||
      elementChildren.every(c => isInlineTag(c.tagName.toLowerCase()));
    if (onlyInlineChildren) { emitParagraph(child, blocks); continue; }

    if (innerText.length >= 500) {
      walkStructured(child, blocks, seenImages, seenVideos);
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
  for (const li of Array.from(list.querySelectorAll(':scope > li')) as HTMLElement[]) {
    const text = (li.innerText ?? '').trim();
    if (text && !isNoiseText(text)) blocks.push({ type: itemType, text });
    const img = findContentImage(li);
    if (img) emitImage(img, blocks, seenImages);
  }
}

function emitParagraph(el: HTMLElement, blocks: ArticleBlock[]): void {
  const richText = extractRichText(el);
  const plainText = richText.map(s => s.text).join('').trim();
  if (!plainText || isNoiseText(plainText)) return;

  if (plainText.length <= 2000 && !plainText.includes('\n\n')) {
    blocks.push({ type: 'paragraph', richText });
    return;
  }

  const text = plainText.replace(/\n{3,}/g, '\n\n');
  for (const para of text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)) {
    if (para.length <= 2000) {
      blocks.push({ type: 'paragraph', richText: [{ text: para }] });
    } else {
      for (const chunk of chunkText(para, 2000)) {
        blocks.push({ type: 'paragraph', richText: [{ text: chunk }] });
      }
    }
  }
}

function chunkText(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    const slice = remaining.slice(0, maxLen);
    const sentenceEnd = Math.max(
      slice.lastIndexOf('. '), slice.lastIndexOf('! '),
      slice.lastIndexOf('? '), slice.lastIndexOf('.\n'),
    );
    let cutAt: number;
    if (sentenceEnd >= maxLen / 2) {
      cutAt = sentenceEnd + 1;
    } else {
      const ws = slice.lastIndexOf(' ');
      cutAt = ws >= maxLen / 2 ? ws : maxLen;
    }
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

// --- Rich text extraction ---

function extractRichText(el: HTMLElement): RichTextSegment[] {
  const segments: RichTextSegment[] = [];

  function walk(node: Node, fmt: { bold?: boolean; italic?: boolean; underline?: boolean; href?: string }): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text) segments.push({ text, ...fmt });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const e = node as HTMLElement;
    const tag = e.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'svg') return;
    if (tag === 'br') { segments.push({ text: '\n', ...fmt }); return; }

    let newFmt = fmt;
    if (tag === 'strong' || tag === 'b') newFmt = { ...fmt, bold: true };
    else if (tag === 'em' || tag === 'i') newFmt = { ...fmt, italic: true };
    else if (tag === 'u') newFmt = { ...fmt, underline: true };
    else if (tag === 'a') {
      const href = e.getAttribute('href');
      if (href) {
        let absHref = href;
        if (href.startsWith('/')) absHref = `https://x.com${href}`;
        else if (href.startsWith('//')) absHref = `https:${href}`;
        if (absHref.startsWith('http://') || absHref.startsWith('https://')) {
          newFmt = { ...fmt, href: absHref };
        }
      }
    }

    let isBlockLevel = false;
    if (tag !== 'a' && tag !== 'span' && !INLINE_TAGS.has(tag)) {
      try {
        const display = window.getComputedStyle(e).display;
        isBlockLevel = display === 'block' || display === 'flex' ||
          display === 'grid' || display === 'list-item' || display === 'table';
      } catch {}
    }

    const segmentsBefore = segments.length;
    for (const child of Array.from(e.childNodes)) walk(child, newFmt);

    if (isBlockLevel && segments.length > segmentsBefore) {
      const last = segments[segments.length - 1];
      if (last && last.text && !/\s$/.test(last.text)) {
        segments.push({ text: ' ', ...fmt });
      }
    }
  }

  for (const child of Array.from(el.childNodes)) walk(child, {});
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

// --- Fallback extraction ---

function fallbackExtract(container: HTMLElement): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const seenImages = new Set<string>();
  const seenVideos = new Set<string>();
  walkStructured(container, blocks, seenImages, seenVideos);
  if (blocks.length > 0) return blocks;

  // Last resort: pure innerText
  const rawText = container.innerText ?? '';
  const cleanedLines: string[] = [];
  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) { cleanedLines.push(''); continue; }
    if (isNoiseText(trimmed)) continue;
    cleanedLines.push(trimmed);
  }

  const text = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text) {
    for (const para of text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)) {
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
  if (isSmall && child.querySelector('[data-testid="User-Name"]')) return true;
  if (isSmall && child.querySelector('[data-testid="UserAvatar-Container"]')) return true;
  if (isSmall && child.querySelector('[role="group"]') && !findContentImage(child)) return true;
  if (isSmall && child.querySelector('time[datetime]')) return true;
  return false;
}

function findContentImage(el: HTMLElement): HTMLImageElement | null {
  for (const img of Array.from(el.querySelectorAll('img')) as HTMLImageElement[]) {
    if (isContentImageUrl(img.src)) return img;
  }
  return null;
}

function emitImage(img: HTMLImageElement, blocks: ArticleBlock[], seenImages: Set<string>): void {
  if (img.src && isContentImageUrl(img.src) && !seenImages.has(img.src)) {
    seenImages.add(img.src);
    blocks.push({ type: 'image', url: img.src, altText: img.alt ?? '' });
  }
}

function emitVideo(
  video: HTMLVideoElement,
  blocks: ArticleBlock[],
  seenImages: Set<string>,
  seenVideos: Set<string>
): void {
  const poster = video.getAttribute('poster') ?? '';
  const key = poster || video.src || '__video__';
  if (seenVideos.has(key)) return;
  seenVideos.add(key);

  let sourceUrl: string | undefined;
  if (video.src && !video.src.startsWith('blob:')) {
    sourceUrl = video.src;
  } else {
    const sourceEl = video.querySelector('source') as HTMLSourceElement | null;
    if (sourceEl?.src && !sourceEl.src.startsWith('blob:')) sourceUrl = sourceEl.src;
  }

  const posterUrl = isContentImageUrl(poster) ? poster : undefined;
  if (posterUrl && !seenImages.has(posterUrl)) {
    seenImages.add(posterUrl);
    blocks.push({ type: 'image', url: posterUrl, altText: 'Video thumbnail' });
  }

  blocks.push({ type: 'video', posterUrl, sourceUrl, tweetUrl: window.location.href });
}

function isContentImageUrl(src: string): boolean {
  if (!src) return false;
  if (src.includes('abs.twimg.com')) return false;
  if (src.includes('emoji')) return false;
  if (src.includes('profile_images')) return false;
  if (src.includes('profile_banners')) return false;
  if (src.includes('hashflags')) return false;
  if (src.includes('.svg')) return false;
  if (src.includes('ton.twimg.com')) return false;
  if (!src.includes('pbs.twimg.com')) return false;
  return (
    src.includes('/media/') ||
    src.includes('/card_img/') ||
    src.includes('/ext_tw_video_thumb/') ||
    src.includes('/amplify_video_thumb/') ||
    src.includes('/tweet_video_thumb/')
  );
}

// --- Title extraction ---

function extractTitle(): string {
  const primary = document.querySelector('[data-testid="primaryColumn"]') as HTMLElement | null;

  let docTitle = document.title;
  const onXMatch = docTitle.match(/^.+?\son X:?\s*["\u201C']?(.+?)["\u201D']?\s*(?:[\/|·]\s*X)?\s*$/i);
  if (onXMatch && onXMatch[1]) docTitle = onXMatch[1];
  else docTitle = docTitle.replace(/\s*[/|·]\s*X\s*$/i, '');
  docTitle = docTitle.trim();
  if (docTitle && docTitle.length >= 5 && !isGenericTitle(docTitle)) return docTitle;

  const articleEl = primary?.querySelector('article') as HTMLElement | null;
  if (articleEl) {
    for (const h of Array.from(articleEl.querySelectorAll('h1, h2')) as HTMLElement[]) {
      const text = h.textContent?.trim() ?? '';
      if (text.length >= 10 && !isGenericTitle(text)) return text;
    }
  }

  if (primary) {
    for (const h of Array.from(primary.querySelectorAll('h1, h2')) as HTMLElement[]) {
      const text = h.textContent?.trim() ?? '';
      if (text.length >= 15 && !isGenericTitle(text)) return text;
    }
  }

  if (primary) {
    const tweetText = primary.querySelector('[data-testid="tweetText"]') as HTMLElement | null;
    if (tweetText) {
      const firstLine = (tweetText.innerText?.trim() ?? '').split('\n')[0].trim();
      if (firstLine && !isGenericTitle(firstLine)) {
        return firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine;
      }
    }
  }

  return 'Untitled';
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

// --- Author + date ---

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
    if (displayName !== 'Unknown' || handle !== '@unknown') return { displayName, handle };
  }
  const urlMatch = window.location.pathname.match(/^\/([^/]+)/);
  if (urlMatch) return { displayName: urlMatch[1], handle: `@${urlMatch[1]}` };
  return { displayName: 'Unknown', handle: '@unknown' };
}

function extractDate(): string {
  const timeEl = document.querySelector('[data-testid="primaryColumn"] time[datetime]');
  if (timeEl) return timeEl.getAttribute('datetime') ?? new Date().toISOString();
  return new Date().toISOString();
}

// --- Duplicate title stripping ---

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDuplicateTitle(body: ArticleBlock[], title: string): ArticleBlock[] {
  if (!title || body.length === 0) return body;
  const normTitle = normalizeForMatch(title);
  if (normTitle.length < 3) return body;

  const SEARCH_RANGE = 10;
  const MAX_STRIPS = 2;
  const result: ArticleBlock[] = [];
  let stripped = 0;

  for (let i = 0; i < body.length; i++) {
    if (stripped >= MAX_STRIPS || i >= SEARCH_RANGE) { result.push(body[i]); continue; }

    const block = body[i];
    let text = '';
    if (block.type === 'paragraph') text = block.richText.map(s => s.text).join('');
    else if ('text' in block) text = block.text;
    else { result.push(block); continue; }

    const normText = normalizeForMatch(text);
    if (!normText) { result.push(block); continue; }

    const matchLen = Math.min(25, normTitle.length, normText.length);
    if (
      normText === normTitle ||
      (normText.includes(normTitle) && normText.length <= normTitle.length + 120) ||
      (normTitle.includes(normText) && normText.length >= Math.min(10, normTitle.length)) ||
      (matchLen >= 25 && normText.slice(0, matchLen) === normTitle.slice(0, matchLen))
    ) {
      stripped++;
      continue;
    }

    result.push(block);
  }

  return result;
}

// --- Noise filter ---

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
  /^Subscribe$/, /^Sign up$/, /^Log in$/, /^Not now$/, /^·$/, /^Conversation$/,
  /^\d{1,2}:\d{2}\s*(AM|PM)/i,
  /^\d{1,2}:\d{2}\s*·/,
  /^\w{3}\s+\d{1,2},\s*\d{4}$/,
  /^\d{1,2}\s+\w{3}\s+\d{4}$/,
  /^\d+[KMB]?\s*Views?$/i,
  /^[\d,]+(\.\d+)?[KMB]?$/i,
  /^[\d,]+(\.\d+)?[KMB]?(\s+[\d,]+(\.\d+)?[KMB]?){1,5}$/i,
];

function isNoiseText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return NOISE_PATTERNS.some(p => p.test(trimmed));
}
