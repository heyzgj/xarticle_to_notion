import './popup.css';
import type { Message } from '../types/messages';
import type { ArticleData } from '../types/article';
import { getFormExpanded, setFormExpanded } from '../utils/storage';
import { OAUTH_WORKER_URL } from '../utils/constants';

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
const btnSave = document.getElementById('btn-save')!;
const inlineError = document.getElementById('inline-error')!;
const errorMessage = document.getElementById('error-message')!;

let saveState: 'idle' | 'saving' | 'saved' = 'idle';
let savedPageUrl: string | null = null;

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

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const AVATAR_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#34D399',
  '#22D3EE', '#60A5FA', '#A78BFA', '#F472B6',
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

btnSave.addEventListener('click', async () => {
  // If already saved, clicking opens the Notion page
  if (saveState === 'saved' && savedPageUrl) {
    chrome.tabs.create({ url: savedPageUrl });
    window.close();
    return;
  }
  if (saveState === 'saving') return;
  if (!currentArticle) return;

  const category = categorySelect.value === '__new__' ? '' : categorySelect.value;
  const tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  inlineError.hidden = true;
  setFormDisabled(true);
  saveState = 'saving';
  btnSave.innerHTML = '<div class="spinner"></div> Saving...';
  btnSave.classList.add('btn-saving');

  const result = await sendMessage({
    type: 'SAVE_TO_NOTION',
    article: currentArticle,
    category,
    tags,
  });

  if (result.type === 'SAVE_RESULT' && result.success && result.pageUrl) {
    saveState = 'saved';
    savedPageUrl = result.pageUrl;
    btnSave.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Open in Notion';
    btnSave.classList.remove('btn-saving');
    btnSave.classList.add('btn-success');
  } else {
    saveState = 'idle';
    setFormDisabled(false);
    btnSave.textContent = 'Save to Notion';
    btnSave.classList.remove('btn-saving');
    errorMessage.textContent = (result.type === 'SAVE_RESULT' && result.error) ? result.error : 'Could not save. Check your connection and try again.';
    inlineError.hidden = false;
  }
});

btnSettings.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

btnConnect?.addEventListener('click', () => {
  const extensionId = chrome.runtime.id;
  chrome.tabs.create({ url: `${OAUTH_WORKER_URL}/auth?extension_id=${extensionId}` });
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
    const result = await sendTabMessage(tab.id, { type: 'EXTRACT_ARTICLE' });

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
