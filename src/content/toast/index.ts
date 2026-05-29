import type { Message, ToastKind } from '../../types/messages';

/**
 * Toast content script — listens for SHOW_TOAST messages from the background
 * service worker and renders an in-page toast inside a Shadow DOM root, fully
 * isolated from the host page's CSS.
 *
 * Injected on demand by the background's quick-save orchestrator via
 * chrome.scripting.executeScript. Idempotent: a window-scoped guard prevents
 * the listener from registering twice when the script is re-injected on the
 * same tab during one service-worker lifetime.
 */

declare global {
  interface Window {
    __lopeToastLoaded?: boolean;
  }
}

if (!window.__lopeToastLoaded) {
  window.__lopeToastLoaded = true;

  const ROOT_ID = '__lope_toast_root__';
  let dismissTimer: number | null = null;

  function ensureShadow(): ShadowRoot {
    let root = document.getElementById(ROOT_ID) as HTMLDivElement | null;
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      // Reset every inheritable property + max z-index so site CSS can't bleed in.
      root.setAttribute(
        'style',
        'all: initial; position: fixed; top: 16px; right: 16px; z-index: 2147483647; pointer-events: none;',
      );
      document.documentElement.appendChild(root);
      root.attachShadow({ mode: 'open' });
    }
    return root.shadowRoot!;
  }

  function dismiss(): void {
    const root = document.getElementById(ROOT_ID);
    if (root) root.remove();
    if (dismissTimer !== null) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
  }

  function scheduleDismiss(kind: ToastKind): void {
    if (dismissTimer !== null) clearTimeout(dismissTimer);
    if (kind === 'pending') {
      // Safety bound — if completion never arrives, kill the toast after 15s.
      dismissTimer = window.setTimeout(dismiss, 15_000);
      return;
    }
    const ms = kind === 'error' ? 4_000 : 2_500;
    dismissTimer = window.setTimeout(dismiss, ms);
  }

  function copyToClipboard(text: string): boolean {
    // Legacy textarea + execCommand('copy') — synchronous and works in
    // content scripts on focused pages without needing the user-gesture
    // propagation that navigator.clipboard.writeText() requires. Toast is
    // rendered after a Chrome-command gesture, which doesn't always cleanly
    // attach to async clipboard.writeText from a content-script context.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  function render(text: string, kind: ToastKind, clipboardText: string | undefined): void {
    const shadow = ensureShadow();
    shadow.innerHTML = '';

    let displayText = text;
    if (clipboardText && kind === 'success') {
      displayText = copyToClipboard(clipboardText) ? `${text} · Copied` : text;
    }

    const style = document.createElement('style');
    style.textContent = `
      :host, * { box-sizing: border-box; }
      .toast {
        pointer-events: auto;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        max-width: 320px;
        padding: 10px 14px;
        background: #1A1916;
        color: #F3F1EA;
        border-radius: 12px;
        font: 13px/1.4 'Geist', -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        letter-spacing: 0.01em;
        box-shadow: 0 8px 24px rgba(26,25,22,0.24), 0 1px 0 rgba(255,255,255,0.05) inset;
        animation: lope-toast-in 180ms cubic-bezier(0.2, 0.7, 0.2, 1);
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .dot.pending {
        background: #D98A2B;
        animation: lope-toast-pulse 1.2s ease-in-out infinite;
      }
      .dot.info { background: #8C867A; }
      .dot.success { background: #D98A2B; }
      .dot.error { background: #C0492F; }
      .text {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @keyframes lope-toast-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: none; }
      }
      @keyframes lope-toast-pulse {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.4; }
      }
    `;
    shadow.appendChild(style);

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const dot = document.createElement('span');
    dot.className = `dot ${kind}`;
    toast.appendChild(dot);

    const textEl = document.createElement('span');
    textEl.className = 'text';
    textEl.textContent = displayText;
    toast.appendChild(textEl);

    shadow.appendChild(toast);
    scheduleDismiss(kind);
  }

  chrome.runtime.onMessage.addListener((message: Message) => {
    if (message.type !== 'SHOW_TOAST') return;
    render(message.text, message.kind ?? 'info', message.clipboardText);
    // No response needed — fire-and-forget from background.
  });
}
