export function stripNoise(root: Element, selectors: string[]): void {
  for (const sel of selectors) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }
}
