import './options.css';
import type { Message } from '../types/messages';
import { getSettings, saveSettings, getFormExpanded, setFormExpanded } from '../utils/storage';
import { OAUTH_WORKER_URL, OBSIDIAN_DEFAULT_HOST, OBSIDIAN_DEFAULT_FOLDER } from '../utils/constants';

// --- Notion elements ---
const statusConnected = document.getElementById('status-connected')!;
const statusDisconnected = document.getElementById('status-disconnected')!;
const workspaceName = document.getElementById('workspace-name')!;
const databaseName = document.getElementById('database-name')!;
const btnDisconnect = document.getElementById('btn-disconnect')!;
const btnConnect = document.getElementById('btn-connect')!;

// --- Obsidian elements ---
const obsConnected = document.getElementById('obsidian-connected')!;
const obsForm = document.getElementById('obsidian-form')!;
const obsApiKeyInput = document.getElementById('obs-api-key') as HTMLInputElement;
const obsHostInput = document.getElementById('obs-host') as HTMLInputElement;
const obsFolderInput = document.getElementById('obs-folder') as HTMLInputElement;
const obsFolderDisplay = document.getElementById('obs-folder-display')!;
const obsError = document.getElementById('obs-error')!;
const btnObsSave = document.getElementById('btn-obs-save')!;
const btnObsEdit = document.getElementById('btn-obs-edit')!;

// --- Preferences ---
const toggleExpand = document.getElementById('toggle-expand') as HTMLInputElement;

async function sendMessage(msg: Message): Promise<Message> {
  return chrome.runtime.sendMessage(msg);
}

// --- Notion ---

async function loadNotionStatus() {
  const result = await sendMessage({ type: 'GET_CONNECTION_STATUS' });
  if (result.type !== 'CONNECTION_STATUS') return;

  if (result.connected) {
    statusConnected.hidden = false;
    statusDisconnected.hidden = true;
    workspaceName.textContent = result.workspaceName ?? '—';
    databaseName.textContent = result.databaseName ?? '—';
  } else {
    statusConnected.hidden = true;
    statusDisconnected.hidden = false;
  }
}

btnDisconnect.addEventListener('click', async () => {
  if (!confirm('Disconnect from Notion? You can reconnect anytime.')) return;
  const settings = await getSettings();
  await saveSettings({ ...settings, notionApiToken: '', databaseId: '' } as never);
  loadNotionStatus();
});

btnConnect.addEventListener('click', () => {
  const extensionId = chrome.runtime.id;
  window.location.href = `${OAUTH_WORKER_URL}/auth?extension_id=${extensionId}`;
});

// --- Obsidian ---

async function loadObsidianStatus() {
  const settings = await getSettings();
  const obs = settings?.obsidian;
  if (obs?.apiKey) {
    obsConnected.hidden = false;
    obsForm.hidden = true;
    obsFolderDisplay.textContent = obs.vaultFolder || OBSIDIAN_DEFAULT_FOLDER;
  } else {
    obsConnected.hidden = true;
    obsForm.hidden = false;
    // Pre-fill defaults
    if (!obsHostInput.value) obsHostInput.placeholder = OBSIDIAN_DEFAULT_HOST;
    if (!obsFolderInput.value) obsFolderInput.placeholder = OBSIDIAN_DEFAULT_FOLDER;
  }
}

btnObsEdit.addEventListener('click', () => {
  obsConnected.hidden = true;
  obsForm.hidden = false;
});

btnObsSave.addEventListener('click', async () => {
  const apiKey = obsApiKeyInput.value.trim();
  const host = obsHostInput.value.trim() || OBSIDIAN_DEFAULT_HOST;
  const vaultFolder = obsFolderInput.value.trim() || OBSIDIAN_DEFAULT_FOLDER;

  if (!apiKey) {
    showObsError('API key is required');
    return;
  }

  obsError.hidden = true;
  btnObsSave.textContent = 'Connecting...';
  btnObsSave.setAttribute('disabled', 'true');

  const result = await sendMessage({ type: 'SAVE_OBSIDIAN_SETTINGS', apiKey, host, vaultFolder });

  btnObsSave.textContent = 'Connect & Test';
  btnObsSave.removeAttribute('disabled');

  if (result.type === 'SAVE_OBSIDIAN_SETTINGS_RESULT' && result.success) {
    obsApiKeyInput.value = '';
    loadObsidianStatus();
  } else if (result.type === 'SAVE_OBSIDIAN_SETTINGS_RESULT') {
    showObsError(result.error ?? 'Connection failed. Make sure Obsidian is running with the Local REST API plugin enabled.');
  }
});

function showObsError(msg: string) {
  obsError.textContent = msg;
  obsError.hidden = false;
}

// --- Preferences ---

async function loadPreferences() {
  toggleExpand.checked = await getFormExpanded();
}

toggleExpand.addEventListener('change', () => {
  setFormExpanded(toggleExpand.checked);
});

// --- Init ---

loadNotionStatus();
loadObsidianStatus();
loadPreferences();
