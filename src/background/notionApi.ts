import { NOTION_API_BASE, NOTION_VERSION, NOTION_MAX_BLOCKS_PER_REQUEST } from '../utils/constants';
import { getSettings } from '../utils/storage';
import type { ArticleData, ArticleBlock, RichTextSegment } from '../types/article';
import type { NotionDatabaseSchema, NotionPage, NotionRichText, NotionBlock } from '../types/notion';

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
    // Rate limited — retry after delay
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

export async function testConnection(token: string, databaseId: string): Promise<boolean> {
  const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  });
  return response.ok;
}

export async function getCategories(): Promise<string[]> {
  const settings = await getSettings();
  if (!settings) return [];

  const db = await notionFetch(`/databases/${settings.databaseId}`, 'GET') as NotionDatabaseSchema;
  const categoryProp = Object.values(db.properties).find(p => p.type === 'select' && p.id);

  // Try to find by name "Category" first, then fall back to first select property
  const category = Object.entries(db.properties).find(
    ([name]) => name.toLowerCase() === 'category'
  )?.[1] ?? categoryProp;

  if (!category?.select) return [];
  return category.select.options.map(o => o.name);
}

export async function saveArticle(
  article: ArticleData,
  category: string,
  tags: string[]
): Promise<NotionPage> {
  const settings = await getSettings();
  if (!settings) throw new Error('Extension not configured');

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

  // Only include Category if user picked one (Notion rejects empty select.name)
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

  // Append remaining blocks in batches
  for (let i = 0; i < remaining.length; i += NOTION_MAX_BLOCKS_PER_REQUEST) {
    const batch = remaining.slice(i, i + NOTION_MAX_BLOCKS_PER_REQUEST);
    await notionFetch(`/blocks/${page.id}/children`, 'PATCH', {
      children: batch,
    });
  }

  return page;
}

function articleToNotionBlocks(article: ArticleData): NotionBlock[] {
  const blocks: NotionBlock[] = [];

  for (const block of article.body) {
    const result = convertBlock(block);
    if (result) {
      if (Array.isArray(result)) {
        blocks.push(...result);
      } else {
        blocks.push(result);
      }
    }
  }

  return blocks;
}

const NOTION_MAX_RICH_TEXT = 100;
const NOTION_MAX_TEXT_LENGTH = 2000;

function convertBlock(block: ArticleBlock): NotionBlock | NotionBlock[] | null {
  switch (block.type) {
    case 'heading_1':
      return {
        object: 'block', type: 'heading_1',
        heading_1: { rich_text: [richText(block.text)] },
      };
    case 'heading_2':
      return {
        object: 'block', type: 'heading_2',
        heading_2: { rich_text: [richText(block.text)] },
      };
    case 'heading_3':
      return {
        object: 'block', type: 'heading_3',
        heading_3: { rich_text: [richText(block.text)] },
      };
    case 'paragraph': {
      const allRt = block.richText.map(segmentToRichText);
      return splitRichTextBlocks('paragraph', allRt);
    }
    case 'image':
      return {
        object: 'block', type: 'image',
        image: { type: 'external', external: { url: block.url } },
      };
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
      return {
        object: 'block', type: 'quote',
        quote: { rich_text: [richText(block.text)] },
      };
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
  // Notion limits each text content to 2000 chars
  const content = segment.text.length > NOTION_MAX_TEXT_LENGTH
    ? segment.text.slice(0, NOTION_MAX_TEXT_LENGTH)
    : segment.text;

  // Only include link if it's a valid absolute URL
  const link = segment.href && isValidUrl(segment.href)
    ? { url: segment.href }
    : null;

  const rt: NotionRichText = {
    type: 'text',
    text: { content, link },
  };

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
  richText: NotionRichText[]
): NotionBlock | NotionBlock[] {
  if (richText.length <= NOTION_MAX_RICH_TEXT) {
    return {
      object: 'block', type: blockType,
      [blockType]: { rich_text: richText },
    };
  }

  // Split into chunks of NOTION_MAX_RICH_TEXT
  const blocks: NotionBlock[] = [];
  for (let i = 0; i < richText.length; i += NOTION_MAX_RICH_TEXT) {
    blocks.push({
      object: 'block', type: blockType,
      [blockType]: { rich_text: richText.slice(i, i + NOTION_MAX_RICH_TEXT) },
    });
  }
  return blocks;
}

export async function createX2NotionDatabase(token: string): Promise<{ id: string; parentPageName: string }> {
  // Search for any page the integration has access to
  const searchResult = await notionFetch('/search', 'POST', {
    filter: { value: 'page', property: 'object' },
    page_size: 1,
  }) as {
    results: Array<{
      id: string;
      properties?: Record<string, { title?: Array<{ plain_text: string }> }>;
    }>
  };

  // Notion API requires a parent page to create a database (workspace root not allowed)
  if (searchResult.results.length === 0) {
    throw new Error('NO_PAGES_SHARED');
  }

  const parentPage = searchResult.results[0];
  const parentPageName = extractPageTitle(parentPage) || 'your Notion workspace';
  const parent = { type: 'page_id' as const, page_id: parentPage.id };

  const result = await notionFetch('/databases', 'POST', {
    parent,
    title: [{ type: 'text', text: { content: 'X2Notion' } }],
    properties: {
      Title: { title: {} },
      URL: { url: {} },
      Author: { rich_text: {} },
      Handle: { rich_text: {} },
      Published: { date: {} },
      Saved: { date: {} },
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
    notionFetch('/search', 'POST', {
      filter: { value: 'page', property: 'object' },
      page_size: 1,
    }) as Promise<{ results: unknown[] }>,
    notionFetch('/search', 'POST', {
      filter: { value: 'database', property: 'object' },
      page_size: 1,
    }) as Promise<{ results: unknown[] }>,
  ]);
  return {
    pages: pageResult.results.length,
    databases: dbResult.results.length,
  };
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
