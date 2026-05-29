interface Env {
  NOTION_CLIENT_ID: string;
  NOTION_CLIENT_SECRET: string;
  // Comma-separated list of extension IDs allowed to receive tokens.
  // MUST be set (wrangler.toml [vars]) — includes your unpacked dev ID and the
  // published Web Store ID. If empty, every request is rejected (fail closed).
  ALLOWED_EXTENSION_IDS: string;
}

function allowedIds(env: Env): string[] {
  return (env.ALLOWED_EXTENSION_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// state = base64(JSON({ e: extensionId, n: nonce })) — round-tripped through
// Notion so the extension can (a) confirm the callback is for itself and
// (b) verify the nonce it generated, defeating login-CSRF / token injection.
function encodeState(extensionId: string, nonce: string): string {
  return btoa(JSON.stringify({ e: extensionId, n: nonce }));
}
function decodeState(state: string): { e: string; n: string } | null {
  try {
    const obj = JSON.parse(atob(state)) as { e?: unknown; n?: unknown };
    if (typeof obj.e === 'string' && typeof obj.n === 'string') return { e: obj.e, n: obj.n };
  } catch {
    /* fall through */
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allow = allowedIds(env);

    if (url.pathname === '/auth') {
      const extensionId = url.searchParams.get('extension_id');
      const nonce = url.searchParams.get('nonce');
      if (!extensionId || !nonce) {
        return new Response('Missing extension_id or nonce', { status: 400 });
      }
      // Fail closed: only known extension IDs may start a flow.
      if (!allow.includes(extensionId)) {
        return new Response('Unknown extension_id', { status: 403 });
      }
      const redirectUri = `${url.origin}/callback`;
      const state = encodeState(extensionId, nonce);
      const notionAuthUrl =
        `https://api.notion.com/v1/oauth/authorize?client_id=${env.NOTION_CLIENT_ID}` +
        `&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}`;
      return Response.redirect(notionAuthUrl, 302);
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !state) {
        return new Response('Missing code or state', { status: 400 });
      }
      const decoded = decodeState(state);
      if (!decoded) {
        return new Response('Invalid state', { status: 400 });
      }
      // Token can only ever be delivered to an allowlisted extension.
      if (!allow.includes(decoded.e)) {
        return new Response('Unknown extension_id', { status: 403 });
      }

      const redirectUri = `${url.origin}/callback`;
      const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`)}`,
        },
        body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        return new Response(`OAuth failed: ${error}`, { status: 500 });
      }

      const data = (await tokenResponse.json()) as {
        access_token: string;
        workspace_name: string;
        workspace_id: string;
      };

      // Deliver via URL FRAGMENT (#), not query string: the fragment is never
      // sent to any server, so the token stays out of redirect-chain logs and
      // browser history. The nonce lets the extension verify the flow it started.
      const params = new URLSearchParams({
        access_token: data.access_token,
        workspace_name: data.workspace_name,
        workspace_id: data.workspace_id,
        nonce: decoded.n,
      });
      const extensionUrl = `chrome-extension://${decoded.e}/welcome.html#${params.toString()}`;
      return Response.redirect(extensionUrl, 302);
    }

    return new Response('Not found', { status: 404 });
  },
};
