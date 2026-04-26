// Pipeline types — separate from src/types/article.ts during the M1 transition.
// Day 2 (X port) will reconcile this with the existing ArticleData.

export type PlatformId =
  | 'x' | 'wechat' | 'xhs' | 'zhihu'
  | 'substack' | 'medium' | 'reddit' | 'youtube'
  | 'generic';

export type ContentKind =
  | 'article' | 'thread' | 'tweet' | 'quote_tweet'
  | 'note' | 'video' | 'answer';

export interface RichTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  href?: string;
}

export type ArticleBlock =
  | { type: 'heading_1'; text: string }
  | { type: 'heading_2'; text: string }
  | { type: 'heading_3'; text: string }
  | { type: 'paragraph'; richText: RichTextSegment[] }
  | { type: 'image'; url: string; altText?: string }
  | { type: 'video'; posterUrl?: string; sourceUrl?: string; tweetUrl?: string }
  | { type: 'bulleted_list_item'; text: string }
  | { type: 'numbered_list_item'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'divider' };

export interface PipelineArticleData {
  platform: PlatformId;
  contentType: ContentKind;
  url: string;
  title: string;
  author: string;
  site: string;
  siteHandle?: string;
  published: string;
  body: ArticleBlock[];
  tags?: string[];
  location?: string;
  tweetCount?: number;
}

export interface NotionPropertySpec {
  type: 'title' | 'rich_text' | 'select' | 'multi_select' | 'date' | 'url' | 'number';
}

export interface SiteProfile {
  name: PlatformId;
  match: (url: string) => boolean;
  detect?: (doc: Document, url: string) => ContentKind;
  extract: (doc: Document, url: string) => PipelineArticleData | null;
  notionSchema?: Record<string, NotionPropertySpec>;
}

export interface Pipeline {
  profiles: SiteProfile[];
  fallback?: SiteProfile;
  run(doc: Document, url: string): PipelineArticleData | null;
}
