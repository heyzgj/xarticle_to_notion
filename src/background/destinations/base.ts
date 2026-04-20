import type { ArticleData } from '../../types/article';
import type { DestinationId, SaveOptions, SaveResult } from '../../types/destinations';

export interface DestinationAdapter {
  readonly id: DestinationId;
  readonly displayName: string;
  isConfigured(): Promise<boolean>;
  save(article: ArticleData, opts: SaveOptions): Promise<SaveResult>;
  getCategories(): Promise<string[]>;
  checkDuplicate(url: string): Promise<{ isDuplicate: boolean; existingUrl?: string }>;
}
