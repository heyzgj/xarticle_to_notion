import type { SiteProfile, ArticleData } from '../types';
import { rehydrateImages } from '../primitives/rehydrate-imgs';
import { stripNoise } from '../primitives/strip-noise';
import { htmlToBlocks } from '../primitives/html-to-blocks';

const ZHIHU_NOISE = [
  '.RichContent-actions',
  '.ContentItem-actions',
  '.Voters',
  '.Reward',
  '.AnswerSource',
  '.RichContent-EntityWord',
  '.ContentItem-meta',
  '.AdblockBanner',
];

const ZHIHU_LAZY_ATTRS = ['data-actualsrc', 'data-original', 'data-src'];

export const zhihu: SiteProfile = {
  name: 'zhihu',
  match: (url) =>
    /^https?:\/\/zhuanlan\.zhihu\.com\/p\//.test(url) ||
    /^https?:\/\/(www\.)?zhihu\.com\/question\/\d+\/answer\//.test(url),
  detect: (_doc, url) => (/\/question\//.test(url) ? 'answer' : 'article'),
  extract(doc, url): ArticleData | null {
    rehydrateImages(doc.documentElement, ZHIHU_LAZY_ATTRS);

    const body = doc.querySelector('.Post-RichText, .RichText.ztext') as HTMLElement | null;
    if (!body) return null;

    stripNoise(body, ZHIHU_NOISE);

    const title = firstNonEmpty(
      meta(doc, 'og:title'),
      text(doc.querySelector('.Post-Title')),
      text(doc.querySelector('.QuestionHeader-title')),
      doc.title,
    );
    const author = firstNonEmpty(
      doc.querySelector('meta[itemprop="name"]')?.getAttribute('content') ?? '',
      text(doc.querySelector('.AuthorInfo-name')),
      text(doc.querySelector('.UserLink-link')),
    );
    const publishedDate =
      doc.querySelector('meta[itemprop="datePublished"]')?.getAttribute('content') ??
      new Date().toISOString();

    const tags = uniq(
      Array.from(doc.querySelectorAll('.Post-topicsAndReviewer .Tag, .QuestionTopic .Tag'))
        .map((el) => text(el))
        .filter(Boolean),
    );

    const isAnswer = /\/question\//.test(url);

    return {
      source: 'zhihu',
      contentType: isAnswer ? 'answer' : 'article',
      title,
      author: { displayName: author, handle: '' },
      publishedDate,
      url,
      body: htmlToBlocks(body),
      site: 'Zhihu',
      tags,
    };
  },
  notionSchema: {
    Title:     { type: 'title' },
    Author:    { type: 'rich_text' },
    Site:      { type: 'select' },
    Published: { type: 'date' },
    URL:       { type: 'url' },
    Type:      { type: 'select' },
    Tags:      { type: 'multi_select' },
  },
};

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function meta(doc: Document, name: string): string {
  const el = doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
  return el?.getAttribute('content') ?? '';
}

function firstNonEmpty(...vals: string[]): string {
  for (const v of vals) if (v) return v;
  return '';
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
