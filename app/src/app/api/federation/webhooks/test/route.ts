// /api/federation/webhooks/test — send a synthetic signed ping to one
// registered federation webhook, so an operator can confirm an endpoint
// is reachable and validates the HMAC signature BEFORE relying on it for
// real events.
//
// The ping is out-of-band: it does NOT advance the delivery cursor and a
// failure does NOT count toward the circuit breaker. It simply reports the
// HTTP result back to the caller.
//
// Auth: platform-tier officer session OR CIVICOS_CRON_SECRET. The secret
// lives only in the service-role-readable table, so the signing happens
// server-side here — the browser never sees it.

import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { serverClient } from '@/lib/db/client';
import { platformOrCronAuthorized } from '@/lib/platform-auth';

export const dynamic = 'force-dynamic';

const PING_TIMEOUT_MS = 5000;

interface WebhookRow { id: string; channel: string; url: string; secret: string; active: boolean; }

export async function POST(req: Request) {
  if (!await platformOrCronAuthorized(req)) {
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const signature = createHmac('sha256', w.secret).update(reqBody).digest('hex');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(w.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-civicos-event-id': event.id,
        'x-civicos-signature': `sha256=${signature}`,
        'x-civicos-ping': 'true',
      },
      body: reqBody,
      signal: controller.signal,
    });
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      detail: `HTTP ${res.status}`,
      at: event.at,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      status: 0,
      detail: e instanceof Error ? e.message : 'fetch failed',
      at: event.at,
    });
  } finally {
    clearTimeout(timer);
  }
}
