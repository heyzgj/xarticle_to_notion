import type { ArticleBlock, RichTextSegment } from '../types';

const BLOCK_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'HR',
  'IMG', 'FIGURE', 'VIDEO',
]);

export function htmlToBlocks(root: Element): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];

  walk(root);
  return dedupe(blocks);

  function walk(node: Node): void {
    if (node.nodeType === 1) {
      const el = node as Element;
      const tag = el.tagName;

      switch (tag) {
        case 'H1': return pushHeading(el, 1);
        case 'H2': return pushHeading(el, 2);
        case 'H3': case 'H4': case 'H5': case 'H6': return pushHeading(el, 3);
        case 'P': return pushParagraph(el);
        case 'BLOCKQUOTE': return pushQuote(el);
        case 'HR': blocks.push({ type: 'divider' }); return;
        case 'IMG': return pushImage(el);
        case 'FIGURE': return pushFigure(el);
        case 'UL': return pushList(el, 'bulleted_list_item');
        case 'OL': return pushList(el, 'numbered_list_item');
        case 'PRE': return pushPre(el);
        case 'VIDEO': return pushVideo(el);
        case 'SCRIPT': case 'STYLE': case 'NOSCRIPT': return;
      }
      // Inline-only element with text content: treat as implicit paragraph
      if (hasOnlyInlineContent(el) && el.textContent?.trim()) {
        pushParagraph(el);
        return;
      }
      // Container — recurse
      for (const child of Array.from(el.childNodes)) walk(child);
      return;
    }
    if (node.nodeType === 3) {
      // Bare text-node fallback: emits when a profile feeds us a container with mixed
      // block + raw-text children. Profiles should normally pre-scope to a clean body
      // element; this branch is just a safety net.
      const t = (node.textContent ?? '').trim();
      if (t) blocks.push({ type: 'paragraph', richText: [{ text: t }] });
    }
  }

  function pushHeading(el: Element, level: 1 | 2 | 3): void {
    const text = collapseText(el);
    if (!text) return;
    blocks.push({ type: level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3', text });
  }

  function pushParagraph(el: Element): void {
    // Images nested inside a paragraph emit as their own block first.
    // Known limitation: when a <p> mixes <img> and inline text, the original
    // inline-flow ordering is lost — image always emits before its surrounding text.
    // Acceptable for v0 since agent-first body is order-by-block, not byte-by-byte.
    const imgs = el.querySelectorAll('img');
    if (imgs.length > 0) {
      imgs.forEach((img) => pushImage(img));
    }
    const rich = collectRichText(el);
    const text = rich.map((r) => r.text).join('').trim();
    if (text) blocks.push({ type: 'paragraph', richText: rich });
  }

  function pushQuote(el: Element): void {
    const text = collapseText(el);
    if (text) blocks.push({ type: 'quote', text });
  }

  function pushImage(el: Element): void {
    const src = el.getAttribute('src') ?? '';
    if (!src.startsWith('http')) return;
    const alt = el.getAttribute('alt') ?? undefined;
    blocks.push({ type: 'image', url: src, altText: alt });
  }

  function pushFigure(el: Element): void {
    const img = el.querySelector('img');
    if (img) pushImage(img);
    const caption = el.querySelector('figcaption');
    if (caption) {
      const t = collapseText(caption);
      if (t) blocks.push({ type: 'paragraph', richText: [{ text: t, italic: true }] });
    }
  }

  function pushList(el: Element, type: 'bulleted_list_item' | 'numbered_list_item'): void {
    const items = el.querySelectorAll(':scope > li');
    items.forEach((li) => {
      // Emit own text without nested-list contamination, then recurse into children.
      // ArticleBlock has no nesting depth, so nested lists flatten to the same level —
      // good enough for Notion/Obsidian, which both render flat.
      const cloned = li.cloneNode(true) as Element;
      cloned.querySelectorAll('ul, ol').forEach((n) => n.remove());
      const text = collapseText(cloned);
      if (text) blocks.push({ type, text });
      li.querySelectorAll(':scope > ul').forEach((child) => pushList(child, 'bulleted_list_item'));
      li.querySelectorAll(':scope > ol').forEach((child) => pushList(child, 'numbered_list_item'));
    });
  }

  function pushPre(el: Element): void {
    const text = el.textContent ?? '';
    if (text.trim()) blocks.push({ type: 'quote', text: text.trim() });
  }

  function pushVideo(el: Element): void {
    const poster = el.getAttribute('poster') ?? undefined;
    const source = el.getAttribute('src') ?? el.querySelector('source')?.getAttribute('src') ?? undefined;
    if (!poster && !source) return;
    blocks.push({ type: 'video', posterUrl: poster, sourceUrl: source });
  }
}

function hasOnlyInlineContent(el: Element): boolean {
  for (const child of Array.from(el.children)) {
    if (BLOCK_TAGS.has(child.tagName)) return false;
  }
  return true;
}

function collapseText(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function collectRichText(el: Element): RichTextSegment[] {
  const out: RichTextSegment[] = [];
  visit(el, {});
  return mergeSegments(out);

  function visit(node: Node, attrs: Partial<RichTextSegment>): void {
    if (node.nodeType === 3) {
      const text = node.textContent ?? '';
      if (text) out.push({ ...attrs, text });
      return;
    }
    if (node.nodeType !== 1) return;
    const e = node as Element;
    const tag = e.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IMG') return;
    const nextAttrs: Partial<RichTextSegment> = { ...attrs };
    if (tag === 'STRONG' || tag === 'B') nextAttrs.bold = true;
    if (tag === 'EM' || tag === 'I') nextAttrs.italic = true;
    if (tag === 'U') nextAttrs.underline = true;
    if (tag === 'A') {
      const href = e.getAttribute('href') ?? undefined;
      if (href) nextAttrs.href = href;
    }
    if (tag === 'BR') { out.push({ ...attrs, text: '\n' }); return; }
    for (const c of Array.from(e.childNodes)) visit(c, nextAttrs);
  }
}

function mergeSegments(segs: RichTextSegment[]): RichTextSegment[] {
  const out: RichTextSegment[] = [];
  for (const s of segs) {
    if (!s.text) continue;
    const last = out[out.length - 1];
    if (last && sameAttrs(last, s)) last.text += s.text;
    else out.push({ ...s });
  }
  return out.map((s) => ({ ...s, text: s.text.replace(/[ \t]+/g, ' ') }));
}

function sameAttrs(a: RichTextSegment, b: RichTextSegment): boolean {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && a.href === b.href;
}

function dedupe(blocks: ArticleBlock[]): ArticleBlock[] {
  const out: ArticleBlock[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (b.type === 'paragraph' && b.richText.every((r) => !r.text.trim())) continue;
    if (prev?.type === 'image' && b.type === 'image' && prev.url === b.url) continue;
    out.push(b);
  }
  return out;
}
