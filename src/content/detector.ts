import type { ContentType } from '../types/article';

export interface DetectionResult {
  detected: boolean;
  contentType: ContentType;
  tweetCount: number;
}

export async function detectContent(): Promise<DetectionResult> {
  await waitForContent();

  const primary = document.querySelector('[data-testid="primaryColumn"]');
  if (!primary) return { detected: false, contentType: 'article', tweetCount: 0 };

  // --- Check for long-form X Article first ---
  const hasRichFormatting = primary.querySelector('h1, h2, h3') !== null;
  const articleEl = primary.querySelector('article');
  if (!articleEl) return { detected: false, contentType: 'article', tweetCount: 0 };

  const textContent = articleEl.textContent ?? '';
  const hasLongContent = textContent.length > 500;
  const hasArticleLabel = !!primary.querySelector('[data-testid="article-cover-image"]')
    || document.querySelector('meta[property="og:type"][content="article"]') !== null;

  if (hasArticleLabel || (hasRichFormatting && hasLongContent)) {
    return { detected: true, contentType: 'article', tweetCount: 1 };
  }

  // --- Check for Thread (multiple tweets by the same author) ---
  const threadResult = detectThread(primary);
  if (threadResult.detected) return threadResult;

  return { detected: false, contentType: 'article', tweetCount: 0 };
}

function detectThread(primary: Element): DetectionResult {
  // Find all tweet articles in the conversation
  const articles = Array.from(primary.querySelectorAll('article'));
  if (articles.length < 2) {
    return { detected: false, contentType: 'thread', tweetCount: 0 };
  }

  // Get the author handle of the first (main) tweet
  const mainAuthor = getAuthorHandle(articles[0] as HTMLElement);
  if (!mainAuthor) {
    return { detected: false, contentType: 'thread', tweetCount: 0 };
  }

  // Count how many consecutive articles share the same author (= thread tweets).
  // Stop when we hit a different author (= reply from someone else).
  let threadCount = 0;
  for (const article of articles) {
    const handle = getAuthorHandle(article as HTMLElement);
    if (handle === mainAuthor) {
      threadCount++;
    }
  }

  // A thread needs at least 2 tweets by the same author
  if (threadCount >= 2) {
    return { detected: true, contentType: 'thread', tweetCount: threadCount };
  }

  return { detected: false, contentType: 'thread', tweetCount: 0 };
}

function getAuthorHandle(article: HTMLElement): string | null {
  const userNameEl = article.querySelector('[data-testid="User-Name"]');
  if (!userNameEl) return null;

  const links = userNameEl.querySelectorAll('a');
  for (const link of Array.from(links)) {
    const href = link.getAttribute('href') ?? '';
    const text = link.textContent?.trim() ?? '';
    if (href.startsWith('/') && !href.includes('/status/') && text.startsWith('@')) {
      return text.toLowerCase();
    }
  }

  // Fallback: extract from href
  for (const link of Array.from(links)) {
    const href = link.getAttribute('href') ?? '';
    if (href.startsWith('/') && !href.includes('/status/')) {
      return href.toLowerCase();
    }
  }

  return null;
}

function waitForContent(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      const primary = document.querySelector('[data-testid="primaryColumn"]');
      if (primary?.querySelector('article')) {
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

    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 8000);
  });
}
