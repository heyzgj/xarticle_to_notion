export interface ObsidianSettings {
  apiKey: string;
  host: string;        // default: https://127.0.0.1:27124
  vaultFolder: string; // default: Engram
}

export interface ExtensionSettings {
  notionApiToken: string;
  databaseId: string;
  workspaceName?: string;
  workspaceId?: string;
  databaseName?: string;
  obsidian?: ObsidianSettings;
  activeDestinations?: Array<'notion' | 'obsidian'>;
}
