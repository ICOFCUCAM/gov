'use client';

// Shared dense operations kit for Ministry-of-Health subsystems — gives
// every sector the same sovereign command rhythm: cinematic header, a
// compressed KPI strip, telemetry bar panels and an AI-advisory rail.
// Eliminates the old sparse AppKit look across secondary domains.

import * as React from 'react';
import { CommandHeader, CommandPanel, Sparkline, sc, type Tone } from '@/apps/_shared/SovereignUI';
import { waveSeries } from '@/lib/telemetry';

export type T3 = 'ok' | 'warn' | 'alert';

export function OpsHeader(p: {
  index: number; title: string; subtitle: string; posture: string; tone: Tone; now: number; role: string; accent: string;
}) {
  return (
    <CommandHeader index={p.index} title={p.title} subtitle={p.subtitle}
      postureLabel={p.posture.toUpperCase()} postureTone={p.tone} now={p.now} role={p.role} accent={p.accent} />
  );
}

export function KpiStrip({ items, ts, accent }: {
  items: { l: string; v: string; s?: string; t: Tone; k: string }[]; ts: number; accent: string;
}) {
  const cols = items.length >= 8 ? 'xl:grid-cols-8' : items.length >= 6 ? 'xl:grid-cols-6' : 'xl:grid-cols-5';
  return (
    <div className={`grid grid-cols-2 gap-1.5 sm:grid-cols-4 ${cols}`}>
      {items.map(m => (
        <div key={m.l} className="flex flex-col justify-between rounded-[6px] border px-2 py-1.5"
          style={{ borderColor: `color-mix(in srgb,${accent} 16%,#15233a)`, background: 'rgba(7,18,32,0.92)' }}>
          <div className="truncate text-[7px] font-bold uppercase tracking-[0.13em] text-ink-muted">{m.l}</div>
          <div className="mt-0.5 flex items-end justify-between gap-1">
            <span className="font-mono text-[21px] font-bold leading-none tabular-nums" style={{ color: sc(m.t), textShadow: `0 0 11px color-mix(in srgb,${sc(m.t)} 45%,transparent)` }}>{m.v}</span>
            <Sparkline points={waveSeries(`ops:${m.k}`, ts, 16, m.t === 'alert' ? 50 : 28, m.t === 'alert' ? 95 : 80)} tone={m.t} width={42} height={15} />
          </div>
          {m.s ? <div className="truncate text-[7px] text-ink-muted">{m.s}</div> : <div className="h-[9px]" />}
        </div>
      ))}
    </div>
  );
}

export function BarPanel({ title, meta, accent, live, rows }: {
  title: string; meta?: string; accent: string; live?: boolean;
  rows: { label: string; pct: number; tone: Tone; tail: string }[];
}) {
  return (
    <CommandPanel title={title} meta={meta} accent={accent} live={live}>
      <div className="space-y-1">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-2 text-[8.5px]">
            <span className="w-32 shrink-0 truncate text-ink-soft">{r.label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#13243a' }}>
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, r.pct))}%`, background: sc(r.tone), boxShadow: `0 0 6px ${sc(r.tone)}` }} />
            </span>
            <span className="w-16 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(r.tone) }}>{r.tail}</span>
          </div>
        ))}
      </div>
    </CommandPanel>
  );
}

export function AdvisoryPanel({ accent, severity, headline, recommended }: {
  accent: string; severity: string; headline: string; recommended: string[];
}) {
  const t: Tone = severity === 'critical' || severity === 'priority' ? 'alert' : severity === 'advisory' ? 'warn' : 'ok';
  return (
    <CommandPanel title="AI command intelligence" meta={severity} accent={accent} live>
      <div className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(t) }}>{severity}</div>
      <div className="mt-0.5 text-[10px] text-ink">{headline}</div>
      <ul className="mt-1 space-y-0.5">
        {recommended.map((r, i) => <li key={i} className="flex items-start gap-1 text-[8.5px] text-ink-soft"><span style={{ color: sc(t) }}>▸</span><span className="min-w-0 flex-1">{r}</span></li>)}
      </ul>
    </CommandPanel>
  );
}

export function StatTiles({ items, accent }: { items: { l: string; v: string; t: Tone }[]; accent: string }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {items.map(s => (
        <div key={s.l} className="rounded-[6px] border px-2 py-1.5" style={{ borderColor: `color-mix(in srgb,${accent} 16%,#15233a)`, background: 'rgba(6,15,28,0.95)' }}>
          <div className="truncate text-[7px] font-bold uppercase tracking-[0.13em] text-ink-muted">{s.l}</div>
          <div className="font-mono text-[15px] font-bold tabular-nums" style={{ color: sc(s.t) }}>{s.v}</div>
        </div>
      ))}
    </div>
  );
}
