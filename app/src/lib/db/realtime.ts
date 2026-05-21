// lib/db/realtime — subscribe to substrate changes via Supabase Realtime.
//
// The v1 substrate added every event-bearing civicos.* table to the
// supabase_realtime publication. We subscribe through PostgREST's
// realtime channel, and Postgres RLS filters events the same way it
// filters reads — a subscriber only receives changes to rows they are
// entitled to see. This means surfaces auto-update at the right scope
// without any client-side filtering.

import { publicClient } from '@/lib/db/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface SubscribeOptions {
  /** civicos table name. */
  table: 'work_items' | 'work_item_steps' | 'federation_events'
       | 'audit_entries' | 'directives' | 'dispatches'
       | 'escalations' | 'posture_history'
       | 'telemetry_streams' | 'telemetry_samples'
       | 'service_requests' | 'consents' | 'appeals';
  event?: RealtimeEvent;
  /** Optional filter, e.g. `ref=eq.WI-X`. */
  filter?: string;
  /** Unique channel suffix when multiple subscribers want the same table. */
  channelKey?: string;
}

/** Subscribe to a civicos table's realtime stream. Returns the
 *  unsubscribe function. No-op when the substrate isn't configured. */
export function subscribeRealtime(
  opts: SubscribeOptions,
  handler: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
): () => void {
  const sb = publicClient();
  if (!sb) return () => { /* noop */ };

  const name = `civicos:${opts.table}${opts.channelKey ? ':' + opts.channelKey : ''}`;
  const channel = sb.channel(name);
  channel.on(
    'postgres_changes' as never,
    {
      event: opts.event ?? '*',
      schema: 'civicos',
      table: opts.table,
      ...(opts.filter ? { filter: opts.filter } : {}),
    } as never,
    handler as never,
  ).subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
}
