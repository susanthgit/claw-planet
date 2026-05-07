/**
 * Cloudflare Pages Function — /api/log-404
 *
 * Logs unknown URL hits to the Pages logs. The 404 page beacons here on load.
 * Visible in the Cloudflare dashboard under the Pages project's logs,
 * or via wrangler tail.
 *
 * Body: { path: string, ref?: string, ua?: string }
 */

interface LogPayload {
  path?: string;
  ref?: string;
  ua?: string;
}

export const onRequestPost: PagesFunction = async (ctx) => {
  let body: LogPayload = {};
  try {
    body = await ctx.request.json();
  } catch {
    body = {};
  }
  const path = String(body.path ?? '').slice(0, 500);
  const ref = String(body.ref ?? '').slice(0, 500);
  const ua = String(body.ua ?? ctx.request.headers.get('user-agent') ?? '').slice(0, 300);
  const country = ctx.request.headers.get('cf-ipcountry') ?? '';
  console.log(`CP_404 path="${path}" ref="${ref}" country="${country}" ua="${ua}"`);
  return new Response('ok', { status: 200, headers: { 'cache-control': 'no-store' } });
};

export const onRequestGet: PagesFunction = async () => {
  return new Response('POST a JSON body with { path } to log a 404.', {
    status: 405,
    headers: { 'cache-control': 'no-store' },
  });
};
