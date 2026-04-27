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

  function render(text: string, kind: ToastKind, actionUrl: string | undefined): void {
    const shadow = ensureShadow();
    shadow.innerHTML = '';

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
        background: #111;
        color: #f5f5f5;
        border-radius: 8px;
        font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        letter-spacing: 0.01em;
        box-shadow: 0 6px 20px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.04) inset;
        animation: lope-toast-in 180ms cubic-bezier(0.2, 0.7, 0.2, 1);
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .dot.pending {
        background: #777;
        animation: lope-toast-pulse 1.2s ease-in-out infinite;
      }
      .dot.info { background: #888; }
      .dot.success { background: #d4d4d4; }
      .dot.error { background: #b85c5c; }
      .text {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .action {
        color: #d4d4d4;
        cursor: pointer;
        text-decoration: underline;
        text-decoration-color: #555;
        text-underline-offset: 2px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .action:hover { color: #fff; text-decoration-color: #999; }
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
    textEl.textContent = text;
    toast.appendChild(textEl);

    if (actionUrl) {
      const action = document.createElement('span');
      action.className = 'action';
      action.textContent = 'Open';
      action.addEventListener('click', () => {
        window.open(actionUrl, '_blank', 'noopener,noreferrer');
      });
      toast.appendChild(action);
    }

    shadow.appendChild(toast);
    scheduleDismiss(kind);
  }

  chrome.runtime.onMessage.addListener((message: Message) => {
    if (message.type !== 'SHOW_TOAST') return;
    render(message.text, message.kind ?? 'info', message.actionUrl);
    // No response needed — fire-and-forget from background.
  });
}
