// /api/federation/webhooks/test — send a synthetic signed ping to one
// registered federation webhook, so an operator can confirm an endpoint
// is reachable and validates the HMAC signature BEFORE relying on it for
// real events.
//
// The ping is out-of-band: it does NOT advance the delivery cursor and a
// failure does NOT count toward the circuit breaker.
//
// Go-live review M-5: the ping goes through the platform's safe fetch
// (lib/events/substrate-webhook.ts: public addresses only unless
// CIVICOS_WEBHOOKS_PRIVATE=1, no redirects), and the answer is coarse —
// delivered or not, never the remote status or error text, so the route
// cannot be used to probe addresses. The reason is logged for operators.
//
// Auth: a platform administrator's substrate session (platform-admin) OR
// CIVICOS_CRON_SECRET; officials through the API are administrators only
// (lib/auth/roles.ts ADMIN_ONLY /api/federation). The secret lives only in
// the service-role-readable table, so the signing happens server-side here —
// the browser never sees it.

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';
import { platformAdminOrCronAuthorized } from '@/lib/platform-auth';
import { postSubstrateWebhook } from '@/lib/events/substrate-webhook';
import { logger } from '@/lib/ops/log';

export const dynamic = 'force-dynamic';

interface WebhookRow { id: string; channel: string; url: string; secret: string; active: boolean; }

export async function POST(req: Request) {
  if (!await platformAdminOrCronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  let id: string;
  try {
    const body = (await req.json()) as { id?: string };
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'expected { id }' }, { status: 400 });
    }
    id = body.id;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  // service_role bypasses RLS — read the single config (incl. secret).
  const { data, error } = await sb
    .schema('civicos' as never).from('event_webhooks')
    .select('id,channel,url,secret,active').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: 'could not read the webhook' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'webhook not found' }, { status: 404 });

  const w = data as WebhookRow;
  const now = new Date();
  const event = {
    id: `ping-${now.getTime()}`,
    type: 'civicos.webhook.ping',
    source: 'civicos.platform',
    target: null,
    channel: w.channel,
    payload: { ping: true, message: 'CivicOS federation webhook connectivity test' },
    at: now.toISOString(),
    at_ms: now.getTime(),
  };
  const reqBody = JSON.stringify(event);
  const r = await postSubstrateWebhook(w.url, w.secret, reqBody, { 'x-civicos-event-id': event.id, 'x-civicos-ping': 'true' });
  if (!r.ok) logger.warn('federation.webhook_test_failed', { webhook: w.id, reason: r.detail });
  return NextResponse.json({
    ok: r.ok,
    detail: r.ok
      ? 'Delivered: the endpoint answered 2xx'
      : 'Not delivered. Check that the address is a public http(s) endpoint (no redirects) that answers 2xx within 5 seconds; the reason is in the platform log.',
    at: event.at,
  });
}
