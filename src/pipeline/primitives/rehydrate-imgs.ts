const DEFAULT_LAZY_ATTRS = ['data-src', 'data-actualsrc', 'data-original', 'data-original-src', 'data-lazy-src'];

export function rehydrateImages(root: Element, attrs: string[] = DEFAULT_LAZY_ATTRS): void {
  const imgs = root.querySelectorAll('img');
  imgs.forEach((img) => {
    const currentSrc = img.getAttribute('src') ?? '';
    if (currentSrc.startsWith('http')) return;
    for (const attr of attrs) {
      const v = img.getAttribute(attr);
      if (v && v.startsWith('http')) {
        img.setAttribute('src', v);
        return;
      }
    }
  });
}
