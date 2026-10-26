// Delivering outbox CloudEvents (lib/events/outbox.ts) to the platform's
// webhook subscribers (/integrations → Webhooks), structured mode:
//
//   POST <subscriber url>
//   Content-Type: application/cloudevents+json; charset=utf-8
//   X-CivicOS-Event-Id: <event id>
//   X-CivicOS-Timestamp: <unix seconds>
//   X-CivicOS-Signature: sha256=<hex HMAC-SHA256(secret, `${timestamp}.${body}`)>
//
//   { "specversion": "1.0", "id": …, "source": "/civicos/platform",
//     "type": "org.civicos.facility.publish", "subject": …, "time": …,
//     "datacontenttype": "application/json", "auditseq": …, "data": { … } }
//
// `data` carries the action, the resource reference, the outcome and the
// audit link only: never the actor's name or the entry's free-text detail
// (plan I9, outbox.ts subscriberEvent()).
//
// At least once, in audit order: a webhook's cursor advances past each
// delivered event; the first failure stops that webhook's run (retried next
// run) and counts on the subscription. Addresses are fetched through
// safeFetchText (public addresses only, unless CIVICOS_WEBHOOKS_PRIVATE=1
// allows the nation's own network); redirects are not followed.
//
// A training or demo installation never sends a webhook (spec Part 6 F,
// l.4498 and l.4501; plan I0.2): each event is recorded as a simulated
// delivery (no request made) and the cursor advances, so switching the
// installation to production does not replay a demonstration's events.

import { createHmac } from 'node:crypto';
import { listWebhooks, webhookSigningSecret, noteWebhookDelivery } from '@/lib/data/store';
import { safeFetchText, type SafeFetchOptions } from '@/lib/net/safe-fetch';
import { pendingFor, advanceCursor, recordDelivery, subscriberEvent, type CloudEvent } from './outbox';
import { installationMode, samplesAllowed } from '@/lib/ops/mode';

export const PER_RUN_LIMIT = 50;

export function signDelivery(secret: string, timestamp: number, body: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

export interface DeliveryRun { webhookId: string; topic: string; delivered: number; failed: boolean; detail: string | null; simulated?: boolean }

/** Deliver pending events to every active webhook. `net` overrides fetching (tests). */
export async function deliverOutbox(now = Date.now(), net: Pick<SafeFetchOptions, 'fetch' | 'resolve'> = {}): Promise<DeliveryRun[]> {
  const runs: DeliveryRun[] = [];
  for (const w of listWebhooks().filter(x => x.status === 'active')) {
    const events = pendingFor(w.id, w.topic, PER_RUN_LIMIT);
    if (!events.length) continue;
    if (samplesAllowed()) {
      // Training and demo: recorded, never sent.
      const detail = `simulated: ${installationMode()} installation, nothing sent`;
      for (const ev of events) {
        recordDelivery({ webhookId: w.id, eventId: ev.id, type: ev.type, at: new Date(now).toISOString(), ok: true, detail, simulated: true });
        advanceCursor(w.id, ev.auditseq);
      }
      noteWebhookDelivery(w.id, true, `${events.length} ${detail}`, now);
      runs.push({ webhookId: w.id, topic: w.topic, delivered: events.length, failed: false, detail, simulated: true });
      continue;
    }
    const secret = webhookSigningSecret(w.id);
    if (!secret) {
      const detail = 'No signing secret the platform can read: issue a new secret for this subscription';
      noteWebhookDelivery(w.id, false, detail, now);
      runs.push({ webhookId: w.id, topic: w.topic, delivered: 0, failed: true, detail });
      continue;
    }
    let delivered = 0;
    let failure: string | null = null;
    for (const ev of events) {
      const r = await deliverOne(w.url, secret, ev, now, net);
      recordDelivery({ webhookId: w.id, eventId: ev.id, type: ev.type, at: new Date(now).toISOString(), ok: r.ok, detail: r.detail });
      if (!r.ok) { failure = `${ev.id}: ${r.detail}`; break; }
      advanceCursor(w.id, ev.auditseq);
      delivered++;
    }
    noteWebhookDelivery(w.id, !failure, failure ?? `${delivered} delivered`, now);
    runs.push({ webhookId: w.id, topic: w.topic, delivered, failed: !!failure, detail: failure });
  }
  return runs;
}

async function deliverOne(url: string, secret: string, ev: CloudEvent, now: number, net: Pick<SafeFetchOptions, 'fetch' | 'resolve'>): Promise<{ ok: boolean; detail: string }> {
  // I9: subscribers receive no actor name and no free text (subscriberEvent()).
  const body = JSON.stringify(subscriberEvent(ev));
  const ts = Math.floor(now / 1000);
  try {
    await safeFetchText(url, {
      allow: () => true,
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/cloudevents+json; charset=utf-8',
        'x-civicos-event-id': ev.id,
        'x-civicos-timestamp': String(ts),
        'x-civicos-signature': signDelivery(secret, ts, body),
      },
      timeoutMs: 5000,
      maxBytes: 64_000,
      redirects: 0,
      allowPrivate: process.env.CIVICOS_WEBHOOKS_PRIVATE === '1',
      ...net,
    });
    return { ok: true, detail: 'delivered' };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}
