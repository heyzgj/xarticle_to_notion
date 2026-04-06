import type { Message } from '../types/messages';
import { getSettings, saveSettings, getFormExpanded, setFormExpanded } from '../utils/storage';
import { OAUTH_WORKER_URL } from '../utils/constants';

const statusConnected = document.getElementById('status-connected')!;
const statusDisconnected = document.getElementById('status-disconnected')!;
const workspaceName = document.getElementById('workspace-name')!;
const databaseName = document.getElementById('database-name')!;
const btnDisconnect = document.getElementById('btn-disconnect')!;
const btnConnect = document.getElementById('btn-connect')!;
const toggleExpand = document.getElementById('toggle-expand') as HTMLInputElement;

async function sendMessage(msg: Message): Promise<Message> {
  return chrome.runtime.sendMessage(msg);
}

async function loadStatus() {
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

async function loadPreferences() {
  toggleExpand.checked = await getFormExpanded();
}

btnDisconnect.addEventListener('click', async () => {
  if (!confirm('Disconnect from Notion? You can reconnect anytime.')) return;
  await saveSettings({ notionApiToken: '', databaseId: '' });
  loadStatus();
});

btnConnect.addEventListener('click', () => {
  const extensionId = chrome.runtime.id;
  window.location.href = `${OAUTH_WORKER_URL}/auth?extension_id=${extensionId}`;
});

toggleExpand.addEventListener('change', () => {
  setFormExpanded(toggleExpand.checked);
});

loadStatus();
loadPreferences();
