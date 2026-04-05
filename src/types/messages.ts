import type { ArticleData } from './article';

export type Message =
  | { type: 'EXTRACT_ARTICLE' }
  | { type: 'ARTICLE_DATA'; data: ArticleData }
  | { type: 'ARTICLE_NOT_FOUND' }
  | { type: 'GET_CATEGORIES' }
  | { type: 'CATEGORIES_RESULT'; categories: string[] }
  | { type: 'CREATE_CATEGORY'; name: string }
  | { type: 'CREATE_CATEGORY_RESULT'; success: boolean; error?: string }
  | { type: 'SAVE_TO_NOTION'; article: ArticleData; category: string; tags: string[] }
  | { type: 'SAVE_RESULT'; success: boolean; pageUrl?: string; error?: string }
  | { type: 'CHECK_CONFIGURED' }
  | { type: 'CONFIGURED_RESULT'; configured: boolean };
