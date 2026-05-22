// lib/db/repos/events — persistent federation event log.
//
// Mirrors the in-memory event bus shape but reads/writes to
// civicos.federation_events via the publish_event RPC. When the substrate
// isn't configured, calls become no-ops and the bus stays memory-only.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { FederationEventRow } from '@/lib/db/types';

export interface PersistedEvent {
  id: string;
  type: string;
  source: string;
  target: string | null;
  channel: string;
  payload: Record<string, unknown>;
  at: number;
}

function fromRow(r: FederationEventRow): PersistedEvent {
  return {
    id: r.id,
    type: r.type,
    source: r.source,
    target: r.target,
    channel: r.channel,
    payload: r.payload,
    at: r.at_ms,
  };
}

export async function publishEventRow(
  type: string, source: string, channel: string,
  payload: Record<string, unknown> = {}, target: string | null = null,
): Promise<PersistedEvent | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_publish_event', {
    p_type: type, p_source: source, p_channel: channel,
    p_payload: payload, p_target: target,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] publish_event RPC failed:', error.message, error.code);
    return null;
  }
  if (!data) return null;
  return fromRow(data as FederationEventRow);
}

export async function eventById(id: string): Promise<PersistedEvent | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_federation_events')
    .select('*').eq('id', id).limit(1).maybeSingle();
  if (error || !data) return null;
  return fromRow(data as FederationEventRow);
}

export async function recentEventsRows(
  opts: { type?: string; channel?: string; source?: string; limit?: number } = {},
): Promise<PersistedEvent[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_federation_events').select('*');
  if (opts.type) q = q.eq('type', opts.type);
  if (opts.channel) q = q.eq('channel', opts.channel);
  if (opts.source) q = q.eq('source', opts.source);
  const { data, error } = await q.order('at', { ascending: false }).limit(opts.limit ?? 100);
  if (error || !data) return [];
  return (data as FederationEventRow[]).map(fromRow);
}

export { substrateAvailable };

/* ── Outbound event webhooks (platform-tier) ──────────────────────── */

export interface EventWebhook {
  id: string;
  channel: string;
  url: string;
  description: string | null;
  active: boolean;
  cursorAtMs: number;
  lastDeliveredAt: string | null;
  deliveredCount: number;
  failures: number;
  lastError: string | null;
  pausedReason: string | null;
  createdAt: string;
}

interface EventWebhookRow {
  id: string; channel: string; url: string; description: string | null;
  active: boolean; cursor_at_ms: number; last_delivered_at: string | null;
  delivered_count: number; failures: number; last_error: string | null;
  paused_reason: string | null; created_at: string;
}

function mapWebhook(r: EventWebhookRow): EventWebhook {
  return {
    id: r.id, channel: r.channel, url: r.url, description: r.description,
    active: r.active, cursorAtMs: Number(r.cursor_at_ms),
    lastDeliveredAt: r.last_delivered_at, deliveredCount: Number(r.delivered_count),
    failures: r.failures, lastError: r.last_error,
    pausedReason: r.paused_reason ?? null, createdAt: r.created_at,
  };
}

/** List webhooks (secret-free) for a platform-tier session. [] otherwise. */
export async function listEventWebhooksRows(): Promise<EventWebhook[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_list_event_webhooks');
  if (error || !data) return [];
  return (data as EventWebhookRow[]).map(mapWebhook);
}

/** Register a webhook. Returns the new id, or null on failure (incl.
 *  insufficient privilege). The secret never round-trips back. */
export async function registerEventWebhookRow(opts: {
  channel: string; url: string; secret: string; description?: string | null;
}): Promise<string | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_register_event_webhook', {
    p_channel: opts.channel, p_url: opts.url, p_secret: opts.secret,
    p_description: opts.description ?? null,
  });
  if (error || !data) return null;
  return data as string;
}

/** Pause / resume a webhook (platform-tier). Returns true on success. */
export async function setEventWebhookActiveRow(id: string, active: boolean): Promise<boolean> {
  const sb = publicClient();
  if (!sb) return false;
  const { data, error } = await sb.rpc('civicos_set_event_webhook_active', {
    p_id: id, p_active: active,
  });
  return !error && data === true;
}

/* ── Webhook delivery log (platform-tier, read-only) ──────────────── */

export interface WebhookDelivery {
  id: string;
  channel: string;
  delivered: number;
  ok: boolean;
  detail: string | null;
  cursorBefore: number;
  cursorAfter: number;
  attemptedAt: string;
}

interface WebhookDeliveryRow {
  id: string; channel: string; delivered: number; ok: boolean; detail: string | null;
  cursor_before: number; cursor_after: number; attempted_at: string;
}

/** Recent delivery-run summaries for one webhook (most recent first). */
export async function listWebhookDeliveriesRows(webhookId: string, limit = 20): Promise<WebhookDelivery[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_list_webhook_deliveries', {
    p_webhook_id: webhookId, p_limit: limit,
  });
  if (error || !data) return [];
  return (data as WebhookDeliveryRow[]).map(r => ({
    id: r.id, channel: r.channel, delivered: r.delivered, ok: r.ok, detail: r.detail,
    cursorBefore: Number(r.cursor_before), cursorAfter: Number(r.cursor_after),
    attemptedAt: r.attempted_at,
  }));
}
