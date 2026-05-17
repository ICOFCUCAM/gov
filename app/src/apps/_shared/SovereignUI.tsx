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
    <section className="flex h-full flex-col rounded-[3px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#080d13' }}>
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
      <div className={`min-h-0 flex-1 ${dense ? 'p-1.5' : 'p-2.5'}`}>{children}</div>
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

export function Sparkline({ points, tone, width = 64, height = 18 }: {
  points: number[]; tone: Tone; width?: number; height?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const d = points.map((p, i) =>
    `${(i / (points.length - 1)) * width},${height - ((p - min) / span) * height}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={d} fill="none" stroke={sc(tone)} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb,${sc(tone)} 55%,transparent))` }} />
    </svg>
  );
}

export function KpiSpark({ label, value, unit, delta, deltaSuffix = '', tone, points }: {
  label: string; value: string; unit?: string; delta?: number; deltaSuffix?: string; tone: Tone; points?: number[];
}) {
  const dUp = (delta ?? 0) > 0, dDn = (delta ?? 0) < 0;
  return (
    <div className="rounded-[3px] border px-2.5 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 70%,transparent)', background: '#0b1118' }}>
      <div className="text-[7.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className="flex items-end justify-between gap-1">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-[18px] leading-none tabular-nums" style={{ color: sc(tone), textShadow: `0 0 12px color-mix(in srgb,${sc(tone)} 45%,transparent)` }}>{value}</span>
          {unit ? <span className="text-[8px] text-ink-muted">{unit}</span> : null}
        </div>
        {points ? <Sparkline points={points} tone={tone} /> : null}
      </div>
      {delta !== undefined && delta !== 0 ? (
        <div className="font-mono text-[8px] tabular-nums" style={{ color: dUp ? sc('alert') : dDn ? sc('ok') : 'rgb(var(--c-ink-muted))' }}>
          {dUp ? '▲' : '▼'}{Math.abs(delta)}{deltaSuffix}
        </div>
      ) : <div className="h-[11px]" />}
    </div>
  );
}

export function Donut({ segments, total, label, size = 116 }: {
  segments: { label: string; value: number; tone: Tone }[]; total: number; label: string; size?: number;
}) {
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 9, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#16222e" strokeWidth="9" />
        {segments.map((s, i) => {
          const frac = s.value / sum;
          const seg = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={sc(s.tone)} strokeWidth="9"
              strokeDasharray={`${frac * circ} ${circ}`} strokeDashoffset={-acc * circ}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
          acc += frac;
          return seg;
        })}
        <text x="50%" y="46%" textAnchor="middle" fontSize={size * 0.2} fontWeight="700" fill="rgb(var(--c-ink))" style={{ fontFamily: 'var(--font-mono,monospace)' }}>{total}</text>
        <text x="50%" y="60%" textAnchor="middle" fontSize={size * 0.085} fill="rgb(var(--c-ink-muted))" className="uppercase" style={{ letterSpacing: '0.14em' }}>{label}</text>
      </svg>
      <div className="space-y-0.5">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: sc(s.tone) }} />
            <span className="text-ink-soft">{s.label}</span>
            <span className="ml-auto font-mono tabular-nums text-ink-muted">{s.value} ({Math.round((s.value / sum) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ series, height = 130, labels }: {
  series: { name: string; points: number[]; tone: Tone }[]; height?: number; labels?: string[];
}) {
  const W = 100, all = series.flatMap(s => s.points);
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const path = (pts: number[]) => pts.map((p, i) =>
    `${(i / (pts.length - 1)) * W},${100 - ((p - min) / span) * 92 - 4}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        {[20, 40, 60, 80].map(y => <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#16222e" strokeWidth="0.3" />)}
        {series.map(s => (
          <polyline key={s.name} points={path(s.points)} fill="none" stroke={sc(s.tone)} strokeWidth="1.1"
            strokeLinejoin="round" vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb,${sc(s.tone)} 45%,transparent))` }} />
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-[8px] text-ink-muted">
        <div className="flex flex-wrap gap-x-3">
          {series.map(s => (
            <span key={s.name} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: sc(s.tone) }} />{s.name}</span>
          ))}
        </div>
        {labels ? <div className="flex gap-x-3 font-mono tabular-nums">{labels.map(l => <span key={l}>{l}</span>)}</div> : null}
      </div>
    </div>
  );
}

export function Stepper({ steps }: { steps: { label: string; meta: string; reached: boolean; tone: Tone }[] }) {
  return (
    <div className="flex items-stretch gap-1">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex flex-1 flex-col items-center text-center">
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold"
              style={{ color: s.reached ? sc(s.tone) : 'rgb(var(--c-ink-muted))', border: `1px solid ${s.reached ? sc(s.tone) : 'rgb(var(--c-line))'}`, boxShadow: s.reached ? `0 0 10px color-mix(in srgb,${sc(s.tone)} 45%,transparent)` : 'none' }}>{i + 1}</span>
            <span className="mt-1 text-[8.5px] font-medium text-ink-soft">{s.label}</span>
            <span className="text-[7.5px] text-ink-muted">{s.meta}</span>
          </div>
          {i < steps.length - 1 ? <span className="mt-3 h-px flex-1 self-start" style={{ background: steps[i + 1]!.reached ? sc(s.tone) : 'rgb(var(--c-line))' }} /> : null}
        </React.Fragment>
      ))}
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
