import './popup.css';
import type { Message } from '../types/messages';
import type { ArticleData } from '../types/article';
import { getFormExpanded, setFormExpanded } from '../utils/storage';
import { buildOAuthUrl } from '../utils/oauth';
import { articleToMarkdown } from '../utils/markdown';

const states = {
  unconfigured: document.getElementById('state-unconfigured')!,
  noArticle: document.getElementById('state-no-article')!,
  loading: document.getElementById('state-loading')!,
  preview: document.getElementById('state-preview')!,
};

const previewTitle = document.getElementById('preview-title')!;
const previewAuthor = document.getElementById('preview-author')!;
const previewDate = document.getElementById('preview-date')!;
const previewAvatar = document.getElementById('preview-avatar')!;

const btnToggleForm = document.getElementById('btn-toggle-form')!;
const formSection = document.getElementById('form-section')!;
const categorySelect = document.getElementById('category-select') as HTMLSelectElement;
const newCategoryRow = document.getElementById('new-category-row')!;
const newCategoryInput = document.getElementById('new-category-input') as HTMLInputElement;
const btnConfirmCategory = document.getElementById('btn-confirm-category')!;
const btnCancelCategory = document.getElementById('btn-cancel-category')!;
const tagsInput = document.getElementById('tags-input') as HTMLInputElement;

const actionArea = document.getElementById('action-area')!;
const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
const inlineError = document.getElementById('inline-error')!;
const errorMessage = document.getElementById('error-message')!;

// Inline line-icons — stroke uses currentColor so they invert correctly
// between the ink (white) and outline (dark) buttons. 15px on a 16 grid.
const ICON_COPY = '<svg class="act-ico" width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="5.6" y="5.6" width="7.9" height="7.9" rx="1.9" stroke="currentColor" stroke-width="1.5"/><path d="M10.4 5.6V4.3A1.8 1.8 0 0 0 8.6 2.5H4.3A1.8 1.8 0 0 0 2.5 4.3v4.3a1.8 1.8 0 0 0 1.8 1.8h1.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const ICON_CHECK = '<svg class="act-ico" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8.4 6.2 11.5 13 4.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_SAVE = '<svg class="act-ico" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2.6v6.3m0 0 2.4-2.4M8 8.9 5.6 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11.2v.6a1.6 1.6 0 0 0 1.6 1.6h6.8a1.6 1.6 0 0 0 1.6-1.6v-.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const ICON_OPEN = '<svg class="act-ico" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8.2 3H4.6A1.6 1.6 0 0 0 3 4.6v6.8A1.6 1.6 0 0 0 4.6 13h6.8A1.6 1.6 0 0 0 13 11.4V7.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 2.6h3.4V6M13.2 2.8 7.6 8.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SPINNER = '<span class="act-spin"></span>';

let saveState: 'idle' | 'saving' | 'saved' = 'idle';
let savedPageUrl: string | null = null;
let copyResetTimer: number | null = null;

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function showSaveError(error?: string) {
  errorMessage.textContent = error ?? 'Could not save. Check your connection and try again.';
  inlineError.hidden = false;
}

const btnSettings = document.getElementById('btn-settings')!;
const btnConnect = document.getElementById('btn-connect');

let currentArticle: ArticleData | null = null;

function showState(name: keyof typeof states) {
  Object.values(states).forEach(el => el.hidden = true);
  states[name].hidden = false;
}

async function sendMessage(msg: Message): Promise<Message> {
  return chrome.runtime.sendMessage(msg);
}

async function sendTabMessage(tabId: number, msg: Message): Promise<Message> {
  return chrome.tabs.sendMessage(tabId, msg);
}

/**
 * Try EXTRACT_ARTICLE on the current tab. If no platform-specific content
 * script is registered (e.g., user is on a random blog), inject the generic
 * Readability fallback content script via chrome.scripting and retry once.
 *
 * The injectedTabs Set prevents double-injection on popup re-open, which
 * would register two onMessage listeners and cause duplicate sendResponse
 * calls (Chrome silently drops the second, but the winner becomes timing-
 * dependent — avoid the latent bug entirely).
 */
const injectedTabs = new Set<number>();

async function extractFromTab(tabId: number): Promise<Message> {
  try {
    return await sendTabMessage(tabId, { type: 'EXTRACT_ARTICLE' });
  } catch {
    // No content script listening — inject generic fallback once per tab
    if (!injectedTabs.has(tabId)) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-generic.js'],
        });
        injectedTabs.add(tabId);
      } catch {
        return { type: 'ARTICLE_NOT_FOUND' };
      }
    }
    try {
      return await sendTabMessage(tabId, { type: 'EXTRACT_ARTICLE' });
    } catch {
      return { type: 'ARTICLE_NOT_FOUND' };
    }
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Warm earth tones only — no blue/purple/cyan (off-brand), no amber (reserved
// for the save moment). Keeps author initials distinguishable, stays on-system.
const AVATAR_COLORS = [
  '#B5683C', '#9C5A3C', '#A6743E', '#8C6A3F',
  '#7E6248', '#B0784E', '#8A5A44', '#6E5B43',
];

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function showPreview(article: ArticleData) {
  previewTitle.textContent = article.title;

  // Show content type badge for threads
  if (article.contentType === 'thread' && article.tweetCount) {
    previewAuthor.textContent = `${article.author.displayName} · Thread (${article.tweetCount} tweets)`;
  } else {
    previewAuthor.textContent = article.author.displayName;
  }

  const initials = getInitials(article.author.displayName);
  previewAvatar.textContent = initials;
  previewAvatar.style.backgroundColor = getAvatarColor(article.author.displayName);

  const date = new Date(article.publishedDate);
  previewDate.textContent = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

async function initFormToggle() {
  const expanded = await getFormExpanded();
  if (expanded) {
    formSection.hidden = false;
    btnToggleForm.classList.add('expanded');
  }
}

btnToggleForm.addEventListener('click', () => {
  const isExpanded = !formSection.hidden;
  formSection.hidden = isExpanded;
  btnToggleForm.classList.toggle('expanded', !isExpanded);
  setFormExpanded(!isExpanded);
});

async function loadCategories() {
  const result = await sendMessage({ type: 'GET_CATEGORIES' });
  if (result.type !== 'CATEGORIES_RESULT') return;

  while (categorySelect.options.length > 1) categorySelect.remove(1);

  for (const cat of result.categories) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  }

  const newOption = document.createElement('option');
  newOption.value = '__new__';
  newOption.textContent = '+ Create new...';
  categorySelect.appendChild(newOption);
}

categorySelect.addEventListener('change', () => {
  if (categorySelect.value === '__new__') {
    newCategoryRow.hidden = false;
    newCategoryInput.focus();
    categorySelect.value = '';
  }
});

btnConfirmCategory.addEventListener('click', () => {
  const name = newCategoryInput.value.trim();
  if (!name) return;

  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  const createOption = categorySelect.querySelector('option[value="__new__"]');
  categorySelect.insertBefore(option, createOption);
  categorySelect.value = name;

  newCategoryInput.value = '';
  newCategoryRow.hidden = true;
});

btnCancelCategory.addEventListener('click', () => {
  newCategoryInput.value = '';
  newCategoryRow.hidden = true;
});

function setFormDisabled(disabled: boolean) {
  const formEls = document.querySelectorAll('.article-card, .form-toggle, .form-section');
  formEls.forEach(el => el.classList.toggle('form-disabled', disabled));
}

// Copy — clipboard only, no Notion write. The fast grab: paste straight into
// an AI tool. Confirms with a transient "Copied" that settles back to "Copy".
btnCopy.addEventListener('click', async () => {
  if (!currentArticle) return;

  const envelope = articleToMarkdown(currentArticle);
  const ok = await writeClipboard(envelope);

  btnCopy.innerHTML = ok ? `${ICON_CHECK} Copied` : `${ICON_COPY} Try again`;
  btnCopy.classList.toggle('is-done', ok);

  if (copyResetTimer !== null) clearTimeout(copyResetTimer);
  copyResetTimer = window.setTimeout(() => {
    btnCopy.innerHTML = `${ICON_COPY} Copy`;
    btnCopy.classList.remove('is-done');
  }, 1600);
});

// Save to Notion — the committal action. Persists, then the button turns into
// "Open in Notion".
btnSave.addEventListener('click', async () => {
  if (saveState === 'saved' && savedPageUrl) {
    chrome.tabs.create({ url: savedPageUrl });
    window.close();
    return;
  }
  if (saveState === 'saving' || !currentArticle) return;

  const category = categorySelect.value === '__new__' ? '' : categorySelect.value;
  const tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  inlineError.hidden = true;
  saveState = 'saving';
  btnSave.disabled = true;
  btnSave.classList.add('is-loading');
  btnSave.innerHTML = `${SPINNER} Saving…`;

  const result = await sendMessage({
    type: 'SAVE_TO_NOTION',
    article: currentArticle,
    category,
    tags,
  });

  btnSave.disabled = false;
  btnSave.classList.remove('is-loading');

  if (result.type === 'SAVE_RESULT' && result.success && result.pageUrl) {
    saveState = 'saved';
    savedPageUrl = result.pageUrl;
    setFormDisabled(true);
    btnSave.innerHTML = `${ICON_OPEN} Open in Notion`;
  } else {
    saveState = 'idle';
    btnSave.innerHTML = `${ICON_SAVE} Save to Notion`;
    showSaveError(result.type === 'SAVE_RESULT' ? result.error : undefined);
  }
});

btnSettings.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

btnConnect?.addEventListener('click', async () => {
  chrome.tabs.create({ url: await buildOAuthUrl() });
});

async function init() {
  const configResult = await sendMessage({ type: 'CHECK_CONFIGURED' });
  if (configResult.type === 'CONFIGURED_RESULT' && !configResult.configured) {
    showState('unconfigured');
    return;
  }

  showState('loading');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showState('noArticle');
    return;
  }

  try {
    const result = await extractFromTab(tab.id);

    if (result.type === 'ARTICLE_NOT_FOUND') {
      showState('noArticle');
      return;
    }

    if (result.type === 'ARTICLE_DATA') {
      currentArticle = result.data;
      showPreview(result.data);
      await Promise.all([loadCategories(), initFormToggle()]);
      showState('preview');
    }
  } catch {
    showState('noArticle');
  }
}

init();
