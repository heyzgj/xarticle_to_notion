import { getSettings } from '../../utils/storage';
import type { DestinationAdapter } from './base';
import { NotionAdapter } from './notion';
import { ObsidianAdapter } from './obsidian';

// Returns all configured and active destination adapters.
// Notion is active by default if configured; Obsidian requires explicit opt-in.
export async function getActiveAdapters(): Promise<DestinationAdapter[]> {
  const settings = await getSettings();
  const adapters: DestinationAdapter[] = [];

  const notionConfigured = !!(settings?.notionApiToken && settings?.databaseId);
  const obsidianConfigured = !!(settings?.obsidian?.apiKey);

  const active = settings?.activeDestinations;

  // If no explicit activeDestinations set, default to Notion only (backwards compat)
  if (!active) {
    if (notionConfigured) adapters.push(new NotionAdapter());
    return adapters;
  }

  if (active.includes('notion') && notionConfigured) adapters.push(new NotionAdapter());
  if (active.includes('obsidian') && obsidianConfigured) adapters.push(new ObsidianAdapter());

  return adapters;
}
