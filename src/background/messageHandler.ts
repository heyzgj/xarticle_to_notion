import type { Message } from '../types/messages';
import { getSettings, isConfigured, saveSettings } from '../utils/storage';
import { OBSIDIAN_DEFAULT_HOST, OBSIDIAN_DEFAULT_FOLDER } from '../utils/constants';
import { createX2NotionDatabase, listDatabases, getAccessibleResourceCounts } from './destinations/notion';
import { testObsidianConnection } from './destinations/obsidian';
import { getActiveAdapters } from './destinations/registry';
import { getCachedCategories, invalidateCache } from './categoryCache';

export async function handleMessage(message: Message): Promise<Message> {
  switch (message.type) {
    case 'CHECK_CONFIGURED': {
      const settings = await getSettings();
      return { type: 'CONFIGURED_RESULT', configured: isConfigured(settings) };
    }

    case 'GET_CATEGORIES': {
      try {
        const categories = await getCachedCategories();
        return { type: 'CATEGORIES_RESULT', categories };
      } catch {
        return { type: 'CATEGORIES_RESULT', categories: [] };
      }
    }

    case 'SAVE_TO_NOTION': {
      const { article, category, tags } = message;

      try {
        const adapters = await getActiveAdapters();
        if (adapters.length === 0) {
          return { type: 'SAVE_RESULT', success: false, error: 'No destinations configured' };
        }

        // Duplicate check against first adapter (Notion takes priority)
        const primary = adapters[0];
        const dupCheck = await primary.checkDuplicate(article.url);
        if (dupCheck.isDuplicate) {
          return {
            type: 'SAVE_RESULT',
            success: true,
            pageUrl: dupCheck.existingUrl,
            duplicate: true,
            existingUrl: dupCheck.existingUrl,
          };
        }

        // Save to all active adapters; collect results
        const results = await Promise.all(
          adapters.map(a => a.save(article, { category, tags }))
        );

        await invalidateCache();

        // Return first successful result (prefer Notion URL for opening)
        const success = results.find(r => r.success);
        if (success) {
          return { type: 'SAVE_RESULT', success: true, pageUrl: success.pageUrl };
        }

        const firstError = results[0];
        return { type: 'SAVE_RESULT', success: false, error: firstError.error };
      } catch (e) {
        return { type: 'SAVE_RESULT', success: false, error: (e as Error).message };
      }
    }

    case 'CREATE_DATABASE': {
      try {
        const settings = await getSettings();
        if (!settings?.notionApiToken) {
          return { type: 'CREATE_DATABASE_RESULT', success: false, error: 'Not connected' };
        }
        const db = await createX2NotionDatabase(settings.notionApiToken);
        await saveSettings({ ...settings, databaseId: db.id, databaseName: 'X2Notion' });
        return { type: 'CREATE_DATABASE_RESULT', success: true, databaseId: db.id, parentPageName: db.parentPageName };
      } catch (e) {
        return { type: 'CREATE_DATABASE_RESULT', success: false, error: (e as Error).message };
      }
    }

    case 'LIST_DATABASES': {
      try {
        const databases = await listDatabases();
        return { type: 'LIST_DATABASES_RESULT', databases };
      } catch {
        return { type: 'LIST_DATABASES_RESULT', databases: [] };
      }
    }

    case 'GET_CONNECTION_STATUS': {
      const settings = await getSettings();
      if (!isConfigured(settings)) {
        return { type: 'CONNECTION_STATUS', connected: false };
      }
      return {
        type: 'CONNECTION_STATUS',
        connected: true,
        workspaceName: settings!.workspaceName,
        databaseName: settings!.databaseName,
      };
    }

    case 'CHECK_ACCESS': {
      try {
        const counts = await getAccessibleResourceCounts();
        return { type: 'CHECK_ACCESS_RESULT', pages: counts.pages, databases: counts.databases };
      } catch {
        return { type: 'CHECK_ACCESS_RESULT', pages: 0, databases: 0 };
      }
    }

    case 'TEST_OBSIDIAN': {
      const settings = await getSettings();
      const host = settings?.obsidian?.host || OBSIDIAN_DEFAULT_HOST;
      const apiKey = settings?.obsidian?.apiKey || '';
      const result = await testObsidianConnection(apiKey, host);
      return { type: 'TEST_OBSIDIAN_RESULT', connected: result.connected, error: result.error };
    }

    case 'SAVE_OBSIDIAN_SETTINGS': {
      try {
        const settings = await getSettings();
        const base = settings ?? { notionApiToken: '', databaseId: '' };
        const obs = {
          apiKey: message.apiKey,
          host: message.host || OBSIDIAN_DEFAULT_HOST,
          vaultFolder: message.vaultFolder || OBSIDIAN_DEFAULT_FOLDER,
        };

        // Test the connection before saving
        const test = await testObsidianConnection(obs.apiKey, obs.host);
        if (!test.connected) {
          return { type: 'SAVE_OBSIDIAN_SETTINGS_RESULT', success: false, error: test.error };
        }

        // Add obsidian to active destinations
        const existing = base.activeDestinations ?? (isConfigured(settings) ? ['notion' as const] : []);
        const active = existing.includes('obsidian')
          ? existing
          : [...existing, 'obsidian' as const];

        await saveSettings({ ...base, obsidian: obs, activeDestinations: active });
        return { type: 'SAVE_OBSIDIAN_SETTINGS_RESULT', success: true };
      } catch (e) {
        return { type: 'SAVE_OBSIDIAN_SETTINGS_RESULT', success: false, error: (e as Error).message };
      }
    }

    default:
      return { type: 'CONFIGURED_RESULT', configured: false };
  }
}
