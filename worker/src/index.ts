interface Env {
  NOTION_CLIENT_ID: string;
  NOTION_CLIENT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      const extensionId = url.searchParams.get('extension_id');
      if (!extensionId) {
        return new Response('Missing extension_id', { status: 400 });
      }
      const state = extensionId;
      const redirectUri = `${url.origin}/callback`;
      const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${env.NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      return Response.redirect(notionAuthUrl, 302);
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const extensionId = url.searchParams.get('state');
      if (!code || !extensionId) {
        return new Response('Missing code or state', { status: 400 });
      }

      const redirectUri = `${url.origin}/callback`;
      const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`)}`,
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        return new Response(`OAuth failed: ${error}`, { status: 500 });
      }

      const data = await tokenResponse.json() as {
        access_token: string;
        workspace_name: string;
        workspace_id: string;
      };

      const params = new URLSearchParams({
        access_token: data.access_token,
        workspace_name: data.workspace_name,
        workspace_id: data.workspace_id,
      });
      const extensionUrl = `chrome-extension://${extensionId}/welcome.html?${params.toString()}`;
      return Response.redirect(extensionUrl, 302);
    }

    return new Response('Not found', { status: 404 });
  },
};
