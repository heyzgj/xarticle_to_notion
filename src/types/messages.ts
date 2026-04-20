import type { ArticleData } from './article';

export type Message =
  | { type: 'EXTRACT_ARTICLE' }
  | { type: 'ARTICLE_DATA'; data: ArticleData }
  | { type: 'ARTICLE_NOT_FOUND' }
  | { type: 'GET_CATEGORIES' }
  | { type: 'CATEGORIES_RESULT'; categories: string[] }
  | { type: 'SAVE_TO_NOTION'; article: ArticleData; category: string; tags: string[] }
  | { type: 'SAVE_RESULT'; success: boolean; pageUrl?: string; error?: string; duplicate?: boolean; existingUrl?: string }
  | { type: 'CHECK_CONFIGURED' }
  | { type: 'CONFIGURED_RESULT'; configured: boolean }
  | { type: 'CREATE_DATABASE' }
  | { type: 'CREATE_DATABASE_RESULT'; success: boolean; databaseId?: string; parentPageName?: string; error?: string }
  | { type: 'LIST_DATABASES' }
  | { type: 'LIST_DATABASES_RESULT'; databases: Array<{ id: string; title: string }> }
  | { type: 'GET_CONNECTION_STATUS' }
  | { type: 'CONNECTION_STATUS'; connected: boolean; workspaceName?: string; databaseName?: string }
  | { type: 'CHECK_ACCESS' }
  | { type: 'CHECK_ACCESS_RESULT'; pages: number; databases: number }
  | { type: 'TEST_OBSIDIAN' }
  | { type: 'TEST_OBSIDIAN_RESULT'; connected: boolean; error?: string }
  | { type: 'SAVE_OBSIDIAN_SETTINGS'; apiKey: string; host: string; vaultFolder: string }
  | { type: 'SAVE_OBSIDIAN_SETTINGS_RESULT'; success: boolean; error?: string };
