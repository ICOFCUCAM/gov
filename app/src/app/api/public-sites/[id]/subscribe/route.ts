// Ask for email updates from a public site (the newsletter box). Works as a
// plain form post (answers with a redirect to /subscriptions) or as JSON.
// Double opt-in: this only queues a confirmation email (lib/data/site-subscriptions.ts),
// in the language the visitor chose on the site.

import { NextRequest, NextResponse } from 'next/server';
import { SITE_IDS, siteContent } from '@/lib/public-sites';
import { publishedOverride } from '@/lib/data/site-editorial';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';
import { subscribe } from '@/lib/data/site-subscriptions';
import { visitorLocale } from '@/apps/_shared/public/site-props';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  const isForm = !(req.headers.get('content-type') ?? '').includes('application/json');
  const body: Record<string, unknown> = isForm
    ? Object.fromEntries(((await req.formData().catch(() => null))?.entries() ?? []) as Iterable<[string, unknown]>)
    : ((await req.json().catch(() => ({}))) as Record<string, unknown>);
  const sender = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || (req.headers.get('x-real-ip') ?? '').trim() || 'unknown';
  // A field people never see: filled only by bots, which get the usual answer and nothing happens.
  const r = typeof body.website === 'string' && body.website
    ? { ok: true as const }
    : subscribe(params.id, String(body.email ?? ''), { sender, locale: await visitorLocale(), siteName: fillDeep(siteContent(params.id, publishedOverride(params.id)).institution.name, siteTokens(new Date().getFullYear())) });
  const status = 'ok' in r ? 'check' : r.error;
  if (isForm) return NextResponse.redirect(new URL(`/subscriptions?site=${params.id}&status=${status}`, req.url), 303);
  return NextResponse.json('ok' in r ? { ok: true } : { error: status }, { status: 'ok' in r ? 200 : status === 'busy' ? 429 : 422 });
}
