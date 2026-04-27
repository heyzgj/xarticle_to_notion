export const NOTION_API_BASE = 'https://api.notion.com/v1';
export const NOTION_VERSION = '2022-06-28';
export const CATEGORY_CACHE_TTL = 5 * 60 * 1000;
export const CATEGORY_CACHE_KEY = 'categoryCache';
export const NOTION_MAX_BLOCKS_PER_REQUEST = 100;
// OAuth proxy URL — kept on the legacy x2notion-oauth subdomain because the
// Notion developer-portal callback URL is registered against it. Renaming
// requires a new Cloudflare Worker deploy + Notion integration update; deferred
// to a separate ops task so this rebrand can land without breaking live OAuth.
export const OAUTH_WORKER_URL = 'https://x2notion-oauth.heyzgj.workers.dev';

export const OBSIDIAN_DEFAULT_HOST = 'https://127.0.0.1:27124';
export const OBSIDIAN_DEFAULT_FOLDER = 'Lope';
