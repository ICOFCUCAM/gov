'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  listTelemetryStreamsRows, recentTelemetrySamplesRows, telemetryStreamStats, telemetryStreamSeries,
  type TelemetryStreamStats, type TelemetrySeriesPoint,
} from '@/lib/db/repos/telemetry';
import { substrateAvailable } from '@/lib/db/client';
import { FilterChips } from '@/components/ui/FilterChips';
import type { TelemetryStreamRow, TelemetrySampleRow } from '@/lib/db/types';

const WINDOWS = ['live', '7d', '30d'] as const;
type Win = typeof WINDOWS[number];
const WINDOW_HOURS: Record<Exclude<Win, 'live'>, number> = { '7d': 168, '30d': 720 };
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

/** TelemetryStreamDetail — one stream + its time-series with thresholds.
 *  SVG line chart with warn/alert threshold rules. Reads up to 240
 *  recent samples; subscribes to telemetry_samples Realtime so the
 *  chart updates as new samples land. */
export function TelemetryStreamDetail({ streamId }: { streamId: string }) {
  const { ready } = useIdentity();
  const [stream, setStream] = React.useState<TelemetryStreamRow | null>(null);
  const [samples, setSamples] = React.useState<TelemetrySampleRow[]>([]);
  const [stats, setStats] = React.useState<TelemetryStreamStats | null>(null);
  const [win, setWin] = React.useState<Win>('live');
  const [series, setSeries] = React.useState<TelemetrySeriesPoint[]>([]);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const [all, s, st] = await Promise.all([
      listTelemetryStreamsRows({ limit: 200 }),
      recentTelemetrySamplesRows(streamId, 240),
      telemetryStreamStats(streamId, 24),
    ]);
    setStream(all.find(x => x.stream_id === streamId) ?? null);
    setSamples(s);
    setStats(st);
  }, [available, streamId]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  // Downsampled history for the 7d / 30d windows; 'live' uses raw samples.
  React.useEffect(() => {
    if (!available || win === 'live') { setSeries([]); return; }
    void telemetryStreamSeries(streamId, WINDOW_HOURS[win], 120).then(setSeries);
  }, [available, win, streamId]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'telemetry_samples' as const, filter: `stream_id=eq.${streamId}` },
    ], [streamId]),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Telemetry stream" />;
  }
  if (!stream) {
    return (
      <Panel title="Telemetry stream" meta={streamId} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No stream with id <span className="font-mono">{streamId}</span>.{' '}
          <Link href="/gov/telemetry" className="text-link underline">Back to wall</Link>
        </p>
      </Panel>
    );
  }

  const ordered = [...samples].sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
  // Chart source: raw samples for 'live', downsampled bucket averages otherwise.
  const chartPoints: { ts: string; value: number }[] = win === 'live'
    ? ordered.map(s => ({ ts: s.ts, value: s.value }))
    : series.map(p => ({ ts: p.bucketTs, value: p.avg }));
  const latest = ordered[ordered.length - 1]?.value ?? null;
  const min = Math.min(...chartPoints.map(p => p.value), stream.warn_threshold ?? Infinity, stream.alert_threshold ?? Infinity, 0);
  const max = Math.max(...chartPoints.map(p => p.value), stream.warn_threshold ?? -Infinity, stream.alert_threshold ?? -Infinity, 1);
  const range = Math.max(1, max - min);

  const width = 720, height = 180, padX = 30, padY = 16;
  const innerW = width - 2 * padX, innerH = height - 2 * padY;
  const xFor = (i: number) => padX + (chartPoints.length <= 1 ? innerW / 2 : (i / (chartPoints.length - 1)) * innerW);
  const yFor = (v: number) => padY + (1 - (v - min) / range) * innerH;

  const path = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(' ');
  const warnY = stream.warn_threshold != null ? yFor(stream.warn_threshold) : null;
  const alertY = stream.alert_threshold != null ? yFor(stream.alert_threshold) : null;
  const latestTone = latest == null ? TONE.neutral
    : (stream.alert_threshold != null && latest >= stream.alert_threshold) ? TONE.alert
    : (stream.warn_threshold != null && latest >= stream.warn_threshold) ? TONE.warn
    : TONE.ok;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{stream.label}</h2>
          <span className="font-mono text-[10px] text-link">{stream.stream_id}</span>
          {latest != null ? (
            <span className="rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px]"
              style={{ borderColor: latestTone, color: latestTone }}>
              {latest.toFixed(2)} {stream.unit ?? ''}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <FilterChips label="window:" options={WINDOWS} value={win} onChange={v => setWin(v as Win)} />
          <Link href="/gov/telemetry" className="font-mono text-[10px] text-link underline">← wall</Link>
        </div>
      </div>

      <Panel title="Time series"
        meta={win === 'live' ? `${ordered.length} samples · live` : `${chartPoints.length} buckets · ${win}`}
        bodyClass="!p-3">
        {chartPoints.length === 0 ? (
          <p className="text-[11px] text-ink-muted">{win === 'live' ? 'No samples yet.' : 'No samples in this window.'}</p>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label="telemetry chart">
            {/* axis baseline */}
            <line x1={padX} x2={width - padX} y1={height - padY} y2={height - padY}
                  stroke="rgb(var(--c-line))" strokeWidth="0.5" />
            {/* thresholds */}
            {warnY != null ? (
              <g>
                <line x1={padX} x2={width - padX} y1={warnY} y2={warnY}
                      stroke={TONE.warn} strokeWidth="0.5" strokeDasharray="3 3" />
                <text x={padX + 2} y={warnY - 2} fontSize="9" fill={TONE.warn} fontFamily="ui-monospace, monospace">warn {stream.warn_threshold}</text>
              </g>
            ) : null}
            {alertY != null ? (
              <g>
                <line x1={padX} x2={width - padX} y1={alertY} y2={alertY}
                      stroke={TONE.alert} strokeWidth="0.5" strokeDasharray="3 3" />
                <text x={padX + 2} y={alertY - 2} fontSize="9" fill={TONE.alert} fontFamily="ui-monospace, monospace">alert {stream.alert_threshold}</text>
              </g>
            ) : null}
            {/* line */}
            <path d={path} fill="none" stroke={TONE.link} strokeWidth="1.2" />
            {/* sample dots */}
            {chartPoints.map((p, i) => (
              <circle key={`${p.ts}:${i}`} cx={xFor(i)} cy={yFor(p.value)} r="1.6" fill={
                stream.alert_threshold != null && p.value >= stream.alert_threshold ? TONE.alert
                : stream.warn_threshold != null && p.value >= stream.warn_threshold ? TONE.warn
                : TONE.ok
              }>
                <title>{`${p.value} @ ${new Date(p.ts).toLocaleString()}`}</title>
              </circle>
            ))}
          </svg>
        )}
      </Panel>

      {stats ? (
        <Panel title="Statistics (last 24h)" meta={`${stats.samples} samples`} bodyClass="!p-3">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 text-center">
            <StatCell label="min" value={fmt(stats.min)} unit={stream.unit} />
            <StatCell label="median" value={fmt(stats.median)} unit={stream.unit} />
            <StatCell label="avg" value={fmt(stats.avg)} unit={stream.unit} />
            <StatCell label="p95" value={fmt(stats.p95)} unit={stream.unit} />
            <StatCell label="max" value={fmt(stats.max)} unit={stream.unit} />
            <StatCell label="σ" value={fmt(stats.stddev)} unit={stream.unit} />
          </div>
          {(stats.warnBreaches > 0 || stats.alertBreaches > 0) ? (
            <p className="mt-2 font-mono text-[10px]">
              {stats.alertBreaches > 0 ? <span style={{ color: TONE.alert }}>{stats.alertBreaches} alert breaches</span> : null}
              {stats.alertBreaches > 0 && stats.warnBreaches > 0 ? <span className="text-ink-muted"> · </span> : null}
              {stats.warnBreaches > 0 ? <span style={{ color: TONE.warn }}>{stats.warnBreaches} warn breaches</span> : null}
              <span className="text-ink-muted"> in 24h</span>
            </p>
          ) : (
            <p className="mt-2 font-mono text-[10px]" style={{ color: TONE.ok }}>no threshold breaches in 24h</p>
          )}
        </Panel>
      ) : null}

      <Panel title="Recent samples" meta={`${ordered.length}`} bodyClass="!p-0">
        {ordered.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No samples on file.</p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            {[...ordered].reverse().slice(0, 80).map(s => (
              <div key={s.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1 last:border-0 text-[10px]">
                <span className="w-44 shrink-0 truncate font-mono tabular-nums text-ink-muted">
                  {new Date(s.ts).toLocaleString()}
                </span>
                <span className="min-w-0 flex-1 font-mono tabular-nums text-ink">{s.value}</span>
                <span className="w-20 shrink-0 truncate text-right font-mono text-ink-muted">{stream.unit ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function fmt(v: number | null): string {
  if (v == null) return '—';
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function StatCell({ label, value, unit }: { label: string; value: string; unit: string | null }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-2 py-1.5">
      <div className="font-mono text-sm tabular-nums text-ink">{value}<span className="text-[9px] text-ink-muted"> {unit ?? ''}</span></div>
      <div className="text-[8.5px] uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}
