import type { SiteProfile, ArticleData, ArticleBlock } from '../types';

/**
 * RedNote (Xiaohongshu / RED) extractor — JSON-first.
 *
 * The DOM-rendered note body is brittle and surrounded by anti-scraping noise
 * (comment trees, recommended notes, ICP footer). Instead, the canonical note
 * lives in `window.__INITIAL_STATE__.note.noteDetailMap[id].note` — a fully
 * structured object with title, desc, imageList, tagList, ipLocation, user.
 *
 * Reading from JSON also bypasses XHS's WebP image proxy: imageList carries
 * deterministic CDN URLs that the agent (or Notion's image fetcher) can
 * actually load.
 */
export const xhs: SiteProfile = {
  name: 'xhs',
  match: (url) =>
    /^https?:\/\/www\.xiaohongshu\.com\/explore\//.test(url) ||
    /^https?:\/\/www\.xiaohongshu\.com\/discovery\/item\//.test(url),
  detect: (doc, url) => (readNote(doc, noteIdFromUrl(url))?.type === 'video' ? 'video' : 'note'),
  extract(doc, url): ArticleData | null {
    const note = readNote(doc, noteIdFromUrl(url));
    if (!note) return null;

    const tags = ((note.tagList ?? []) as Array<{ name?: string }>)
      .map((t) => t?.name)
      .filter((n): n is string => !!n);
    const body = buildBody(note, tags);

    return {
      source: 'xhs',
      contentType: note.type === 'video' ? 'video' : 'note',
      title: note.title || '',
      author: {
        displayName: note.user?.nickname ?? '',
        handle: note.user?.userId ? `@${note.user.userId}` : '',
      },
      publishedDate: note.time ? new Date(note.time).toISOString() : '',
      url,
      body,
      site: 'RedNote',
      siteHandle: note.user?.userId,
      tags,
      location: note.ipLocation || undefined,
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
    Location:  { type: 'rich_text' },
  },
};

interface XhsNote {
  title?: string;
  desc?: string;
  type?: string;
  time?: number;
  ipLocation?: string;
  user?: { nickname?: string; userId?: string };
  imageList?: Array<{ urlDefault?: string; urlPre?: string; url?: string; fileId?: string } | string>;
  video?: {
    cover?: string | { urlDefault?: string };
    firstFrameFileid?: string;
    consumer?: { originVideoKey?: string };
  };
  tagList?: Array<{ name?: string }>;
}

function readNote(doc: Document, preferredId: string | null): XhsNote | null {
  for (const s of Array.from(doc.querySelectorAll('script'))) {
    const text = s.textContent ?? '';
    if (!text.includes('__INITIAL_STATE__')) continue;
    const m = text.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*(?:;|$)/);
    if (!m) continue;
    try {
      // XHS sometimes inlines the literal `undefined` (invalid JSON). Patch
      // both `:undefined` (object value) and bare `undefined` tokens (array slots).
      const patched = m[1]
        .replace(/:\s*undefined/g, ':null')
        .replace(/(?<=[\[,\s])undefined(?=[\],\s])/g, 'null');
      const state = JSON.parse(patched);
      const map = state?.note?.noteDetailMap;
      if (!map) continue;
      // Prefer the note ID from the URL when present; fall back to the first
      // map entry. XHS occasionally caches multiple previously-viewed notes
      // in the same hydrated state, so insertion order is non-deterministic.
      const ids = Object.keys(map);
      const id = (preferredId && ids.includes(preferredId)) ? preferredId : ids[0];
      const note = map[id]?.note as XhsNote | undefined;
      if (note) return note;
    } catch {
      // Try the next script tag
    }
  }
  return null;
}

function noteIdFromUrl(url: string): string | null {
  const m = url.match(/\/(?:explore|discovery\/item)\/([a-f0-9]+)/i);
  return m?.[1] ?? null;
}

function buildBody(note: XhsNote, tags: string[]): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];

  const desc = stripInlineTagMarkers(note.desc ?? '', tags).trim();
  if (desc) {
    for (const line of desc.split(/\n+/)) {
      const t = line.trim();
      if (t) blocks.push({ type: 'paragraph', richText: [{ text: t }] });
    }
  }

  const imgs = note.imageList ?? [];
  for (let i = 0; i < imgs.length; i++) {
    const url = pickImageUrl(imgs[i]);
    if (url) blocks.push({ type: 'image', url, altText: `image-${i + 1}` });
  }

  if (note.type === 'video') {
    const poster = pickImageUrl(
      typeof note.video?.cover === 'object' ? note.video.cover : undefined,
    ) ?? pickImageUrl(imgs[0]);
    const sourceUrl = note.video?.consumer?.originVideoKey
      ? `https://sns-video-bd.xhscdn.com/${note.video.consumer.originVideoKey}`
      : undefined;
    if (poster || sourceUrl) blocks.push({ type: 'video', posterUrl: poster, sourceUrl });
  }

  return blocks;
}

function pickImageUrl(img: unknown): string | undefined {
  if (!img) return undefined;
  if (typeof img === 'string') return img.startsWith('http') ? img : undefined;
  const obj = img as { urlDefault?: string; urlPre?: string; url?: string; fileId?: string };
  return obj.urlDefault || obj.urlPre || obj.url || obj.fileId || undefined;
}

function stripInlineTagMarkers(desc: string, tags: string[]): string {
  // XHS desc inlines `#tagName[话题]#` markers in the text; once we have
  // structured tags, strip them so the body stays clean for agents.
  let out = desc;
  for (const t of tags) {
    const re = new RegExp(`#${escapeReg(t)}\\[话题\\]#`, 'g');
    out = out.replace(re, '');
  }
  return out.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
