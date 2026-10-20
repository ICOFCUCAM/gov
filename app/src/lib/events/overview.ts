// The event outbox at a glance (/gov/exchange/events): for each webhook
// subscription its cursor, how many events wait for it, its recent delivery
// attempts and its last result; the restore epoch and the events a data
// restore voided (docs/DISASTER_RECOVERY.md). Read only: delivery is the
// scheduled job's (/api/cron/deliver-cloudevents); a failed event is retried
// on its next run, in audit order. Events are listed by type, time and
// sequence only: never the actor, subject or detail they carry.

import { outboxDb, topicMatches, type CloudEvent, type Delivery } from './outbox';
import type { WebhookSubscription } from '@/lib/api/types';
import { listWebhooks } from '@/lib/data/store';

export interface ConsumerOverview {
  id: string;
  topic: string;
  /** The receiving address's host only. */
  host: string;
  status: WebhookSubscription['status'];
  /** The audit sequence delivered up to. */
  cursor: number;
  /** Events past the cursor for its topic, not voided. */
  pending: number;
  oldestPendingAt?: string;
  delivered: number;
  failed: number;
  lastAttempt?: { at: string; ok: boolean; detail: string };
  /** Consecutive failed runs (resets on success). */
  failures: number;
}

export interface OutboxOverview {
  epoch: number;
  events: { kept: number; voided: number; byEpoch: { epoch: number; count: number }[]; oldestAt?: string; newestAt?: string };
  /** Events voided by each restore (the backup restored from). */
  voidedBy: { backup: string; count: number }[];
  consumers: ConsumerOverview[];
  /** Cursors kept for subscriptions no longer registered. */
  orphanCursors: { id: string; cursor: number }[];
  recentEvents: { id: string; type: string; time: string; auditseq: number; restoreepoch: number; voided?: string }[];
  recentDeliveries: Delivery[];
}

const hostOf = (url: string) => { try { return new URL(url).host; } catch { return '—'; } };

export function buildOutboxOverview(src: { events: CloudEvent[]; cursors: Record<string, number>; deliveries: Delivery[]; epoch?: number; webhooks: WebhookSubscription[] }, limit = 50): OutboxOverview {
  const byEpoch = new Map<number, number>();
  const voidedBy = new Map<string, number>();
  let voided = 0;
  for (const e of src.events) {
    const ep = e.restoreepoch ?? 0;
    byEpoch.set(ep, (byEpoch.get(ep) ?? 0) + 1);
    if (e.voided) { voided++; voidedBy.set(e.voided, (voidedBy.get(e.voided) ?? 0) + 1); }
  }
  const consumers = src.webhooks.map<ConsumerOverview>(w => {
    const cursor = src.cursors[w.id] ?? 0;
    const waiting = src.events.filter(e => !e.voided && e.auditseq > cursor && topicMatches(w.topic, e.type));
    const mine = src.deliveries.filter(d => d.webhookId === w.id);
    const last = mine[mine.length - 1];
    return {
      id: w.id, topic: w.topic, host: hostOf(w.url), status: w.status, cursor, pending: waiting.length,
      ...(waiting[0] ? { oldestPendingAt: waiting[0].time } : {}),
      delivered: mine.filter(d => d.ok).length, failed: mine.filter(d => !d.ok).length,
      ...(last ? { lastAttempt: { at: last.at, ok: last.ok, detail: last.detail.slice(0, 200) } } : {}),
      failures: w.failures ?? 0,
    };
  });
  const known = new Set(src.webhooks.map(w => w.id));
  const n = Math.min(Math.max(limit, 1), 200);
  return {
    epoch: src.epoch ?? 0,
    events: {
      kept: src.events.length, voided,
      byEpoch: [...byEpoch].map(([epoch, count]) => ({ epoch, count })).sort((a, b) => a.epoch - b.epoch),
      ...(src.events[0] ? { oldestAt: src.events[0].time, newestAt: src.events[src.events.length - 1]!.time } : {}),
    },
    voidedBy: [...voidedBy].map(([backup, count]) => ({ backup, count })),
    consumers,
    orphanCursors: Object.entries(src.cursors).filter(([id]) => !known.has(id)).map(([id, cursor]) => ({ id, cursor })),
    recentEvents: src.events.slice(-n).reverse().map(e => ({ id: e.id, type: e.type, time: e.time, auditseq: e.auditseq, restoreepoch: e.restoreepoch ?? 0, ...(e.voided ? { voided: e.voided } : {}) })),
    recentDeliveries: src.deliveries.slice(-n).reverse().map(d => ({ ...d, detail: d.detail.slice(0, 200) })),
  };
}

/** The outbox as it stands now. */
export function outboxOverview(limit = 50): OutboxOverview {
  const d = outboxDb();
  return buildOutboxOverview({ events: d.events, cursors: d.cursors, deliveries: d.deliveries, ...(d.epoch !== undefined ? { epoch: d.epoch } : {}), webhooks: listWebhooks() }, limit);
}
