import './welcome.css';
import type { Message } from '../types/messages';
import { saveSettings, getSettings } from '../utils/storage';
import { OAUTH_WORKER_URL } from '../utils/constants';

const stepConnect = document.getElementById('step-connect')!;
const stepDatabase = document.getElementById('step-database')!;
const stepDone = document.getElementById('step-done')!;
const btnConnect = document.getElementById('btn-connect')!;
const btnCreateDb = document.getElementById('btn-create-db')!;
const btnExistingDb = document.getElementById('btn-existing-db')!;
const dbPicker = document.getElementById('db-picker')!;
const dbSelect = document.getElementById('db-select') as HTMLSelectElement;
const btnUseSelected = document.getElementById('btn-use-selected')!;
const dbLoading = document.getElementById('db-loading')!;
const dbNameEl = document.getElementById('db-name')!;

function showStep(step: HTMLElement) {
  [stepConnect, stepDatabase, stepDone].forEach(s => s.hidden = true);
  step.hidden = false;
}

async function sendMessage(msg: Message): Promise<Message> {
  return chrome.runtime.sendMessage(msg);
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
    showStep(stepDatabase);
    return true;
  }
  return false;
}

btnConnect.addEventListener('click', () => {
  const extensionId = chrome.runtime.id;
  window.location.href = `${OAUTH_WORKER_URL}/auth?extension_id=${extensionId}`;
});

btnCreateDb.addEventListener('click', async () => {
  dbLoading.hidden = false;
  btnCreateDb.setAttribute('disabled', '');
  btnExistingDb.setAttribute('disabled', '');

  const result = await sendMessage({ type: 'CREATE_DATABASE' });

  if (result.type === 'CREATE_DATABASE_RESULT' && result.success) {
    dbNameEl.textContent = 'X2Notion';
    showStep(stepDone);
  } else {
    dbLoading.hidden = true;
    btnCreateDb.removeAttribute('disabled');
    btnExistingDb.removeAttribute('disabled');
    alert('Could not create database. Please try again.');
  }
});

btnExistingDb.addEventListener('click', async () => {
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
});

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
