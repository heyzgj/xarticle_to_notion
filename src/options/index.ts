import { getSettings, saveSettings } from '../utils/storage';
import { testConnection } from '../background/notionApi';

const tokenInput = document.getElementById('notion-token') as HTMLInputElement;
const databaseInput = document.getElementById('database-id') as HTMLInputElement;
const btnTest = document.getElementById('btn-test')!;
const btnSave = document.getElementById('btn-save')!;
const statusEl = document.getElementById('status')!;

function showStatus(message: string, type: 'success' | 'error') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.hidden = false;
}

// Load existing settings
async function loadSettings() {
  const settings = await getSettings();
  if (settings) {
    tokenInput.value = settings.notionApiToken;
    databaseInput.value = settings.databaseId;
  }
}

// Test connection
btnTest.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  const dbId = databaseInput.value.trim();

  if (!token || !dbId) {
    showStatus('Please fill in both fields.', 'error');
    return;
  }

  btnTest.textContent = 'Testing...';
  (btnTest as HTMLButtonElement).disabled = true;

  try {
    const ok = await testConnection(token, dbId);
    if (ok) {
      showStatus('Connection successful! Your Notion database is accessible.', 'success');
    } else {
      showStatus('Connection failed. Check your token and database ID.', 'error');
    }
  } catch (err) {
    showStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
  } finally {
    btnTest.textContent = 'Test Connection';
    (btnTest as HTMLButtonElement).disabled = false;
  }
});

// Save settings
btnSave.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  const dbId = databaseInput.value.trim();

  if (!token || !dbId) {
    showStatus('Please fill in both fields.', 'error');
    return;
  }

  await saveSettings({ notionApiToken: token, databaseId: dbId });
  showStatus('Settings saved!', 'success');
});

loadSettings();
