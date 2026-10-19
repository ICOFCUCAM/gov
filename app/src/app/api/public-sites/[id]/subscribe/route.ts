// Ask for email updates from a public site (the newsletter box). Works as a
// plain form post (answers with a redirect to /subscriptions) or as JSON.
// Double opt-in: this only queues a confirmation email (lib/data/site-subscriptions.ts),
// in the language the visitor chose on the site.

import { readForm, readJson, TOO_LARGE, tooLargeAnswer } from '@/lib/net/body-limit';
import { NextRequest, NextResponse } from 'next/server';
import { SITE_IDS, siteContent } from '@/lib/public-sites';
import { publishedOverride } from '@/lib/data/site-editorial';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';
import { subscribe } from '@/lib/data/site-subscriptions';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { clientAddress } from '@/lib/ops/rate-limit-core';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  const isForm = !(req.headers.get('content-type') ?? '').includes('application/json');
  // A public form of a few fields: read with a 16 kB cap (lib/net/body-limit.ts, review L-4).
  const read = isForm ? await readForm(req, 16_000) : await readJson(req, 16_000);
  if (read === TOO_LARGE) return tooLargeAnswer(16_000, 'The request');
  const body: Record<string, unknown> = read instanceof FormData
    ? Object.fromEntries(read.entries() as Iterable<[string, unknown]>)
    : (read && typeof read === 'object' ? read : {}) as Record<string, unknown>;
  // The same client address every per-address limit uses (trusted proxies counted from the right; review L-1).
  const sender = clientAddress(req.headers);
  // A field people never see: filled only by bots, which get the usual answer and nothing happens.
  const r = typeof body.website === 'string' && body.website
    ? { ok: true as const }
    : subscribe(params.id, String(body.email ?? ''), { sender, locale: await visitorLocale(), siteName: fillDeep(siteContent(params.id, publishedOverride(params.id)).institution.name, siteTokens(new Date().getFullYear())) });
  const status = 'ok' in r ? 'check' : r.error;
  if (isForm) return NextResponse.redirect(new URL(`/subscriptions?site=${params.id}&status=${status}`, req.url), 303);
  return NextResponse.json('ok' in r ? { ok: true } : { error: status }, { status: 'ok' in r ? 200 : status === 'busy' ? 429 : 422 });
}
