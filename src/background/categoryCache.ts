import { CATEGORY_CACHE_KEY, CATEGORY_CACHE_TTL } from '../utils/constants';
import { getCategories as fetchCategories } from './notionApi';

interface CacheEntry {
  categories: string[];
  timestamp: number;
}

export async function getCachedCategories(): Promise<string[]> {
  const result = await chrome.storage.local.get(CATEGORY_CACHE_KEY);
  const cache = result[CATEGORY_CACHE_KEY] as CacheEntry | undefined;

  if (cache && Date.now() - cache.timestamp < CATEGORY_CACHE_TTL) {
    return cache.categories;
  }

  return refreshCategories();
}

export async function refreshCategories(): Promise<string[]> {
  const categories = await fetchCategories();
  await chrome.storage.local.set({
    [CATEGORY_CACHE_KEY]: { categories, timestamp: Date.now() } as CacheEntry,
  });
  return categories;
}

export async function invalidateCache(): Promise<void> {
  await chrome.storage.local.remove(CATEGORY_CACHE_KEY);
}
