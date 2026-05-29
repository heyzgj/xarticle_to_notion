import { OAUTH_WORKER_URL } from './constants';

// CSRF defense for the Notion OAuth flow. We generate a one-time nonce, stash it
// locally, and send it to the worker; the worker round-trips it through Notion's
// `state` and returns it in the redirect. On return we require it to match — so a
// callback the user didn't initiate (token injection / login-CSRF) is rejected.

const NONCE_KEY = 'oauth_nonce';

/** Generate + persist a fresh nonce, return the worker /auth URL to navigate to. */
export async function buildOAuthUrl(): Promise<string> {
  const nonce = crypto.randomUUID();
  await chrome.storage.local.set({ [NONCE_KEY]: nonce });
  const extensionId = chrome.runtime.id;
  return `${OAUTH_WORKER_URL}/auth?extension_id=${encodeURIComponent(extensionId)}&nonce=${encodeURIComponent(nonce)}`;
}

/** Read + clear the stored nonce (one-time use). */
export async function consumeOAuthNonce(): Promise<string | null> {
  const r = await chrome.storage.local.get(NONCE_KEY);
  const n = (r[NONCE_KEY] as string | undefined) ?? null;
  await chrome.storage.local.remove(NONCE_KEY);
  return n;
}
