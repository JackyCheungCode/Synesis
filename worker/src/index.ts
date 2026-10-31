interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/v1/health') {
      return Response.json(
        { status: 'ok', service: 'synesis', version: '0.2.0' },
        { headers: { 'cache-control': 'no-store' } },
      );
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'not_implemented' }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
