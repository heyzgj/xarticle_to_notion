export type DestinationId = 'notion' | 'obsidian' | 'lark';

export interface SaveOptions {
  category: string;
  tags: string[];
}

export interface SaveResult {
  success: boolean;
  pageUrl?: string;
  error?: string;
  duplicate?: boolean;
  existingUrl?: string;
  destination?: DestinationId;
}
