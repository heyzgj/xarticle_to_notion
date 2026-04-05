export async function detectArticle(): Promise<boolean> {
  // Wait for content to load (X is a React SPA)
  await waitForContent();

  const primary = document.querySelector('[data-testid="primaryColumn"]');
  if (!primary) return false;

  // X Articles contain rich formatting not found in regular tweets
  const hasRichFormatting = primary.querySelector('h1, h2, h3') !== null;

  // Check for article-specific elements
  const articleEl = primary.querySelector('article');
  if (!articleEl) return false;

  // Articles have substantial content with multiple paragraphs
  const textContent = articleEl.textContent ?? '';
  const hasLongContent = textContent.length > 500;

  // Check for the "article" label/indicator
  const hasArticleLabel = !!primary.querySelector('[data-testid="article-cover-image"]')
    || document.querySelector('meta[property="og:type"][content="article"]') !== null;

  // Combine signals: rich formatting + long content, OR explicit article label
  return hasArticleLabel || (hasRichFormatting && hasLongContent);
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

    // Timeout after 8 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 8000);
  });
}
