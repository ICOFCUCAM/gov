// Prometheus scrape endpoint (lib/ops/metrics.ts). With CIVICOS_METRICS_TOKEN
// set, the scraper sends it as a bearer token; without it, a signed-in
// official may read the metrics (or anyone, outside enforce mode).
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { collect, render } from '@/lib/ops/metrics';
import { currentOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export async function GET(req: NextRequest) {
  const token = process.env.CIVICOS_METRICS_TOKEN;
  if (token) {
    const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!given || !same(given, token)) return NextResponse.json({ error: 'Send the metrics token as a bearer token' }, { status: 401 });
  } else if (process.env.CIVICOS_AUTH === 'enforce' && !(await currentOfficial())) {
    return NextResponse.json({ error: 'Sign in, or set CIVICOS_METRICS_TOKEN for the scraper' }, { status: 401 });
  }
  return new NextResponse(render(collect()), { headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8', 'cache-control': 'no-store' } });
}
