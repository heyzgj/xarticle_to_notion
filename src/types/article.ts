export type Source = 'x' | 'substack' | 'medium' | 'reddit' | 'youtube';

export type ContentType = 'article' | 'thread' | 'tweet' | 'quote_tweet';

export interface QuotedTweet {
  author: { displayName: string; handle: string };
  url?: string;
  body: ArticleBlock[];
}

export interface ArticleData {
  source: Source;
  contentType: ContentType;
  title: string;
  author: { displayName: string; handle: string };
  publishedDate: string;
  url: string;
  body: ArticleBlock[];
  tweetCount?: number;       // threads only
  quotedTweet?: QuotedTweet; // quote_tweet only
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

export interface RichTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  href?: string;
}
