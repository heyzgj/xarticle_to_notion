import type { ArticleData } from '../types/article';
import type { Message, ToastKind } from '../types/messages';
import { handleMessage } from './messageHandler';
import { articleToMarkdown } from '../utils/markdown';

/**
 * Reflex save orchestrator (M2). Bound to the `quick-save` chrome command —
 * by default Cmd/Ctrl+Shift+S. The flow is intentionally non-interactive:
 * extract from the active tab, save with empty category/tags, surface a
 * Shadow-DOM toast in the page. Saves take the curation signal as the only
 * input; the agent does the rest at recall.
 *
 * Click-the-icon still opens the popup with the form, for the 5% case where
 * the user wants to edit category/tags at save-time.
 */

const PROTECTED_PROTOCOLS = [
  'chrome:', 'chrome-extension:', 'chrome-untrusted:', 'edge:',
  'about:', 'view-source:', 'devtools:', 'file:', 'data:', 'blob:',
];

let inFlight = false;

export async function runQuickSave(): Promise<void> {
  if (inFlight) return; // de-dupe rapid Cmd+S taps
  inFlight = true;
  try {
    await runQuickSaveInner();
  } finally {
    inFlight = false;
  }
}

async function runQuickSaveInner(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return;

  // Bail on protected URLs — toast can't inject and save is meaningless.
  for (const proto of PROTECTED_PROTOCOLS) {
    if (tab.url.startsWith(proto)) return;
  }
  const tabId = tab.id;

  // Fire the pending toast immediately so the user knows the keypress landed.
  await showToast(tabId, 'Saving…', 'pending');

  // 1. Extract — try existing platform content script first; inject generic if absent.
  const article = await extractArticle(tabId);
  if (article === 'no-article') {
    await showToast(tabId, 'No article detected on this page', 'info');
    return;
  }
  if (article === 'extract-failed') {
    await showToast(tabId, 'Extraction failed', 'error');
    return;
  }

  // 2. Save (delegates to existing handler — destinations + dedupe + multi-fanout).
  const saveResult = await handleMessage({
    type: 'SAVE_TO_NOTION',
    article,
    category: '',
    tags: [],
  });

  if (saveResult.type === 'SAVE_RESULT' && saveResult.success) {
    const text = saveResult.duplicate ? 'Already saved' : 'Saved';
    // Envelope = YAML frontmatter (title/url/notion_url/...) + markdown body
    // with `![alt](url)` for images intact. Agent on the receiving end pastes
    // it and reads everything in one go — no Notion connector dance needed.
    const clipboardText = articleToMarkdown(article, { notionUrl: saveResult.pageUrl });
    await showToast(tabId, text, 'success', clipboardText);
    return;
  }
  const error =
    saveResult.type === 'SAVE_RESULT' && saveResult.error
      ? saveResult.error
      : 'Save failed';
  await showToast(tabId, error, 'error');
}

type ExtractResult = ArticleData | 'no-article' | 'extract-failed';

async function extractArticle(tabId: number): Promise<ExtractResult> {
  let result: Message;
  try {
    result = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_ARTICLE' });
  } catch {
    // No platform content script registered — inject the generic Readability profile.
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content-generic.js'] });
      result = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_ARTICLE' });
    } catch {
      return 'extract-failed';
    }
  }
  if (result.type === 'ARTICLE_NOT_FOUND') return 'no-article';
  if (result.type !== 'ARTICLE_DATA') return 'extract-failed';
  return result.data;
}

async function showToast(
  tabId: number,
  text: string,
  kind: ToastKind,
  clipboardText?: string,
): Promise<void> {
  // content-toast.js self-guards against double-listener registration via
  // window.__lopeToastLoaded, so re-running executeScript on the same tab is safe.
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content-toast.js'] });
  } catch {
    return; // Cannot inject (protected URL slipped through, tab closed, etc.) — silent.
  }
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'SHOW_TOAST', text, kind, clipboardText });
  } catch {
    // Listener didn't register or tab closed — silent.
  }
}
