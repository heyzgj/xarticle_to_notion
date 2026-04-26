import type { SiteProfile, ArticleData } from '../types';
import { rehydrateImages } from '../primitives/rehydrate-imgs';
import { stripNoise } from '../primitives/strip-noise';
import { htmlToBlocks } from '../primitives/html-to-blocks';

const WECHAT_NOISE = [
  '.rich_media_tool',
  '.weapp_text_link',
  '.js_wx_tap_highlight',
  '.reward_area',
  '.qr_code_pc_outer',
  'mp-common-profile',
  'mpvoice',
  'mp-style-type',
];

export const wechat: SiteProfile = {
  name: 'wechat',
  match: (url) => /^https?:\/\/mp\.weixin\.qq\.com\/s\//.test(url),
  detect: () => 'article',
  extract(doc, url): ArticleData | null {
    const body = doc.querySelector('#js_content') as HTMLElement | null;
    if (!body) return null;

    rehydrateImages(body, ['data-src']);
    stripNoise(body, WECHAT_NOISE);

    const title = firstNonEmpty(
      text(doc.querySelector('#activity-name')),
      meta(doc, 'og:title'),
      doc.title,
    );
    const accountName = text(doc.querySelector('#js_name'));
    const rawPublished = text(doc.querySelector('#publish_time'));
    const publishedDate = normalizeCnDate(rawPublished);

    return {
      source: 'wechat',
      contentType: 'article',
      title,
      author: { displayName: accountName, handle: '' },
      publishedDate,
      url,
      body: htmlToBlocks(body),
      site: 'WeChat Official Accounts',
      siteHandle: accountName || undefined,
    };
  },
  notionSchema: {
    Title:     { type: 'title' },
    Author:    { type: 'rich_text' },
    Site:      { type: 'select' },
    Published: { type: 'date' },
    URL:       { type: 'url' },
    Type:      { type: 'select' },
  },
};

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function meta(doc: Document, property: string): string {
  const el = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
  return el?.getAttribute('content') ?? '';
}

function firstNonEmpty(...vals: string[]): string {
  for (const v of vals) if (v) return v;
  return '';
}

function normalizeCnDate(s: string): string {
  const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}):(\d{2}))?/);
  if (!m) return s || new Date().toISOString();
  const [, y, mo, d, hh = '00', mm = '00'] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm}:00+08:00`;
}
