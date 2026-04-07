import './welcome.css';
import type { Message } from '../types/messages';
import { saveSettings, getSettings } from '../utils/storage';
import { OAUTH_WORKER_URL } from '../utils/constants';

// Step elements
const stepConnect = document.getElementById('step-connect')!;
const stepDatabase = document.getElementById('step-database')!;
const stepDone = document.getElementById('step-done')!;

// Connect step
const btnConnect = document.getElementById('btn-connect')!;

// Database step substates
const dbChecking = document.getElementById('db-checking')!;
const dbHasAccess = document.getElementById('db-has-access')!;
const dbNoAccess = document.getElementById('db-no-access')!;
const dbStepSubtitle = document.getElementById('db-step-subtitle')!;

// Has-access elements
const btnCreateDb = document.getElementById('btn-create-db')!;
const btnExistingDb = document.getElementById('btn-existing-db')!;
const dbPicker = document.getElementById('db-picker')!;
const dbSelect = document.getElementById('db-select') as HTMLSelectElement;
const btnUseSelected = document.getElementById('btn-use-selected')!;
const dbLoading = document.getElementById('db-loading')!;

// No-access recovery
const btnReconnect = document.getElementById('btn-reconnect')!;

// Done step
const dbNameEl = document.getElementById('db-name')!;

function showStep(step: HTMLElement) {
  [stepConnect, stepDatabase, stepDone].forEach(s => s.hidden = true);
  step.hidden = false;
}

function showDbSubstate(state: 'checking' | 'hasAccess' | 'noAccess') {
  dbChecking.hidden = state !== 'checking';
  dbHasAccess.hidden = state !== 'hasAccess';
  dbNoAccess.hidden = state !== 'noAccess';
}

async function sendMessage(msg: Message): Promise<Message> {
  return chrome.runtime.sendMessage(msg);
}

function startOAuth() {
  const extensionId = chrome.runtime.id;
  window.location.href = `${OAUTH_WORKER_URL}/auth?extension_id=${extensionId}`;
}

async function handlePostOAuth() {
  // Show database step with checking state
  showStep(stepDatabase);
  showDbSubstate('checking');

  // Check what we have access to
  const accessResult = await sendMessage({ type: 'CHECK_ACCESS' });
  if (accessResult.type !== 'CHECK_ACCESS_RESULT') {
    showDbSubstate('noAccess');
    return;
  }

  const { pages, databases } = accessResult;

  if (pages === 0 && databases === 0) {
    // Nothing shared — show recovery UI
    showDbSubstate('noAccess');
    return;
  }

  // We have access — show options
  showDbSubstate('hasAccess');

  // If they have existing databases, surface that option
  if (databases > 0) {
    btnExistingDb.hidden = false;
  } else {
    btnExistingDb.hidden = true;
  }

  // If they have no pages but have databases, hide "Create" and auto-show picker
  if (pages === 0 && databases > 0) {
    btnCreateDb.hidden = true;
    dbStepSubtitle.textContent = 'Pick the database to save your articles to.';
    await loadAndShowExistingPicker();
  }
}

async function checkOAuthReturn() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const workspaceName = params.get('workspace_name');
  const workspaceId = params.get('workspace_id');

  if (accessToken) {
    const existing = await getSettings();
    await saveSettings({
      ...existing,
      notionApiToken: accessToken,
      databaseId: existing?.databaseId ?? '',
      workspaceName: workspaceName ?? undefined,
      workspaceId: workspaceId ?? undefined,
    });

    window.history.replaceState({}, '', window.location.pathname);
    await handlePostOAuth();
    return true;
  }
  return false;
}

// Connect button — start OAuth
btnConnect.addEventListener('click', startOAuth);

// Reconnect button (no-pages recovery) — restart OAuth
btnReconnect.addEventListener('click', startOAuth);

// Create X2Notion database
btnCreateDb.addEventListener('click', async () => {
  dbLoading.hidden = false;
  btnCreateDb.setAttribute('disabled', '');
  btnExistingDb.setAttribute('disabled', '');

  const result = await sendMessage({ type: 'CREATE_DATABASE' });

  if (result.type === 'CREATE_DATABASE_RESULT' && result.success) {
    dbNameEl.textContent = 'X2Notion';
    showStep(stepDone);
    return;
  }

  // Handle errors
  dbLoading.hidden = true;
  btnCreateDb.removeAttribute('disabled');
  btnExistingDb.removeAttribute('disabled');

  if (result.type === 'CREATE_DATABASE_RESULT' && result.error === 'NO_PAGES_SHARED') {
    // Switch to recovery UI
    showDbSubstate('noAccess');
  } else {
    const errMsg = (result.type === 'CREATE_DATABASE_RESULT' && result.error)
      ? result.error
      : 'Unknown error';
    alert(`Could not create database: ${errMsg}\n\nTry the "Use an existing database" option instead.`);
  }
});

// Show existing database picker
async function loadAndShowExistingPicker() {
  dbPicker.hidden = false;
  btnExistingDb.classList.add('db-option--recommended');
  btnCreateDb.classList.remove('db-option--recommended');

  const result = await sendMessage({ type: 'LIST_DATABASES' });
  if (result.type === 'LIST_DATABASES_RESULT') {
    while (dbSelect.options.length > 1) dbSelect.remove(1);
    for (const db of result.databases) {
      const option = document.createElement('option');
      option.value = db.id;
      option.textContent = db.title;
      dbSelect.appendChild(option);
    }
  }
}

btnExistingDb.addEventListener('click', loadAndShowExistingPicker);

dbSelect.addEventListener('change', () => {
  btnUseSelected.toggleAttribute('disabled', !dbSelect.value);
});

btnUseSelected.addEventListener('click', async () => {
  const dbId = dbSelect.value;
  const dbName = dbSelect.options[dbSelect.selectedIndex].textContent ?? '';
  if (!dbId) return;

  const settings = await getSettings();
  await saveSettings({
    ...settings!,
    databaseId: dbId,
    databaseName: dbName,
  });

  dbNameEl.textContent = dbName;
  showStep(stepDone);
});

// Init
checkOAuthReturn().then(returned => {
  if (!returned) {
    getSettings().then(settings => {
      if (settings?.notionApiToken && settings?.databaseId) {
        dbNameEl.textContent = settings.databaseName ?? 'X2Notion';
        showStep(stepDone);
      }
    });
  }
});
