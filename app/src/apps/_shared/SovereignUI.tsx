'use client';

// Sovereign-UI — the shared command grammar for the Ministry of Health
// visual nervous system. Cinematic, dark, intelligence-grade primitives.
// Every domain inherits this grammar but tunes its own accent, density
// and rhythm — so domains feel related yet distinct, never templated.

import * as React from 'react';

export type Tone = 'ok' | 'warn' | 'alert' | 'info';
export const sc = (t: Tone) => (t === 'info' ? 'rgb(var(--c-link))' : `rgb(var(--c-${t}))`);

// Domain accent — each subsystem passes its own so the command substrate
// reads differently per domain (command=cyan, disease=amber, emergency=red…).
export const ACCENT: Record<string, string> = {
  command: '#37c7d4', hospital: '#3fd6a8', doctor: '#5fa8ff', citizen: '#36d39b',
  disease: '#f0a13a', lab: '#9b8cff', pharma: '#37c7d4', emergency: '#ff5d5d',
  finance: '#54d08f', regulatory: '#c9a24a', situation: '#37c7d4',
};

export function CommandHeader({
  index, title, subtitle, postureLabel, postureTone, now, role, accent = '#37c7d4',
}: {
  index: number; title: string; subtitle: string;
  postureLabel: string; postureTone: Tone; now: number; role: string; accent?: string;
}) {
  const time = new Date(now).toLocaleTimeString('en-GB', { hour12: false });
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[3px] border px-3 py-2"
      style={{ borderColor: 'color-mix(in srgb, #1d2a36 80%, transparent)', background: `linear-gradient(100deg,#070b10,#0c1622 60%,color-mix(in srgb,${accent} 10%,#0c1622))` }}>
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums"
        style={{ color: accent, border: `1px solid ${accent}`, boxShadow: `0 0 12px color-mix(in srgb,${accent} 50%,transparent)` }}>{index}</span>
      <div className="min-w-0">
        <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-ink"
          style={{ textShadow: `0 0 14px color-mix(in srgb,${accent} 45%,transparent)` }}>{title}</div>
        <div className="text-[9px] uppercase tracking-[0.16em] text-ink-muted">{subtitle}</div>
      </div>
      <span className="rounded-[2px] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em]"
        style={{ backgroundColor: `color-mix(in srgb,${sc(postureTone)} 20%,transparent)`, color: sc(postureTone) }}>{postureLabel}</span>
      <span className="ml-auto flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-ink-muted">
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: sc('ok') }} />live</span>
        <span className="font-mono tabular-nums">{time}</span>
        <span className="hidden sm:inline">· {role}</span>
      </span>
    </div>
  );
}

export function CommandPanel({
  title, meta, accent = '#37c7d4', live = false, dense = false, children,
}: {
  title: string; meta?: string; accent?: string; live?: boolean; dense?: boolean; children: React.ReactNode;
}) {
  return (
    <section className="rounded-[3px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#080d13' }}>
      <div className="flex items-center justify-between gap-2 border-b px-2.5 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-0.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {meta ? <span className="font-mono text-[9px] tabular-nums text-ink-muted">{meta}</span> : null}
          {live ? <span className="h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: sc('ok') }} /> : null}
        </div>
      </div>
      <div className={dense ? 'p-1.5' : 'p-2.5'}>{children}</div>
    </section>
  );
}

export function KpiTile({ label, value, delta, tone, sub }: {
  label: string; value: string; delta?: number; tone: Tone; sub?: string;
}) {
  const dUp = (delta ?? 0) > 0, dDn = (delta ?? 0) < 0;
  return (
    <div className="rounded-[3px] border px-2.5 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 70%,transparent)', background: '#0b1118' }}>
      <div className="text-[7.5px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[17px] tabular-nums" style={{ color: sc(tone), textShadow: `0 0 12px color-mix(in srgb,${sc(tone)} 50%,transparent)` }}>{value}</span>
        {delta !== undefined && delta !== 0 ? (
          <span className="font-mono text-[8.5px] tabular-nums" style={{ color: dUp ? sc('alert') : dDn ? sc('ok') : 'rgb(var(--c-ink-muted))' }}>
            {dUp ? '▲' : '▼'}{Math.abs(delta)}
          </span>
        ) : null}
      </div>
      {sub ? <div className="text-[8px] text-ink-muted">{sub}</div> : null}
    </div>
  );
}

export function RingGauge({ value, label, tone, size = 92, sub }: {
  value: number; label: string; tone: Tone; size?: number; sub?: string;
}) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#16222e" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={sc(tone)} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb,${sc(tone)} 60%,transparent))`, transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }} />
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.26} fontWeight="700" fill={sc(tone)} style={{ fontFamily: 'var(--font-mono,monospace)' }}>{Math.round(value)}</text>
        <text x="50%" y="63%" textAnchor="middle" fontSize={size * 0.1} fill="rgb(var(--c-ink-muted))" className="uppercase" style={{ letterSpacing: '0.14em' }}>{sub ?? ''}</text>
      </svg>
      <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
    </div>
  );
}

export function StatusLegend({ items }: { items: { label: string; tone: Tone }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[8px] uppercase tracking-wider text-ink-muted">
      {items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: sc(i.tone) }} />{i.label}
        </span>
      ))}
    </div>
  );
}
