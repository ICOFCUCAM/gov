// The services of a public site as a small frameable page, for a ministry in
// Embed mode to place on its existing website:
//   <iframe src="https://<platform>/embed/health/services" title="Online services"></iframe>
// Only the ministry's registered website may frame it (CSP frame-ancestors).
// Plain HTML with escaped text and no scripts; each link opens the service on
// the platform in the top window.

import { NextResponse } from 'next/server';
import { SITE_IDS } from '@/lib/public-sites';
import { effectiveContent } from '@/lib/public-sites/effective';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';
import { siteHref } from '@/apps/_shared/public/site-props';
import { nationMessages } from '@/lib/nation/registry';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function GET(req: Request, { params }: { params: { site: string } }) {
  if (!SITE_IDS.includes(params.site)) return new NextResponse('Not found', { status: 404 });
  const { content, settings } = effectiveContent(params.site);
  const c = fillDeep(content, siteTokens(new Date().getFullYear()));
  const origin = new URL(req.url).origin;
  const t = nationMessages().site;
  const items = c.quickServices.map(q =>
    `<li><a target="_top" href="${esc(new URL(siteHref(params.site, q.to), origin).href)}"><span class="dot" style="background:${esc(/^#[0-9a-f]{3,8}$/i.test(q.color) ? q.color : '#1f5fad')}"></span><span><b>${esc(q.title)}</b><small>${esc(q.subtitle)}</small></span><i aria-hidden="true">→</i></a></li>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.institution.name)} — ${esc(t.iWantTo)}</title>
<style>body{margin:0;font:14px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1a2332;background:transparent}h2{font-size:16px;margin:0 0 8px}ul{list-style:none;margin:0;padding:0;display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}a{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #dde3ec;border-radius:8px;background:#fff;color:inherit;text-decoration:none}a:hover{border-color:#1f5fad}.dot{width:10px;height:10px;border-radius:50%;flex:none}b{display:block;font-weight:600}small{display:block;color:#64748b;font-size:12px}i{margin-left:auto;color:#1f5fad;font-style:normal}footer{margin-top:8px;font-size:11px;color:#94a3b8}</style></head>
<body><h2>${esc(t.iWantTo)}</h2><ul>${items}</ul><footer>${esc(c.institution.name)} · online services</footer></body></html>`;
  const ancestors = settings.mode === 'embed' && settings.website ? `'self' ${new URL(settings.website).origin}` : `'self'`;
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': `default-src 'none'; style-src 'unsafe-inline'; frame-ancestors ${ancestors}; base-uri 'none'; form-action 'none'`,
      'cache-control': 'public, max-age=300',
    },
  });
}
