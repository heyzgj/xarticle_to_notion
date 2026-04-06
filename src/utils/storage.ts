import type { ExtensionSettings } from '../types/settings';

const SETTINGS_KEY = 'extensionSettings';

export async function getSettings(): Promise<ExtensionSettings | null> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] ?? null;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export function isConfigured(settings: ExtensionSettings | null): boolean {
  return !!(settings?.notionApiToken && settings?.databaseId);
}

export async function getFormExpanded(): Promise<boolean> {
  const result = await chrome.storage.local.get('formExpanded');
  return result.formExpanded ?? false;
}

export async function setFormExpanded(expanded: boolean): Promise<void> {
  await chrome.storage.local.set({ formExpanded: expanded });
}
