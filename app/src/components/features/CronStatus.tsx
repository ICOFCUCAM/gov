'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listTelemetryStreamsRows, recentTelemetrySamplesRows } from '@/lib/db/repos/telemetry';
import { substrateAvailable } from '@/lib/db/client';
import type { TelemetryStreamRow, TelemetrySampleRow } from '@/lib/db/types';
import { ageMinutes } from '@/lib/format';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

const KNOWN_CRONS = [
  {
    name: 'substrate-metrics',
    description: 'Defines substrate.* streams and appends a sample per metric',
    sentinelStream: 'substrate.work_items.open',
    expectedIntervalMin: 10,
    path: '/api/cron/substrate-metrics',
  },
  {
    name: 'sla',
    description: 'Sweeps stale service requests and escalates them',
    sentinelStream: 'substrate.sla.escalated',
    expectedIntervalMin: 60,
    path: '/api/cron/sla',
  },
  {
    name: 'posture-digest',
    description: 'Computes per-charter posture and records a snapshot',
    sentinelStream: null,
    expectedIntervalMin: 30,
    path: '/api/cron/posture-digest',
  },
  {
    name: 'audit-self',
    description: 'Heartbeat audit entry on substrate:self scope',
    sentinelStream: null,
    expectedIntervalMin: 60,
    path: '/api/cron/audit-self',
  },
  {
    name: 'witness-sweep',
    description: 'Substrate-self witness attestations on every audit scope',
    sentinelStream: null,
    expectedIntervalMin: 15,
    path: '/api/cron/witness-sweep',
  },
  {
    name: 'witness-divergence',
    description: 'Tamper-detection watchdog. Escalates any witness↔chain disagreement.',
    sentinelStream: null,
    expectedIntervalMin: 15,
    path: '/api/cron/witness-divergence',
  },
  {
    name: 'audit-anchor',
    description: 'Broadcasts every chain head as a federation audit.anchor event (constitutional channel).',
    sentinelStream: null,
    expectedIntervalMin: 10,
    path: '/api/cron/audit-anchor',
  },
];

/**
 * CronStatus — derive last-run timing for each scheduled worker.
 * substrate-metrics emits its own telemetry samples, so the most
 * recent sample timestamp on substrate.work_items.open is a proxy
 * for "when did the cron last fire". SLA worker doesn't emit
 * telemetry per run today; surfaced as "no telemetry signal".
 */
export function CronStatus() {
  const { ready } = useIdentity();
  const [streams, setStreams] = React.useState<TelemetryStreamRow[]>([]);
  const [samples, setSamples] = React.useState<Map<string, TelemetrySampleRow[]>>(new Map());
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const all = await listTelemetryStreamsRows({ activeOnly: true, limit: 50 });
    setStreams(all);
    const wanted = KNOWN_CRONS.map(c => c.sentinelStream).filter((x): x is string => !!x);
    const map = new Map<string, TelemetrySampleRow[]>();
    await Promise.all(wanted.map(async id => {
      map.set(id, await recentTelemetrySamplesRows(id, 5));
    }));
    setSamples(map);
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'telemetry_samples' as const }], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Cron status" />;
  }

  function staleness(samples: TelemetrySampleRow[] | undefined, expectedMin: number): { lastAt: number | null; ageMin: number | null; stale: boolean } {
    if (!samples || samples.length === 0) return { lastAt: null, ageMin: null, stale: true };
    const lastAt = new Date(samples[0]!.ts).getTime();
    const ageMin = ageMinutes(lastAt);
    return { lastAt, ageMin, stale: ageMin > expectedMin * 2 };
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Cron status" badge="derived from telemetry" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { void refresh(); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            refresh
          </button>
          <span className="font-mono text-[10px] text-ink-muted">
            {streams.filter(s => s.stream_id.startsWith('substrate.')).length} substrate streams
          </span>
        </div>
      </div>

      <Panel title="Scheduled workers" meta={`${KNOWN_CRONS.length}`} bodyClass="!p-0">
        {KNOWN_CRONS.map(c => {
          const stat = c.sentinelStream ? staleness(samples.get(c.sentinelStream), c.expectedIntervalMin) : { lastAt: null, ageMin: null, stale: true };
          const tone = stat.stale ? TONE.alert : TONE.ok;
          return (
            <div key={c.name} className="border-b border-line-soft px-3 py-2 last:border-0 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-32 shrink-0 truncate font-mono text-link">{c.name}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{c.description}</span>
                <span className="w-32 shrink-0 truncate text-right font-mono text-ink-muted">{c.path}</span>
                <span className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider" style={{ color: tone }}>
                  {c.sentinelStream ? (stat.stale ? 'stale' : 'live') : 'no signal'}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                <span>expected every {c.expectedIntervalMin}m</span>
                {stat.lastAt ? (
                  <>
                    <span>· last ran {stat.ageMin}m ago</span>
                    <span>· {new Date(stat.lastAt).toLocaleString()}</span>
                  </>
                ) : <span>· no sample seen on sentinel stream</span>}
              </div>
            </div>
          );
        })}
      </Panel>

      <Panel title="Substrate self-metrics streams" meta={`${streams.filter(s => s.stream_id.startsWith('substrate.')).length}`} bodyClass="!p-0">
        {streams.filter(s => s.stream_id.startsWith('substrate.')).map(s => (
          <div key={s.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
            <span className="w-44 shrink-0 truncate font-mono text-link">{s.stream_id}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{s.label}</span>
            <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink-muted">
              {s.warn_threshold != null ? `w${s.warn_threshold}` : ''}
            </span>
            <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink-muted">
              {s.alert_threshold != null ? `a${s.alert_threshold}` : ''}
            </span>
          </div>
        ))}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Cron secret: <span className="font-mono">CIVICOS_CRON_SECRET</span> env
        var. Recipes for Vercel Cron / Supabase pg_cron in supabase/README.md.
      </p>
    </div>
  );
}
