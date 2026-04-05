import type { Message } from '../types/messages';
import { getSettings, isConfigured } from '../utils/storage';
import { saveArticle } from './notionApi';
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
      // Categories are auto-created by Notion when first used in a select property
      // Just invalidate cache so the new one shows up next time
      await invalidateCache();
      return { type: 'CREATE_CATEGORY_RESULT', success: true };
    }

    case 'SAVE_TO_NOTION': {
      try {
        const page = await saveArticle(message.article, message.category, message.tags);
        await invalidateCache();
        return { type: 'SAVE_RESULT', success: true, pageUrl: page.url };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        return { type: 'SAVE_RESULT', success: false, error: errorMsg };
      }
    }

    default:
      return { type: 'CONFIGURED_RESULT', configured: false };
  }
}
