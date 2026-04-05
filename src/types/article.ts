export interface ArticleData {
  title: string;
  author: {
    displayName: string;
    handle: string;
  };
  publishedDate: string;
  url: string;
  body: ArticleBlock[];
}

export type ArticleBlock =
  | { type: 'heading_1'; text: string }
  | { type: 'heading_2'; text: string }
  | { type: 'heading_3'; text: string }
  | { type: 'paragraph'; richText: RichTextSegment[] }
  | { type: 'image'; url: string; altText?: string }
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
