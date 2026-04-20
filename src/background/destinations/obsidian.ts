import { getSettings } from '../../utils/storage';
import { OBSIDIAN_DEFAULT_HOST, OBSIDIAN_DEFAULT_FOLDER } from '../../utils/constants';
import { articleToMarkdown, slugifyTitle } from '../../utils/markdown';
import type { ArticleData } from '../../types/article';
import type { SaveOptions, SaveResult } from '../../types/destinations';
import type { DestinationAdapter } from './base';

export class ObsidianAdapter implements DestinationAdapter {
  readonly id = 'obsidian' as const;
  readonly displayName = 'Obsidian';

  async isConfigured(): Promise<boolean> {
    const s = await getSettings();
    return !!(s?.obsidian?.apiKey);
  }

  async save(article: ArticleData, _opts: SaveOptions): Promise<SaveResult> {
    const settings = await getSettings();
    const obs = settings?.obsidian;
    if (!obs?.apiKey) return { success: false, error: 'Obsidian not configured', destination: 'obsidian' };

    const host = obs.host || OBSIDIAN_DEFAULT_HOST;
    const folder = obs.vaultFolder || OBSIDIAN_DEFAULT_FOLDER;

    const date = new Date().toISOString().split('T')[0];
    const slug = slugifyTitle(article.title);
    const filename = `${date}-${slug}.md`;
    const path = `${folder}/${filename}`;

    const markdown = articleToMarkdown(article);

    try {
      const response = await fetch(`${host}/vault/${encodeURIPath(path)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${obs.apiKey}`,
          'Content-Type': 'text/plain',
        },
        body: markdown,
      });

      if (!response.ok) {
        throw new Error(`Obsidian API error (${response.status})`);
      }

      // Build an obsidian:// URI so the user can open it directly
      const pageUrl = `obsidian://open?path=${encodeURIComponent(path)}`;
      return { success: true, pageUrl, destination: 'obsidian' };
    } catch (e) {
      return { success: false, error: (e as Error).message, destination: 'obsidian' };
    }
  }

  async getCategories(): Promise<string[]> {
    return []; // Obsidian uses tags in frontmatter; no category list to fetch
  }

  async checkDuplicate(url: string): Promise<{ isDuplicate: boolean; existingUrl?: string }> {
    const settings = await getSettings();
    const obs = settings?.obsidian;
    if (!obs?.apiKey) return { isDuplicate: false };

    const host = obs.host || OBSIDIAN_DEFAULT_HOST;
    try {
      // Use Obsidian's simple search to find notes with the source URL
      const response = await fetch(`${host}/search/simple/?query=${encodeURIComponent(url)}`, {
        headers: { 'Authorization': `Bearer ${obs.apiKey}` },
      });
      if (!response.ok) return { isDuplicate: false };

      const results = await response.json() as Array<{ filename: string }>;
      if (results.length > 0) {
        const folder = obs.vaultFolder || OBSIDIAN_DEFAULT_FOLDER;
        const existingUrl = `obsidian://open?path=${encodeURIComponent(folder + '/' + results[0].filename)}`;
        return { isDuplicate: true, existingUrl };
      }
    } catch {
      // Search failure doesn't block saving
    }
    return { isDuplicate: false };
  }
}

// Test the connection to a running Obsidian instance.
export async function testObsidianConnection(apiKey: string, host: string): Promise<{ connected: boolean; error?: string }> {
  try {
    const response = await fetch(`${host}/`, {
      // GET / requires no auth and returns plugin status
    });
    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}` };
    }
    // Verify the API key works by hitting an authenticated endpoint
    const authResponse = await fetch(`${host}/vault/`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!authResponse.ok) {
      return { connected: false, error: 'Invalid API key' };
    }
    return { connected: true };
  } catch (e) {
    const msg = (e as Error).message;
    // Connection refused = Obsidian not running
    if (msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
      return { connected: false, error: 'Obsidian is not running or the Local REST API plugin is not enabled' };
    }
    return { connected: false, error: msg };
  }
}

// Encode a vault path for use in the REST API URL, preserving slashes.
function encodeURIPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}
