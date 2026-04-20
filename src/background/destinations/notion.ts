import { NOTION_API_BASE, NOTION_VERSION, NOTION_MAX_BLOCKS_PER_REQUEST } from '../../utils/constants';
import { getSettings } from '../../utils/storage';
import type { ArticleData, ArticleBlock, RichTextSegment } from '../../types/article';
import type { NotionDatabaseSchema, NotionPage, NotionRichText, NotionBlock } from '../../types/notion';
import type { SaveOptions, SaveResult } from '../../types/destinations';
import type { DestinationAdapter } from './base';

// --- Adapter ---

export class NotionAdapter implements DestinationAdapter {
  readonly id = 'notion' as const;
  readonly displayName = 'Notion';

  async isConfigured(): Promise<boolean> {
    const s = await getSettings();
    return !!(s?.notionApiToken && s?.databaseId);
  }

  async save(article: ArticleData, opts: SaveOptions): Promise<SaveResult> {
    try {
      const page = await saveArticle(article, opts.category, opts.tags);
      return { success: true, pageUrl: page.url, destination: 'notion' };
    } catch (e) {
      return { success: false, error: (e as Error).message, destination: 'notion' };
    }
  }

  async getCategories(): Promise<string[]> {
    return getCategories();
  }

  async checkDuplicate(url: string): Promise<{ isDuplicate: boolean; existingUrl?: string }> {
    const settings = await getSettings();
    if (!settings?.notionApiToken || !settings?.databaseId) {
      return { isDuplicate: false };
    }
    try {
      const result = await notionFetch(`/databases/${settings.databaseId}/query`, 'POST', {
        filter: { property: 'URL', url: { equals: url } },
        page_size: 1,
      }) as { results: NotionPage[] };
      if (result.results.length > 0) {
        return { isDuplicate: true, existingUrl: result.results[0].url };
      }
    } catch {
      // If the check fails (e.g. URL property doesn't exist), don't block the save
    }
    return { isDuplicate: false };
  }
}

// --- Notion API internals ---

async function notionFetch(path: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown): Promise<unknown> {
  const settings = await getSettings();
  if (!settings) throw new Error('Extension not configured');

  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${settings.notionApiToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') ?? '1', 10);
    await sleep(retryAfter * 1000);
    return notionFetch(path, method, body);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Notion API error (${response.status}): ${(error as { message?: string }).message ?? 'Unknown error'}`);
  }

  return response.json();
}

export async function getCategories(): Promise<string[]> {
  const settings = await getSettings();
  if (!settings) return [];

  const db = await notionFetch(`/databases/${settings.databaseId}`, 'GET') as NotionDatabaseSchema;
  const categoryProp = Object.values(db.properties).find(p => p.type === 'select' && p.id);

  const category = Object.entries(db.properties).find(
    ([name]) => name.toLowerCase() === 'category'
  )?.[1] ?? categoryProp;

  if (!category?.select) return [];
  return category.select.options.map(o => o.name);
}

// --- Schema migration ---

let knownProperties: Set<string> | null = null;

async function ensureDatabaseSchema(databaseId: string): Promise<Set<string>> {
  if (knownProperties) return knownProperties;

  const db = await notionFetch(`/databases/${databaseId}`, 'GET') as {
    properties: Record<string, unknown>;
  };

  const existing = new Set(Object.keys(db.properties));

  const toAdd: Record<string, unknown> = {};
  if (!existing.has('Type')) {
    toAdd['Type'] = { select: { options: [
      { name: 'Article' }, { name: 'Thread' },
      { name: 'Tweet' }, { name: 'Quote Tweet' },
    ] } };
  }
  if (!existing.has('TweetCount')) {
    toAdd['TweetCount'] = { number: {} };
  }
  if (!existing.has('QuotedAuthor')) {
    toAdd['QuotedAuthor'] = { rich_text: {} };
  }
  if (!existing.has('QuotedUrl')) {
    toAdd['QuotedUrl'] = { url: {} };
  }

  if (Object.keys(toAdd).length > 0) {
    try {
      await notionFetch(`/databases/${databaseId}`, 'PATCH', { properties: toAdd });
      for (const key of Object.keys(toAdd)) existing.add(key);
    } catch {
      // Migration failed (e.g. no edit permission) — skip those properties
    }
  }

  knownProperties = existing;
  return existing;
}

// --- Save ---

async function saveArticle(
  article: ArticleData,
  category: string,
  tags: string[]
): Promise<NotionPage> {
  const settings = await getSettings();
  if (!settings) throw new Error('Extension not configured');

  const dbProps = await ensureDatabaseSchema(settings.databaseId);

  const blocks = articleToNotionBlocks(article);
  const firstBatch = blocks.slice(0, NOTION_MAX_BLOCKS_PER_REQUEST);
  const remaining = blocks.slice(NOTION_MAX_BLOCKS_PER_REQUEST);

  const properties: Record<string, unknown> = {
    Title: { title: [{ type: 'text', text: { content: article.title } }] },
    URL: { url: article.url },
    Author: { rich_text: [{ type: 'text', text: { content: article.author.displayName } }] },
    Handle: { rich_text: [{ type: 'text', text: { content: article.author.handle } }] },
    Published: { date: { start: article.publishedDate.split('T')[0] } },
    Saved: { date: { start: new Date().toISOString().split('T')[0] } },
  };

  if (dbProps.has('Type')) {
    properties['Type'] = { select: { name: contentTypeToLabel(article.contentType) } };
  }
  if (dbProps.has('TweetCount') && article.tweetCount != null) {
    properties['TweetCount'] = { number: article.tweetCount };
  }
  if (article.quotedTweet) {
    const q = article.quotedTweet;
    if (dbProps.has('QuotedAuthor')) {
      const label = `${q.author.displayName} ${q.author.handle}`.trim();
      properties['QuotedAuthor'] = { rich_text: [{ type: 'text', text: { content: label } }] };
    }
    if (dbProps.has('QuotedUrl') && q.url && isValidUrl(q.url)) {
      properties['QuotedUrl'] = { url: q.url };
    }
  }
  if (category && category.trim()) {
    properties['Category'] = { select: { name: category.trim() } };
  }
  if (tags.length > 0) {
    properties['Tags'] = { multi_select: tags.map(t => ({ name: t })) };
  }

  const page = await notionFetch('/pages', 'POST', {
    parent: { database_id: settings.databaseId },
    properties,
    children: firstBatch,
  }) as NotionPage;

  for (let i = 0; i < remaining.length; i += NOTION_MAX_BLOCKS_PER_REQUEST) {
    const batch = remaining.slice(i, i + NOTION_MAX_BLOCKS_PER_REQUEST);
    await notionFetch(`/blocks/${page.id}/children`, 'PATCH', { children: batch });
  }

  return page;
}

function contentTypeToLabel(contentType: string): string {
  switch (contentType) {
    case 'article':     return 'Article';
    case 'thread':      return 'Thread';
    case 'tweet':       return 'Tweet';
    case 'quote_tweet': return 'Quote Tweet';
    default:            return 'Article';
  }
}

// --- Block conversion ---

function articleToNotionBlocks(article: ArticleData): NotionBlock[] {
  const blocks: NotionBlock[] = [];

  for (const block of article.body) {
    const result = convertBlock(block);
    if (result) {
      if (Array.isArray(result)) blocks.push(...result);
      else blocks.push(result);
    }
  }

  // Append quoted tweet as a clearly distinct section
  if (article.quotedTweet) {
    const q = article.quotedTweet;
    blocks.push({ object: 'block', type: 'divider', divider: {} });

    // Header: "↳ Quoted post by {Name} (@handle)" — handle linked to quoted tweet URL if available
    const headerRt: NotionRichText[] = [
      { type: 'text', text: { content: '↳ Quoted post by ' }, annotations: { bold: true } },
      { type: 'text', text: { content: q.author.displayName }, annotations: { bold: true } },
      { type: 'text', text: { content: ' ' } },
      {
        type: 'text',
        text: q.url && isValidUrl(q.url)
          ? { content: q.author.handle, link: { url: q.url } }
          : { content: q.author.handle },
        annotations: { italic: true },
      },
    ];
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: headerRt } });

    // Body in quote blocks (visually distinct from outer tweet)
    for (const block of q.body) {
      const result = convertBlock(block, true);
      if (result) {
        if (Array.isArray(result)) blocks.push(...result);
        else blocks.push(result);
      }
    }
  }

  return blocks;
}

const NOTION_MAX_RICH_TEXT = 100;
const NOTION_MAX_TEXT_LENGTH = 2000;

function convertBlock(block: ArticleBlock, inQuote = false): NotionBlock | NotionBlock[] | null {
  // Wrap quoted tweet content in Notion quote blocks for visual distinction
  const wrapType = inQuote ? 'quote' : null;

  switch (block.type) {
    case 'heading_1':
      return wrapType
        ? { object: 'block', type: 'quote', quote: { rich_text: [richText(`# ${block.text}`)] } }
        : { object: 'block', type: 'heading_1', heading_1: { rich_text: [richText(block.text)] } };
    case 'heading_2':
      return wrapType
        ? { object: 'block', type: 'quote', quote: { rich_text: [richText(`## ${block.text}`)] } }
        : { object: 'block', type: 'heading_2', heading_2: { rich_text: [richText(block.text)] } };
    case 'heading_3':
      return wrapType
        ? { object: 'block', type: 'quote', quote: { rich_text: [richText(`### ${block.text}`)] } }
        : { object: 'block', type: 'heading_3', heading_3: { rich_text: [richText(block.text)] } };
    case 'paragraph': {
      const allRt = block.richText.map(segmentToRichText);
      const blockType = wrapType ?? 'paragraph';
      return splitRichTextBlocks(blockType as 'paragraph' | 'quote', allRt);
    }
    case 'image':
      return {
        object: 'block', type: 'image',
        image: { type: 'external', external: { url: block.url } },
      };
    case 'video': {
      const url = block.tweetUrl ?? block.sourceUrl;
      const richTextEl: NotionRichText = {
        type: 'text',
        text: { content: '[Video]', link: url ? { url } : null },
      };
      return {
        object: 'block', type: wrapType ?? 'paragraph',
        [wrapType ?? 'paragraph']: { rich_text: [richTextEl] },
      };
    }
    case 'bulleted_list_item':
      return {
        object: 'block', type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [richText(block.text)] },
      };
    case 'numbered_list_item':
      return {
        object: 'block', type: 'numbered_list_item',
        numbered_list_item: { rich_text: [richText(block.text)] },
      };
    case 'quote':
      return { object: 'block', type: 'quote', quote: { rich_text: [richText(block.text)] } };
    case 'divider':
      return { object: 'block', type: 'divider', divider: {} };
    default:
      return null;
  }
}

function richText(content: string): NotionRichText {
  return { type: 'text', text: { content } };
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function segmentToRichText(segment: RichTextSegment): NotionRichText {
  const content = segment.text.length > NOTION_MAX_TEXT_LENGTH
    ? segment.text.slice(0, NOTION_MAX_TEXT_LENGTH)
    : segment.text;

  const link = segment.href && isValidUrl(segment.href)
    ? { url: segment.href }
    : null;

  const rt: NotionRichText = { type: 'text', text: { content, link } };

  if (segment.bold || segment.italic || segment.underline) {
    rt.annotations = {
      bold: segment.bold,
      italic: segment.italic,
      underline: segment.underline,
    };
  }

  return rt;
}

function splitRichTextBlocks(
  blockType: 'paragraph' | 'quote' | 'bulleted_list_item' | 'numbered_list_item',
  richTextArr: NotionRichText[]
): NotionBlock | NotionBlock[] {
  if (richTextArr.length <= NOTION_MAX_RICH_TEXT) {
    return { object: 'block', type: blockType, [blockType]: { rich_text: richTextArr } };
  }
  const blocks: NotionBlock[] = [];
  for (let i = 0; i < richTextArr.length; i += NOTION_MAX_RICH_TEXT) {
    blocks.push({
      object: 'block', type: blockType,
      [blockType]: { rich_text: richTextArr.slice(i, i + NOTION_MAX_RICH_TEXT) },
    });
  }
  return blocks;
}

// --- Database creation ---

export async function createX2NotionDatabase(token: string): Promise<{ id: string; parentPageName: string }> {
  const searchResult = await notionFetch('/search', 'POST', {
    filter: { value: 'page', property: 'object' },
    page_size: 1,
  }) as { results: Array<{ id: string; properties?: Record<string, { title?: Array<{ plain_text: string }> }> }> };

  if (searchResult.results.length === 0) throw new Error('NO_PAGES_SHARED');

  const parentPage = searchResult.results[0];
  const parentPageName = extractPageTitle(parentPage) || 'your Notion workspace';

  const result = await notionFetch('/databases', 'POST', {
    parent: { type: 'page_id', page_id: parentPage.id },
    title: [{ type: 'text', text: { content: 'X2Notion' } }],
    properties: {
      Title: { title: {} },
      URL: { url: {} },
      Author: { rich_text: {} },
      Handle: { rich_text: {} },
      Published: { date: {} },
      Saved: { date: {} },
      Type: { select: { options: [
        { name: 'Article' }, { name: 'Thread' },
        { name: 'Tweet' }, { name: 'Quote Tweet' },
      ] } },
      TweetCount: { number: {} },
      QuotedAuthor: { rich_text: {} },
      QuotedUrl: { url: {} },
      Category: { select: { options: [] } },
      Tags: { multi_select: { options: [] } },
    },
  }) as { id: string };

  return { id: result.id, parentPageName };
}

function extractPageTitle(page: {
  properties?: Record<string, { title?: Array<{ plain_text: string }> }>;
}): string {
  if (!page.properties) return '';
  for (const prop of Object.values(page.properties)) {
    if (prop.title && Array.isArray(prop.title)) {
      const text = prop.title.map(t => t.plain_text || '').join('').trim();
      if (text) return text;
    }
  }
  return '';
}

export async function getAccessibleResourceCounts(): Promise<{ pages: number; databases: number }> {
  const [pageResult, dbResult] = await Promise.all([
    notionFetch('/search', 'POST', { filter: { value: 'page', property: 'object' }, page_size: 1 }) as Promise<{ results: unknown[] }>,
    notionFetch('/search', 'POST', { filter: { value: 'database', property: 'object' }, page_size: 1 }) as Promise<{ results: unknown[] }>,
  ]);
  return { pages: pageResult.results.length, databases: dbResult.results.length };
}

export async function listDatabases(): Promise<Array<{ id: string; title: string }>> {
  const result = await notionFetch('/search', 'POST', {
    filter: { value: 'database', property: 'object' },
    page_size: 50,
  }) as { results: Array<{ id: string; title: Array<{ plain_text: string }> }> };

  return result.results.map(db => ({
    id: db.id,
    title: db.title.map(t => t.plain_text).join('') || 'Untitled',
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
