export interface Env {
  ASSETS?: Fetcher;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/v1/health' && request.method === 'GET') {
      return Response.json(
        {
          status: 'ok',
          service: 'synesis-api',
          version: '0.1.0',
          timestamp: new Date().toISOString(),
        },
        { headers: jsonHeaders },
      );
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json(
        { error: 'not_implemented', message: 'This Synesis API endpoint is not implemented yet.' },
        { status: 404, headers: jsonHeaders },
      );
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);

    return new Response('Synesis frontend assets have not been deployed yet.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};