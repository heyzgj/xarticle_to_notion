import type { Message } from '../types/messages';
import type { ArticleData } from '../types/article';

// State references
const states = {
  unconfigured: document.getElementById('state-unconfigured')!,
  noArticle: document.getElementById('state-no-article')!,
  loading: document.getElementById('state-loading')!,
  preview: document.getElementById('state-preview')!,
  saving: document.getElementById('state-saving')!,
  success: document.getElementById('state-success')!,
  error: document.getElementById('state-error')!,
};

// Element references
const previewTitle = document.getElementById('preview-title')!;
const previewAuthor = document.getElementById('preview-author')!;
const previewDate = document.getElementById('preview-date')!;
const categorySelect = document.getElementById('category-select') as HTMLSelectElement;
const newCategoryRow = document.getElementById('new-category-row')!;
const newCategoryInput = document.getElementById('new-category-input') as HTMLInputElement;
const btnConfirmCategory = document.getElementById('btn-confirm-category')!;
const btnCancelCategory = document.getElementById('btn-cancel-category')!;
const tagsInput = document.getElementById('tags-input') as HTMLInputElement;
const btnSave = document.getElementById('btn-save')!;
const btnOpenOptions = document.getElementById('btn-open-options')!;
const btnRetry = document.getElementById('btn-retry')!;
const linkNotionPage = document.getElementById('link-notion-page') as HTMLAnchorElement;
const errorMessage = document.getElementById('error-message')!;

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

async function init() {
  // Check if configured
  const configResult = await sendMessage({ type: 'CHECK_CONFIGURED' });
  if (configResult.type === 'CONFIGURED_RESULT' && !configResult.configured) {
    showState('unconfigured');
    return;
  }

  // Extract article from current tab
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
      await loadCategories();
      showState('preview');
    }
  } catch {
    showState('noArticle');
  }
}

function showPreview(article: ArticleData) {
  previewTitle.textContent = article.title;
  previewAuthor.textContent = `${article.author.displayName} (${article.author.handle})`;

  const date = new Date(article.publishedDate);
  previewDate.textContent = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

async function loadCategories() {
  const result = await sendMessage({ type: 'GET_CATEGORIES' });
  if (result.type !== 'CATEGORIES_RESULT') return;

  // Clear existing options except the first placeholder
  while (categorySelect.options.length > 1) {
    categorySelect.remove(1);
  }

  for (const cat of result.categories) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  }

  // Add "Create New..." option
  const newOption = document.createElement('option');
  newOption.value = '__new__';
  newOption.textContent = '+ Create New...';
  categorySelect.appendChild(newOption);
}

// Category select change
categorySelect.addEventListener('change', () => {
  if (categorySelect.value === '__new__') {
    newCategoryRow.hidden = false;
    newCategoryInput.focus();
    categorySelect.value = '';
  }
});

// Confirm new category
btnConfirmCategory.addEventListener('click', () => {
  const name = newCategoryInput.value.trim();
  if (!name) return;

  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  // Insert before the "Create New..." option
  const createOption = categorySelect.querySelector('option[value="__new__"]');
  categorySelect.insertBefore(option, createOption);
  categorySelect.value = name;

  newCategoryInput.value = '';
  newCategoryRow.hidden = true;
});

// Cancel new category
btnCancelCategory.addEventListener('click', () => {
  newCategoryInput.value = '';
  newCategoryRow.hidden = true;
});

// Save button
btnSave.addEventListener('click', async () => {
  if (!currentArticle) return;

  const category = categorySelect.value;
  if (!category || category === '__new__') {
    categorySelect.focus();
    return;
  }

  const tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  showState('saving');

  const result = await sendMessage({
    type: 'SAVE_TO_NOTION',
    article: currentArticle,
    category,
    tags,
  });

  if (result.type === 'SAVE_RESULT') {
    if (result.success && result.pageUrl) {
      linkNotionPage.href = result.pageUrl;
      showState('success');
    } else {
      errorMessage.textContent = result.error ?? 'Failed to save article.';
      showState('error');
    }
  }
});

// Open options
btnOpenOptions.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Retry
btnRetry.addEventListener('click', () => {
  init();
});

// Initialize
init();
