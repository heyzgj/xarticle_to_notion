import type { ContentType } from '../../../types/article';

export interface DetectionResult {
  detected: boolean;
  contentType: ContentType;
  tweetCount: number;
}

export async function detectContent(): Promise<DetectionResult> {
  await waitForContent();

  const primary = document.querySelector('[data-testid="primaryColumn"]');
  if (!primary) return { detected: false, contentType: 'article', tweetCount: 0 };

  // --- Long-form X Article ---
  // Strict detection: URL path matches /{user}/article/{id}, or explicit article DOM.
  const path = window.location.pathname;
  const isArticleUrl = /^\/[^/]+\/article\/\d+/.test(path);
  const hasArticleDom =
    !!primary.querySelector('[data-testid="article-cover-image"]') ||
    !!primary.querySelector('[data-testid="twitterArticleRichTextView"]');
  if (isArticleUrl || hasArticleDom) {
    return { detected: true, contentType: 'article', tweetCount: 1 };
  }

  // --- Find main tweet using robust selector (works even if X changes tag types) ---
  const mainTweet = primary.querySelector('[data-testid="tweet"]') as HTMLElement | null;
  if (!mainTweet) return { detected: false, contentType: 'article', tweetCount: 0 };

  // --- Quote tweet: main tweet has a nested tweet inside ---
  if (findNestedTweet(mainTweet)) {
    return { detected: true, contentType: 'quote_tweet', tweetCount: 1 };
  }

  // --- Thread: consecutive self-replies by main author at top of timeline ---
  const threadCount = countConsecutiveSelfReplies(primary, mainTweet);
  if (threadCount >= 2) {
    return { detected: true, contentType: 'thread', tweetCount: threadCount };
  }

  // --- Single tweet ---
  return { detected: true, contentType: 'tweet', tweetCount: 1 };
}

/**
 * Walk cellInnerDiv elements from the top of the timeline. The first cell holds
 * the main tweet; subsequent cells that contain a tweet by the same author
 * (without interruption by another user) count as thread tweets. The first
 * cell with a different author ends the thread.
 */
function countConsecutiveSelfReplies(primary: Element, mainTweet: HTMLElement): number {
  const mainHandle = getAuthorHandle(mainTweet);
  if (!mainHandle) return 1;

  // Find the cellInnerDiv parent of the main tweet
  const mainCell = mainTweet.closest('[data-testid="cellInnerDiv"]');
  if (!mainCell) return 1;

  let count = 1; // main tweet itself
  let cursor: Element | null = mainCell.nextElementSibling;

  while (cursor) {
    // Skip spacers / section dividers that have no tweet inside
    const tweetInCell = cursor.querySelector('[data-testid="tweet"]') as HTMLElement | null;
    if (!tweetInCell) {
      // If this cell is a section boundary (like "Discover more"), stop.
      if (cursor.querySelector('h2, section')) break;
      cursor = cursor.nextElementSibling;
      continue;
    }

    // Skip tweets that are themselves nested inside another tweet (quoted tweets)
    if (tweetInCell.closest('[data-testid="tweet"] [data-testid="tweet"]')) {
      cursor = cursor.nextElementSibling;
      continue;
    }

    const handle = getAuthorHandle(tweetInCell);
    if (!handle) break;
    if (handle !== mainHandle) break; // thread ends at first non-self-reply
    count++;
    cursor = cursor.nextElementSibling;
  }

  return count;
}

/**
 * Find a quoted tweet embedded inside the outer tweet. X uses multiple wrappers
 * over time; we try them in order of current prevalence:
 *  1. [aria-labelledby="id__..."] — X's current container for quoted tweets
 *  2. [role="link"] — alternative wrapper, sometimes used
 *  3. [data-testid="tweet"] — older layout where quoted uses the same testid
 * A candidate must contain BOTH a User-Name (quoted author) AND tweetText
 * (quoted body), otherwise it's probably a link preview card or an icon.
 */
function findNestedTweet(tweet: HTMLElement): HTMLElement | null {
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

function getAuthorHandle(tweet: HTMLElement): string | null {
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

  for (const link of Array.from(links)) {
    const href = link.getAttribute('href') ?? '';
    if (href.startsWith('/') && !href.includes('/status/')) {
      return href.toLowerCase();
    }
  }

  return null;
}

function waitForContent(): Promise<void> {
  return new Promise(resolve => {
    const check = () => {
      const primary = document.querySelector('[data-testid="primaryColumn"]');
      if (primary?.querySelector('[data-testid="tweet"], [data-testid="twitterArticleRichTextView"]')) {
        resolve();
        return true;
      }
      return false;
    };

    if (check()) return;

    const observer = new MutationObserver(() => {
      if (check()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(); }, 8000);
  });
}
