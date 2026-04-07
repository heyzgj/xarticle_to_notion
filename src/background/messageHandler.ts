import type { Message } from '../types/messages';
import { getSettings, isConfigured, saveSettings } from '../utils/storage';
import { saveArticle, getCategories, createX2NotionDatabase, listDatabases, getAccessibleResourceCounts } from './notionApi';
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

    case 'CREATE_CATEGORY': {
      await invalidateCache();
      return { type: 'CREATE_CATEGORY_RESULT', success: true };
    }

    case 'SAVE_TO_NOTION': {
      try {
        const result = await saveArticle(message.article, message.category, message.tags);
        await invalidateCache();
        return { type: 'SAVE_RESULT', success: true, pageUrl: result.url };
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
        await saveSettings({
          ...settings,
          databaseId: db.id,
          databaseName: 'X2Notion',
        });
        return { type: 'CREATE_DATABASE_RESULT', success: true, databaseId: db.id };
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

    default:
      return { type: 'CONFIGURED_RESULT', configured: false };
  }
}
