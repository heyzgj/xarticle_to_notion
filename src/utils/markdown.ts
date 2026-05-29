import type { ArticleData, ArticleBlock, RichTextSegment } from '../types/article';

// Converts ArticleData to Markdown with YAML frontmatter.
// Used by the Obsidian destination adapter and the clipboard envelope
// (post-save hand-off to AI agents — the markdown body is the payload).

export function articleToMarkdown(
  article: ArticleData,
  opts?: { notionUrl?: string }
): string {
  const date = new Date().toISOString().split('T')[0];
  const published = article.publishedDate.split('T')[0];
  const tags = ['lope', article.source, article.contentType];
  const tagsYaml = tags.map(t => `  - ${t}`).join('\n');

  const frontmatterLines = [
    '---',
    `title: ${yamlString(article.title)}`,
    `author: ${yamlString(article.author.displayName)}`,
    `handle: ${yamlString(article.author.handle)}`,
    `source: ${article.source}`,
    `type: ${article.contentType}`,
    `url: ${article.url}`,
    opts?.notionUrl ? `notion_url: ${opts.notionUrl}` : null,
    `published: ${published}`,
    `saved: ${date}`,
    article.tweetCount != null ? `tweet_count: ${article.tweetCount}` : null,
    article.quotedTweet
      ? `quoted_author: ${yamlString(article.quotedTweet.author.handle)}`
      : null,
    article.quotedTweet?.url
      ? `quoted_url: ${article.quotedTweet.url}`
      : null,
    `tags:\n${tagsYaml}`,
    '---',
  ].filter(Boolean).join('\n');

  const bodyLines = blocksToMarkdown(article.body);

  // Body is pure ground truth — no duplicate H1 header (title lives in frontmatter).
  if (article.quotedTweet) {
    const q = article.quotedTweet;
    const quotedHeader = `**↳ Quoted post by ${q.author.displayName} ${q.author.handle}**`;
    const quotedBody = blocksToMarkdown(q.body)
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n');
    return `${frontmatterLines}\n\n${bodyLines}\n\n---\n\n${quotedHeader}\n\n${quotedBody}`;
  }

  return `${frontmatterLines}\n\n${bodyLines}`;
}

function blocksToMarkdown(blocks: ArticleBlock[]): string {
  return blocks.map(blockToMarkdown).join('\n\n');
}

function blockToMarkdown(block: ArticleBlock): string {
  switch (block.type) {
    case 'heading_1': return `# ${block.text}`;
    case 'heading_2': return `## ${block.text}`;
    case 'heading_3': return `### ${block.text}`;
    case 'paragraph':  return richTextToMarkdown(block.richText);
    case 'image':      return `![${block.altText ?? ''}](${block.url})`;
    case 'video': {
      const url = block.tweetUrl ?? block.sourceUrl ?? '';
      return url ? `[Video](${url})` : '[Video]';
    }
    case 'bulleted_list_item': return `- ${block.text}`;
    case 'numbered_list_item': return `1. ${block.text}`;
    case 'quote':   return block.text.split('\n').map(l => `> ${l}`).join('\n');
    case 'divider': return '---';
  }
}

function isSafeHref(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function richTextToMarkdown(segments: RichTextSegment[]): string {
  return segments.map(seg => {
    let text = seg.text;
    if (seg.bold)      text = `**${text}**`;
    if (seg.italic)    text = `*${text}*`;
    if (seg.underline) text = `<u>${text}</u>`;
    // Only emit http(s) links. A page-supplied javascript:/data: href would
    // otherwise become a click-executable link once pasted into an AI chat or
    // Obsidian — gate it the same way the Notion path does.
    if (seg.href && isSafeHref(seg.href)) text = `[${text}](${seg.href})`;
    return text;
  }).join('');
}

// Slugify a title for use as a filename.
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '') || 'untitled';
}

// Wrap a string in YAML double quotes, escaping internal quotes.
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
