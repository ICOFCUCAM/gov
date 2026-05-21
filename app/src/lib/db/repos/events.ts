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
