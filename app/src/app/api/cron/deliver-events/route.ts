// Outbound federation webhook delivery worker.
//
// For each active civicos.event_webhooks row, finds federation events on
// its channel newer than its cursor and POSTs each to the registered URL
// with an HMAC-SHA256 signature header. On an all-2xx run the cursor
// advances to the last delivered event's at_ms; on the first failure the
// cursor holds (so the next run retries from the same point) and the
// failure is recorded.
//
// Every POST goes through the platform's safe fetch (go-live review M-5):
// public addresses only unless the nation allows its own network
// (CIVICOS_WEBHOOKS_PRIVATE=1), redirects never followed.
//
// Auth: CIVICOS_CRON_SECRET via ?token=… or Authorization: Bearer.
// Delivery is at-least-once per cursor; consumers dedupe on event id.
// Cadence: recommended every 1–5 minutes.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { serverClient } from '@/lib/db/client';
import { postSubstrateWebhook } from '@/lib/events/substrate-webhook';

export const dynamic = 'force-dynamic';

const PER_RUN_LIMIT = 50;     // events per webhook per run

interface WebhookRow {
  id: string; channel: string; url: string; secret: string; cursor_at_ms: number;
}
interface EventRow {
  id: string; type: string; source: string; target: string | null;
  channel: string; payload: unknown; at: string; at_ms: number;
}

/** The cron secret, compared in constant time (lib/platform-auth.ts). */
const authorized = (req: Request): boolean => cronAuthorized(req);

/** Deliver one event through the platform's safe fetch (lib/events/substrate-webhook.ts):
 *  public addresses only unless CIVICOS_WEBHOOKS_PRIVATE=1, no redirects. True on a 2xx. */
async function deliver(url: string, secret: string, event: EventRow): Promise<{ ok: boolean; detail: string }> {
  const body = JSON.stringify({
    id: event.id, type: event.type, source: event.source, target: event.target,
    channel: event.channel, payload: event.payload, at: event.at, at_ms: event.at_ms,
  });
  return postSubstrateWebhook(url, secret, body, { 'x-civicos-event-id': event.id });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  // service_role bypasses RLS — read the configs (incl. secret) directly.
  const { data: webhooks, error: whErr } = await sb
    .schema('civicos' as never).from('event_webhooks')
    .select('id,channel,url,secret,cursor_at_ms').eq('active', true);
  if (whErr) return NextResponse.json({ error: whErr.message }, { status: 500 });

  const results: { id: string; channel: string; delivered: number; failed: boolean; detail: string | null }[] = [];

  for (const w of (webhooks ?? []) as WebhookRow[]) {
    const { data: events, error: evErr } = await sb
      .from('civicos_federation_events').select('*')
      .eq('channel', w.channel).gt('at_ms', w.cursor_at_ms)
      .order('at_ms', { ascending: true }).limit(PER_RUN_LIMIT);
    if (evErr) {
      results.push({ id: w.id, channel: w.channel, delivered: 0, failed: true, detail: evErr.message });
      continue;
    }
    const rows = (events ?? []) as EventRow[];
    let delivered = 0;
    let lastOkAtMs = w.cursor_at_ms;
    let lastOkId: string | null = null;
    let failureDetail: string | null = null;

    for (const ev of rows) {
      const { ok, detail } = await deliver(w.url, w.secret, ev);
      if (!ok) { failureDetail = `event ${ev.id}: ${detail}`; break; }
      delivered += 1;
      lastOkAtMs = ev.at_ms;
      lastOkId = ev.id;
    }

    if (delivered > 0) {
      await sb.rpc('civicos_mark_webhook_delivered', {
        p_id: w.id, p_last_event_id: lastOkId, p_cursor_at_ms: lastOkAtMs, p_delivered: delivered,
      });
    }
    if (failureDetail) {
      await sb.rpc('civicos_record_webhook_failure', { p_id: w.id, p_error: failureDetail });
    }
    // Log a run summary only when something happened, so the delivery
    // history doesn't fill with empty no-op rows on idle channels.
    if (delivered > 0 || failureDetail) {
      await sb.rpc('civicos_record_webhook_delivery_attempt', {
        p_webhook_id: w.id, p_channel: w.channel, p_delivered: delivered,
        p_ok: !failureDetail, p_detail: failureDetail,
        p_cursor_before: w.cursor_at_ms, p_cursor_after: lastOkAtMs,
      });
    }
    results.push({ id: w.id, channel: w.channel, delivered, failed: !!failureDetail, detail: failureDetail });
  }

  return NextResponse.json({
    ok: results.every(r => !r.failed),
    at: new Date().toISOString(),
    webhooks_processed: results.length,
    total_delivered: results.reduce((s, r) => s + r.delivered, 0),
    results,
  });
}

export const POST = GET;
