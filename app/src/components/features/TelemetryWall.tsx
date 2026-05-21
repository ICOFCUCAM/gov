'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  defineTelemetryStreamRow, recordTelemetrySampleRow,
  recentTelemetrySamplesRows, listTelemetryStreamsRows,
} from '@/lib/db/repos/telemetry';
import { substrateAvailable } from '@/lib/db/client';
import type { TelemetryStreamRow, TelemetrySampleRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';

/**
 * Telemetry Wall — define streams, append samples, watch the wall live.
 *
 * Top: stream catalogue with warn/alert thresholds.
 * Centre: a sparkline-ish strip per stream rendering the 30 most recent
 *         samples. Bar colours warn/alert against the stream's thresholds.
 * Right: a sample composer for the active stream.
 *
 * Samples are append-only in the substrate; Realtime pushes new ones in
 * without polling. RLS is left broad on telemetry by design — operational
 * fabric should be visible to any authenticated session.
 */
export function TelemetryWall() {
  const { actor, ready } = useIdentity();
  const [streams, setStreams] = React.useState<TelemetryStreamRow[]>([]);
  const [samplesByStream, setSamplesByStream] = React.useState<Record<string, TelemetrySampleRow[]>>({});
  const [active, setActive] = React.useState<string | null>(null);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const available = substrateAvailable();

  const refreshStreams = React.useCallback(async () => {
    if (!available) return;
    const s = await listTelemetryStreamsRows({ limit: 50 });
    setStreams(s);
    if (!active && s.length > 0) setActive(s[0]!.stream_id);
  }, [available, active]);

  const refreshSamples = React.useCallback(async () => {
    if (!available) return;
    const ids = streams.slice(0, 12).map(s => s.stream_id);
    if (ids.length === 0) return;
    const next: Record<string, TelemetrySampleRow[]> = {};
    await Promise.all(ids.map(async id => {
      next[id] = await recentTelemetrySamplesRows(id, 30);
    }));
    setSamplesByStream(next);
  }, [available, streams]);

  React.useEffect(() => { if (ready) void refreshStreams(); }, [ready, refreshStreams]);
  React.useEffect(() => { if (streams.length > 0) void refreshSamples(); }, [streams, refreshSamples]);

  // Telemetry tables are now on supabase_realtime — subscribe to both
  // streams (definition changes) and samples (new readings). RLS still
  // governs which events flow through; we just react to anything visible.
  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'telemetry_streams' as const },
      { table: 'telemetry_samples' as const },
    ], []),
    React.useCallback(async () => {
      await refreshStreams();
      await refreshSamples();
    }, [refreshStreams, refreshSamples]),
  );

  if (!available) {
    return (
      <Panel title="Telemetry Wall" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  const activeStream = streams.find(s => s.stream_id === active) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Telemetry Wall</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            append-only · 5 s sweep
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setComposerOpen(o => !o)}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            {composerOpen ? 'cancel' : '+ define / append'}
          </button>
        </div>
      </div>

      {composerOpen ? (
        <TelemetryComposer
          activeStreamId={active}
          activeStream={activeStream}
          defaultCharter={actor?.charterId ?? 'platform'}
          onDone={async () => { await refreshStreams(); await refreshSamples(); setComposerOpen(false); }}
        />
      ) : null}

      <Panel title="Streams" meta={`${streams.length}`} bodyClass="!p-0">
        {streams.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No streams defined. Use the composer to define one.</p>
        ) : (
          <div className="divide-y divide-line-soft">
            {streams.map(s => {
              const samples = samplesByStream[s.stream_id] ?? [];
              const latest = samples[0]?.value ?? null;
              const max = Math.max(1, ...samples.map(x => Math.abs(x.value)));
              const tone =
                latest == null ? TONE.neutral
                : (s.alert_threshold != null && latest >= s.alert_threshold) ? TONE.alert
                : (s.warn_threshold  != null && latest >= s.warn_threshold)  ? TONE.warn
                : TONE.ok;
              return (
                <button
                  key={s.stream_id}
                  type="button"
                  onClick={() => setActive(s.stream_id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-2"
                  style={{ backgroundColor: s.stream_id === active ? 'rgba(55,199,212,0.04)' : undefined }}
                >
                  <div className="w-64 shrink-0">
                    <a href={`/gov/telemetry/${encodeURIComponent(s.stream_id)}`}
                       onClick={ev => ev.stopPropagation()}
                       className="block truncate font-mono text-[10px] text-link hover:underline">{s.stream_id}</a>
                    <div className="truncate text-[10px] text-ink">{s.label}</div>
                  </div>
                  <div className="flex min-w-0 flex-1 items-end gap-px h-8">
                    {samples.slice(0, 30).reverse().map((sample, i) => (
                      <span
                        key={i}
                        className="block w-1"
                        style={{
                          height: `${Math.max(2, (Math.abs(sample.value) / max) * 100)}%`,
                          backgroundColor:
                            (s.alert_threshold != null && sample.value >= s.alert_threshold) ? TONE.alert
                            : (s.warn_threshold != null && sample.value >= s.warn_threshold)  ? TONE.warn
                            : TONE.ok,
                          opacity: 0.5 + (i / 30) * 0.5,
                        }}
                      />
                    ))}
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <div className="font-mono tabular-nums text-[12px]" style={{ color: tone }}>
                      {latest != null ? latest.toFixed(2) : '—'}
                    </div>
                    <div className="font-mono text-[8.5px] text-ink-muted">{s.unit ?? ''}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Streams are defined via define_telemetry_stream (idempotent on stream_id).
        Samples flow through record_telemetry_sample; the underlying table is
        append-only — UPDATE and DELETE are blocked at the trigger level.
      </p>
    </div>
  );
}

function TelemetryComposer({
  activeStreamId, activeStream, defaultCharter, onDone,
}: {
  activeStreamId: string | null;
  activeStream: TelemetryStreamRow | null;
  defaultCharter: string;
  onDone: () => Promise<void>;
}) {
  const [mode, setMode] = React.useState<'define' | 'sample'>('define');
  const [streamId, setStreamId] = React.useState(activeStreamId ?? '');
  const [label, setLabel] = React.useState(activeStream?.label ?? '');
  const [unit, setUnit]   = React.useState(activeStream?.unit ?? '');
  const [warn, setWarn]   = React.useState<string>(activeStream?.warn_threshold?.toString() ?? '');
  const [alert, setAlert] = React.useState<string>(activeStream?.alert_threshold?.toString() ?? '');
  const [charter, setCharter] = React.useState(activeStream?.charter_id ?? defaultCharter);
  const [value, setValue] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (mode === 'define') {
        if (!streamId.trim() || !label.trim()) { setError('stream id + label required'); return; }
        const row = await defineTelemetryStreamRow({
          streamId: streamId.trim(), charterId: charter.trim(),
          label: label.trim(), unit: unit.trim() || null,
          warnThreshold: warn ? Number(warn) : null,
          alertThreshold: alert ? Number(alert) : null,
        });
        if (!row) { setError('define_telemetry_stream failed'); return; }
      } else {
        const v = Number(value);
        if (!streamId.trim() || Number.isNaN(v)) { setError('stream + numeric value required'); return; }
        const row = await recordTelemetrySampleRow({ streamId: streamId.trim(), value: v });
        if (!row) { setError('record_telemetry_sample failed'); return; }
        setValue('');
      }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <div className="flex gap-2">
        {(['define', 'sample'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="focus-ring rounded-[3px] border px-2 py-0.5 text-[9px] uppercase tracking-wider"
            style={{
              borderColor: mode === m ? TONE.link : 'rgb(var(--c-line))',
              color: mode === m ? TONE.link : 'rgb(var(--c-ink-muted))',
            }}
          >
            {m === 'define' ? 'define stream' : 'append sample'}
          </button>
        ))}
      </div>
      {mode === 'define' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Stream ID</span>
              <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                     value={streamId} onChange={e => setStreamId(e.currentTarget.value)} required />
            </label>
            <label className="block">
              <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Charter</span>
              <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                     value={charter} onChange={e => setCharter(e.currentTarget.value)} required />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Label</span>
              <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                     value={label} onChange={e => setLabel(e.currentTarget.value)} required />
            </label>
            <label className="block">
              <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Unit</span>
              <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                     value={unit} onChange={e => setUnit(e.currentTarget.value)} placeholder="ops/min" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Warn ≥</span>
              <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                     value={warn} onChange={e => setWarn(e.currentTarget.value)} placeholder="80" />
            </label>
            <label className="block">
              <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Alert ≥</span>
              <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                     value={alert} onChange={e => setAlert(e.currentTarget.value)} placeholder="95" />
            </label>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Stream ID</span>
            <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                   value={streamId} onChange={e => setStreamId(e.currentTarget.value)} required />
          </label>
          <label className="block">
            <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Value</span>
            <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                   inputMode="decimal"
                   value={value} onChange={e => setValue(e.currentTarget.value)} required />
          </label>
        </div>
      )}
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'working…' : mode === 'define' ? 'upsert stream' : 'append sample'}
        </button>
      </div>
    </form>
  );
}
