export interface NotionRichText {
  type: 'text';
  text: { content: string; link?: { url: string } | null };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    color?: string;
  };
}

export interface NotionBlock {
  object: 'block';
  type: string;
  [key: string]: unknown;
}

export interface NotionSelectOption {
  id?: string;
  name: string;
  color?: string;
}

export interface NotionDatabaseSchema {
  id: string;
  title: Array<{ plain_text: string }>;
  properties: Record<string, {
    id: string;
    type: string;
    select?: { options: NotionSelectOption[] };
    multi_select?: { options: NotionSelectOption[] };
    [key: string]: unknown;
  }>;
}

export interface NotionPage {
  id: string;
  url: string;
}
