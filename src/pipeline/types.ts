// Pipeline interfaces. The data shape itself (ArticleData / ArticleBlock /
// RichTextSegment) lives in src/types/article.ts — the canonical type used by
// destinations, popup, and the chrome.runtime message bus. We re-export the
// data types here so profile authors only import from one place.

export type {
  ArticleBlock,
  ArticleData,
  ContentType,
  QuotedTweet,
  RichTextSegment,
  Source,
} from '../types/article';

import type { ArticleData, ContentType, Source } from '../types/article';

export interface NotionPropertySpec {
  type: 'title' | 'rich_text' | 'select' | 'multi_select' | 'date' | 'url' | 'number';
}

export interface SiteProfile {
  name: Source;
  match: (url: string) => boolean;
  detect?: (doc: Document, url: string) => ContentType;
  extract: (doc: Document, url: string) => ArticleData | null;
  notionSchema?: Record<string, NotionPropertySpec>;
}

export interface Pipeline {
  profiles: SiteProfile[];
  fallback?: SiteProfile;
  run(doc: Document, url: string): ArticleData | null;
}
