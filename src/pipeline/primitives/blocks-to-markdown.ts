import type { ArticleBlock } from '../types';

export function blocksToMarkdown(blocks: ArticleBlock[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading_1': lines.push(`# ${b.text}`); break;
      case 'heading_2': lines.push(`## ${b.text}`); break;
      case 'heading_3': lines.push(`### ${b.text}`); break;
      case 'paragraph': {
        const rendered = b.richText.map((rt) => {
          let t = rt.text;
          if (rt.href) t = `[${t}](${rt.href})`;
          if (rt.bold) t = `**${t}**`;
          if (rt.italic) t = `*${t}*`;
          return t;
        }).join('');
        if (rendered.trim()) lines.push(rendered);
        break;
      }
      case 'image': lines.push(`![${b.altText ?? ''}](${b.url})`); break;
      case 'video': lines.push(`[Video](${b.sourceUrl ?? b.posterUrl ?? ''})`); break;
      case 'bulleted_list_item': lines.push(`- ${b.text}`); break;
      case 'numbered_list_item': lines.push(`1. ${b.text}`); break;
      case 'quote': lines.push(`> ${b.text.split('\n').join('\n> ')}`); break;
      case 'divider': lines.push('---'); break;
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
