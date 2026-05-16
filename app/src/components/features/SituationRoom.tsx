'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { CommandPalette, type CommandItem } from '@/components/ui/CommandPalette';
import { WorldMap } from '@/components/ui/WorldMap';
import { ExecutiveMenu } from '@/components/ui/ExecutiveMenu';
import { identityFor } from '@/lib/archetype-profiles';
import { resolveIdentity } from '@/lib/sovereign-identity';
import type {
  NationalSnapshot,
  NationalCoordination,
  SovereignProfile,
  ArchetypeKey,
} from '@/lib/api/types';

export const TONE: Record<string, string> = {
  alert: '#f1707a',
  warn: '#e0b341',
  ok: '#34d39c',
  neutral: '#6b7a90',
};
export const ACCENT = '#37c7d4';

// Deep-navy situation-room palette (overrides the .sov tokens locally).
export const PALETTE = {
  '--c-bg': '7 12 20',
  '--c-surface': '12 18 30',
  '--c-surface-2': '19 27 43',
  '--c-ink': '226 233 243',
  '--c-ink-soft': '150 165 186',
  '--c-ink-muted': '101 116 139',
  '--c-line': '28 38 56',
  '--c-line-soft': '21 29 44',
  '--c-link': '74 198 212',
  '--c-link-hover': '130 220 230',
  '--accent': ACCENT,
} as React.CSSProperties;

export function seed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
export const toneFor = (v: number) => (v >= 75 ? 'alert' : v >= 55 ? 'warn' : v >= 35 ? 'neutral' : 'ok');

/**
 * Temporally-coherent sovereign telemetry. Unlike raw seed() noise, this
 * produces a believable operational series: a slow seeded baseline, two
 * out-of-phase oscillations (operational shift + diurnal cadence) and a
 * small bounded jitter. Sampling the same key at successive `t` yields a
 * smooth trending curve — charts breathe instead of flickering.
 */
export function wave(key: string, t: number, lo = 35, hi = 90): number {
  const a = seed(key), b = seed(key + ':φ'), c = seed(key + ':ψ');
  const span = hi - lo;
  const base = lo + span * (0.35 + a * 0.4);
  const slow = Math.sin(t / (40 + a * 60) + b * 6.28) * span * 0.18;
  const fast = Math.sin(t / (9 + c * 7) + c * 6.28) * span * 0.09;
  const jitter = (seed(`${key}:${Math.floor(t)}`) - 0.5) * span * 0.06;
  return Math.max(lo, Math.min(hi, base + slow + fast + jitter));
}
export function waveSeries(key: string, t: number, n = 16, lo = 35, hi = 90): number[] {
  return Array.from({ length: n }).map((_, i) => wave(key, t - (n - 1 - i), lo, hi));
}

/**
 * Institutional behavioural fingerprint. Each archetype carries a distinct
 * per-domain stress bias so risk matrices read as differentiated
 * institutions (Energy volatile on infrastructure, Treasury concentrated
 * in fiscal, Interior elevated on security/civil) rather than uniform
 * noise. Shared by every surface that renders a ministry × domain matrix.
 */
const ARCH_BIAS: Record<string, Partial<Record<string, number>>> = {
  ENERGY:      { ops: 8, fisc: 2, infra: 20, civil: 4, sec: 6, logi: 8, env: 10, sla: 6, esc: 10, work: 4, emrg: 8 },
  TRANSPORT:   { ops: 10, fisc: -2, infra: 16, civil: 2, sec: 2, logi: 18, env: 4, sla: 10, esc: 6, work: 6, emrg: 6 },
  HEALTH:      { ops: 14, fisc: 6, infra: 4, civil: 12, sec: 2, logi: 10, env: 2, sla: 14, esc: 12, work: 12, emrg: 16 },
  FINANCE:     { ops: 2, fisc: 20, infra: -4, civil: 6, sec: 4, logi: -2, env: -4, sla: 4, esc: 4, work: 2, emrg: 2 },
  INTERIOR:    { ops: 6, fisc: 0, infra: 2, civil: 16, sec: 22, logi: 4, env: 2, sla: 6, esc: 14, work: 4, emrg: 14 },
  EDUCATION:   { ops: 4, fisc: 6, infra: 2, civil: 8, sec: -2, logi: 2, env: 0, sla: 8, esc: 2, work: 10, emrg: 2 },
  AGRICULTURE: { ops: 6, fisc: 4, infra: 6, civil: 6, sec: 0, logi: 10, env: 18, sla: 6, esc: 6, work: 8, emrg: 8 },
  ENVIRONMENT: { ops: 4, fisc: -2, infra: 8, civil: 4, sec: 2, logi: 4, env: 22, sla: 4, esc: 6, work: 4, emrg: 12 },
  TRADE:       { ops: 6, fisc: 12, infra: 2, civil: 2, sec: 4, logi: 14, env: 2, sla: 8, esc: 4, work: 4, emrg: 2 },
  GENERIC:     { ops: 4, fisc: 4, infra: 4, civil: 4, sec: 4, logi: 4, env: 4, sla: 4, esc: 4, work: 4, emrg: 4 },
};
export function domainStress(arch: string, domain: string, pressure: number, t: number, idKey: string): number {
  const row = ARCH_BIAS[arch] ?? ARCH_BIAS.GENERIC!;
  const b = row[domain] ?? 4;
  const v = pressure * 0.34 + b + (seed(`ds:${idKey}:${domain}`) - 0.5) * 20
    + Math.sin(t / 30 + seed(`dp:${idKey}:${domain}`) * 6.28) * 9;
  return Math.max(4, Math.min(99, Math.round(v)));
}
export function rel(at: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
}

const RAIL: { g: string; items: { i: string; l: string; s: string; href: string; on?: boolean }[] }[] = [
  { g: 'Sovereign Command', items: [
    { i: '◎', l: 'Situation Room', s: 'Real-time command', href: '/gov/situation-room', on: true },
    { i: '◆', l: 'Cabinet Intelligence', s: 'Executive command', href: '/gov' },
    { i: '⟁', l: 'National Coordination', s: 'Dependency · cascade', href: '/gov/coordination' },
  ]},
  { g: 'Intelligence', items: [
    { i: '◔', l: 'Analytics & AI', s: 'Strategic foresight', href: '/gov/coordination' },
    { i: '◉', l: 'Regional Overview', s: 'Provincial posture', href: '/gov/coordination' },
  ]},
  { g: 'Operations', items: [
    { i: '⊞', l: 'Operations Centre', s: 'Cross-institution state', href: '/ops' },
    { i: '▦', l: 'Ministries', s: 'Institutional registry', href: '/ministries' },
  ]},
  { g: 'Security', items: [
    { i: '◈', l: 'Security & Interior', s: 'National security', href: '/gov' },
    { i: '§', l: 'Treasury Command', s: 'Sovereign fiscal', href: '/gov' },
  ]},
  { g: 'Infrastructure', items: [
    { i: '⚡', l: 'Infrastructure', s: 'Grid · corridors', href: '/gov' },
    { i: '⇄', l: 'Interoperability', s: 'Federation · clients', href: '/integrations' },
  ]},
  { g: 'Emergency Response', items: [
    { i: '⛑', l: 'Emergency Response', s: 'Crisis coordination', href: '/gov/coordination' },
  ]},
  { g: 'Governance', items: [
    { i: '▥', l: 'Policy Monitor', s: 'Constitutional watch', href: '/gov' },
    { i: '▤', l: 'Documents & Records', s: 'Tamper-evident', href: '/wallet/documents' },
  ]},
  { g: 'Oversight', items: [
    { i: '⛓', l: 'Audit & Oversight', s: 'Integrity assurance', href: '/audit' },
    { i: '⚙', l: 'Platform', s: 'System operations', href: '/platform' },
  ]},
];

export function Panel({
  title, meta, className = '', bodyClass = '', children,
}: {
  title: string; meta?: React.ReactNode; className?: string; bodyClass?: string; children: React.ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col rounded-[3px] border border-line bg-surface ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5"
        style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.08)' }}>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{title}</h2>
        {meta ? <span className="text-[10px] text-ink-muted">{meta}</span> : null}
      </div>
      <div className={`flex-1 p-2.5 ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function Donut({ segs }: { segs: { label: string; value: number; tone: string }[] }) {
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const R = 40, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <svg viewBox="0 0 110 110" className="h-28 w-28 -rotate-90">
          <circle cx="55" cy="55" r={R} fill="none" stroke="rgb(var(--c-surface-2))" strokeWidth="11" />
          {segs.map(s => {
            const len = (s.value / total) * C;
            const el = (
              <circle key={s.label} cx="55" cy="55" r={R} fill="none" stroke={TONE[s.tone]} strokeWidth="11"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}
                className="transition-all duration-700 ease-sov" strokeLinecap="round" />
            );
            off += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-mono text-xl tabular-nums text-ink">{total}</div>
            <div className="text-[9px] uppercase tracking-wide text-ink-muted">total</div>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5 text-xs">
        {segs.map(s => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-[1px]" style={{ backgroundColor: TONE[s.tone] }} />
            <span className="text-ink-muted">{s.label}</span>
            <span className="ml-auto pl-4 font-mono tabular-nums text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Ring({ pct, label }: { pct: number; label: string }) {
  const R = 38, C = 2 * Math.PI * R;
  const tone = pct >= 99 ? 'ok' : pct >= 95 ? 'warn' : 'alert';
  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(var(--c-surface-2))" strokeWidth="7" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={TONE[tone]} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`} className="transition-all duration-700 ease-sov" />
      </svg>
      <div className="absolute text-center">
        <div className="font-mono text-base tabular-nums" style={{ color: TONE[tone] }}>{pct.toFixed(1)}%</div>
        <div className="text-[9px] text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

export function Spark({ pts, tone }: { pts: number[]; tone: string }) {
  const max = Math.max(...pts), min = Math.min(...pts);
  const line = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * 100;
    const y = 30 - ((p - min) / (max - min || 1)) * 26 - 2;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `${line} L100,30 L0,30 Z`;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-9 w-full">
      <path d={area} fill={TONE[tone]} fillOpacity="0.12" />
      <path d={line} fill="none" stroke={TONE[tone]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Eased live counter — drifts the displayed value toward the target so
// metrics visibly move between fabric epochs (restrained, ~600ms).
export function useEased(target: number) {
  const [v, setV] = React.useState(target);
  const ref = React.useRef(target);
  React.useEffect(() => {
    const from = ref.current;
    const delta = target - from;
    if (delta === 0) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      ref.current = from + delta * e;
      setV(ref.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
function AnimatedNum({ value, fixed = 0 }: { value: number; fixed?: number }) {
  const v = useEased(value);
  return <>{v.toLocaleString(undefined, { minimumFractionDigits: fixed, maximumFractionDigits: fixed })}</>;
}
// Splits "$8.4B" / "1,248" / "99.97%" into prefix + eased number + suffix.
export function LiveValue({ raw }: { raw: string }) {
  const m = /^(\D*?)([\d,]+(?:\.\d+)?)(.*)$/.exec(raw);
  const digits = m?.[2];
  if (!m || !digits) return <>{raw}</>;
  const num = Number(digits.replace(/,/g, ''));
  if (!isFinite(num)) return <>{raw}</>;
  const dec = digits.includes('.') ? (digits.split('.')[1]?.length ?? 0) : 0;
  return <>{m[1] ?? ''}<AnimatedNum value={num} fixed={dec} />{m[3] ?? ''}</>;
}

const INFRA_KINDS = [
  { k: 'hospital', g: '✚', label: 'Medical centre' },
  { k: 'port', g: '⚓', label: 'Seaport' },
  { k: 'airport', g: '✈', label: 'Airport' },
  { k: 'energy', g: '⚡', label: 'Power station' },
  { k: 'logistics', g: '▣', label: 'Logistics hub' },
  { k: 'water', g: '◑', label: 'Water works' },
  { k: 'border', g: '⛓', label: 'Border checkpoint' },
  { k: 'comms', g: '◬', label: 'Comms tower' },
  { k: 'command', g: '◈', label: 'Command facility' },
  { k: 'emergency', g: '⛑', label: 'Emergency hub' },
] as const;


// Global-state-neutral province partition (real territorial polygons,
// shared edges form the national silhouette). viewBox 1000×620.
const PROV: { n: string; cx: number; cy: number; r: number; cap?: boolean }[] = [
  { n: 'Northern Province', cx: 320, cy: 196, r: 150 },
  { n: 'Highland Region', cx: 545, cy: 188, r: 150 },
  { n: 'Eastern Region', cx: 770, cy: 232, r: 150 },
  { n: 'Western Region', cx: 286, cy: 404, r: 150 },
  { n: 'Capital District', cx: 520, cy: 356, r: 130, cap: true },
  { n: 'Coastal Region', cx: 742, cy: 432, r: 150 },
];

interface Infra { id: string; kind: typeof INFRA_KINDS[number]; x: number; y: number; risk: number }

// Geographic territory heat — real Natural-Earth basemap washed by
// per-country risk (world by default, zooms to the sovereign nation).
export function TerritoryHeat({ epoch, height = 150, focus }: { epoch: number; height?: number; focus?: string }) {
  const riskOf = React.useCallback(
    (name: string) => Math.round(seed(`geo:${name}:${epoch}`) * 100),
    [epoch],
  );
  const provRisk = PROV.map((p, i) => ({ p, risk: Math.round(seed(`thp:${i}:${epoch}`) * 100) }));
  return (
    <div className="relative w-full overflow-hidden rounded-[3px] border border-line-soft"
      style={{ height, background: 'radial-gradient(ellipse at 48% 32%, rgba(55,199,212,0.10) 0%, rgb(var(--c-bg)) 70%)' }}>
      <WorldMap focus={focus} riskOf={riskOf} />
      <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <pattern id="thgrid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="rgb(var(--c-line))" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="thvig" cx="50%" cy="46%" r="62%">
            <stop offset="62%" stopColor="rgb(var(--c-bg))" stopOpacity="0" />
            <stop offset="100%" stopColor="rgb(var(--c-bg))" stopOpacity="0.6" />
          </radialGradient>
        </defs>
        <rect width="1000" height="620" fill="url(#thgrid)" opacity="0.14" />
        {provRisk.map(({ p, risk }) => (
          <circle key={p.n} cx={p.cx} cy={p.cy} r={p.r * 0.72} fill={TONE[toneFor(risk)]}
            opacity={0.05 + (risk / 100) * 0.16} className="transition-all duration-1000 ease-sov" />
        ))}
        <rect width="1000" height="620" fill="url(#thvig)" />
      </svg>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {['left-1.5 top-1.5 border-l border-t', 'right-1.5 top-1.5 border-r border-t', 'bottom-1.5 left-1.5 border-b border-l', 'bottom-1.5 right-1.5 border-b border-r'].map((c, i) => (
          <span key={i} className={`absolute h-3 w-3 ${c}`} style={{ borderColor: ACCENT, opacity: 0.35 }} />
        ))}
      </div>
    </div>
  );
}

type LayerKey = 'infra' | 'grid' | 'corridors' | 'incidents';
export function NationalMap({
  mapNodes, edges, incidents, now, layers, epoch, height, focus, onToggleLayer,
}: {
  mapNodes: { ministryId: string; ministry: string; archetype: string; x: number; y: number; pressure: number }[];
  edges: { fromId: string; toId: string; propagatedRisk: number }[];
  incidents: { ministry: string; severity: string }[];
  now: number;
  layers: { infra: boolean; grid: boolean; corridors: boolean; incidents: boolean };
  epoch: number;
  height?: number;
  focus?: string;
  onToggleLayer?: (k: LayerKey) => void;
}) {
  const [layerOpen, setLayerOpen] = React.useState(false);
  const infra: Infra[] = React.useMemo(
    () => Array.from({ length: 38 }).map((_, i) => {
      const kind = INFRA_KINDS[Math.floor(seed(`ik:${i}`) * INFRA_KINDS.length)] ?? INFRA_KINDS[0];
      return {
        id: `I${i}`,
        kind,
        x: 12 + seed(`ix:${i}`) * 74,
        y: 16 + seed(`iy:${i}`) * 66,
        risk: Math.round(seed(`irisk:${i}:${epoch}`) * 100),
      };
    }),
    [epoch],
  );
  const pos = new Map(mapNodes.map(m => [m.ministryId, m]));
  const pulse = (now / 1000) % 2 / 2;
  const ts = now / 4000;
  const provRisk = PROV.map((p, i) => ({ p, risk: Math.round(wave(`prov:${i}`, ts, 8, 96)) }));
  // National infrastructure corridors — energy / logistics / air / maritime
  // lattices threaded through province centroids so the territory reads as
  // a connected operational fabric, not floating markers.
  const CORRIDORS: { from: number; to: number; kind: 'energy' | 'logistics' | 'air' | 'maritime' }[] = [
    { from: 0, to: 1, kind: 'energy' }, { from: 1, to: 2, kind: 'energy' }, { from: 1, to: 4, kind: 'energy' },
    { from: 4, to: 3, kind: 'logistics' }, { from: 4, to: 5, kind: 'logistics' }, { from: 3, to: 0, kind: 'logistics' },
    { from: 0, to: 4, kind: 'air' }, { from: 2, to: 4, kind: 'air' }, { from: 2, to: 5, kind: 'maritime' }, { from: 5, to: 4, kind: 'maritime' },
  ];
  const CORR_TONE = { energy: ACCENT, logistics: TONE.warn, air: TONE.link, maritime: '#5fb0d9' };
  const overlay = [
    { l: 'Corridor tempo', v: `${Math.round(wave('mo:ct', ts, 38, 92))}/min`, t: 'ok' },
    { l: 'Regional readiness', v: `${Math.round(wave('mo:rr', ts, 60, 97))}%`, t: 'ok' },
    { l: 'Escalation cadence', v: `${Math.round(wave('mo:ec', ts, 2, 11))}/h`, t: 'warn' },
    { l: 'Signal integrity', v: `${(98 + wave('mo:si', ts, 0, 1.8) / 1).toFixed(1)}%`, t: 'ok' },
    { l: 'Active corridors', v: `${CORRIDORS.length}`, t: 'ok' },
  ];
  const [tactical, setTactical] = React.useState(true);
  const [heat, setHeat] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  return (
    <div ref={rootRef} className={`relative w-full overflow-hidden rounded-[3px] border border-line-soft ${height ? '' : 'h-full min-h-[440px]'}`}
      style={{ ...(height ? { height } : {}), background: 'radial-gradient(ellipse at 46% 30%, rgba(55,199,212,0.12) 0%, rgba(55,199,212,0.03) 38%, rgb(var(--c-bg)) 72%)' }}>
      <WorldMap focus={focus} />

      {/* radar sweep — slow strategic scan over the capital */}
      {tactical ? (
        <div aria-hidden className="pointer-events-none absolute" style={{ left: '52%', top: '50%', width: '120%', height: '120%', transform: 'translate(-50%,-50%)' }}>
          <div className="h-full w-full animate-radar rounded-full opacity-[0.08]"
            style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${ACCENT} 24deg, transparent 56deg, transparent 360deg)` }} />
        </div>
      ) : null}

      {/* classified tactical framing — corner brackets + coordinate crosshair */}
      {tactical ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
          {[['left-2 top-8 border-l border-t', ''], ['right-2 top-8 border-r border-t', ''], ['bottom-12 left-2 border-b border-l', ''], ['bottom-12 right-2 border-b border-r', '']].map(([c], i) => (
            <span key={i} className={`absolute h-4 w-4 ${c}`} style={{ borderColor: ACCENT, opacity: 0.4 }} />
          ))}
          <span className="absolute font-mono text-[8px] tracking-[0.2em]" style={{ left: '0.75rem', top: '2.2rem', color: ACCENT, opacity: 0.45 }}>SECTOR · LIVE</span>
          <span className="absolute font-mono text-[8px] tracking-[0.2em]" style={{ right: '0.75rem', bottom: '3.4rem', color: ACCENT, opacity: 0.45 }}>GRID 1:25k</span>
          <span className="absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: ACCENT, opacity: 0.18 }} />
          <span className="absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: ACCENT, opacity: 0.18 }} />
        </div>
      ) : null}

      <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="rgb(var(--c-line))" strokeWidth="0.5" />
          </pattern>
          <pattern id="terrain" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="14" stroke="rgb(var(--c-line))" strokeWidth="0.5" strokeOpacity="0.5" />
          </pattern>
          <radialGradient id="vignette" cx="50%" cy="46%" r="62%">
            <stop offset="60%" stopColor="rgb(var(--c-bg))" stopOpacity="0" />
            <stop offset="100%" stopColor="rgb(var(--c-bg))" stopOpacity="0.66" />
          </radialGradient>
          {provRisk.map(({ p }, i) => {
            const k = heat ? 1.8 : 1;
            return (
              <radialGradient key={i} id={`pz${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={TONE[toneFor(provRisk[i]!.risk)]} stopOpacity={String(0.30 * k)} />
                <stop offset="55%" stopColor={TONE[toneFor(provRisk[i]!.risk)]} stopOpacity={String(0.12 * k)} />
                <stop offset="100%" stopColor={TONE[toneFor(provRisk[i]!.risk)]} stopOpacity="0" />
              </radialGradient>
            );
          })}
        </defs>

        {/* always-on faint operational graticule + terrain wash */}
        <rect width="1000" height="620" fill="url(#grid)" opacity={layers.grid ? 0.5 : 0.16} />
        <rect width="1000" height="620" fill="url(#terrain)" opacity="0.10" />

        <g>
          {/* province pressure diffusion zones */}
          {provRisk.map(({ p, risk }, i) => {
            const tn = toneFor(risk);
            return (
              <g key={p.n}>
                <circle cx={p.cx} cy={p.cy} r={p.r} fill={`url(#pz${i})`} className="transition-all duration-1000 ease-sov" />
                <circle cx={p.cx} cy={p.cy} r={p.r * 0.62} fill="none" stroke={TONE[tn]} strokeOpacity="0.28" strokeWidth="1" strokeDasharray="2 7" />
                {risk >= 72 ? (
                  <circle cx={p.cx} cy={p.cy} r={p.r * 0.5} fill="none" stroke={TONE.alert} strokeWidth="1.4"
                    className="origin-center animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                ) : null}
              </g>
            );
          })}

          {/* curved internal territorial boundaries */}
          <g stroke="rgb(var(--c-line))" strokeWidth="1.1" fill="none" strokeOpacity="0.5" strokeDasharray="3 6">
            <path d="M430,120 Q470,300 360,540" />
            <path d="M660,116 Q600,300 660,528" />
            <path d="M150,360 Q520,290 920,316" />
            <path d="M250,210 Q520,250 780,200" />
          </g>

          {/* national infrastructure corridors (energy / logistics / air / maritime) */}
          {layers.corridors ? CORRIDORS.map((c, i) => {
            const a = PROV[c.from]!, b = PROV[c.to]!;
            const mx = (a.cx + b.cx) / 2 + (seed(`cm:${i}`) - 0.5) * 60;
            const my = (a.cy + b.cy) / 2 - 30 - seed(`cn:${i}`) * 40;
            const col = CORR_TONE[c.kind];
            return (
              <g key={`c${i}`}>
                <path d={`M${a.cx},${a.cy} Q${mx},${my} ${b.cx},${b.cy}`} fill="none" stroke={col} strokeWidth="3.4" strokeOpacity="0.10" />
                <path d={`M${a.cx},${a.cy} Q${mx},${my} ${b.cx},${b.cy}`} fill="none" stroke={col} strokeWidth="1.5"
                  strokeOpacity="0.6" strokeDasharray="2 8" strokeLinecap="round" className="motion-safe:animate-dash-flow" />
              </g>
            );
          }) : null}

          {/* operational fabric — infra tethered to nearest province */}
          {layers.infra ? infra.map(n => {
            const nx = n.x * 10, ny = n.y * 6.2;
            let best = PROV[0]!, bd = Infinity;
            for (const pv of PROV) { const d = (pv.cx - nx) ** 2 + (pv.cy - ny) ** 2; if (d < bd) { bd = d; best = pv; } }
            return <line key={`fb${n.id}`} x1={nx} y1={ny} x2={best.cx} y2={best.cy}
              stroke="rgb(var(--c-line))" strokeWidth="0.5" strokeOpacity="0.22" />;
          }) : null}

          {/* dependency / cascade edges */}
          {edges.slice(0, 26).map((e, i) => {
            const a = pos.get(e.fromId), b = pos.get(e.toId);
            if (!a || !b) return null;
            const tn = e.propagatedRisk >= 67 ? 'alert' : e.propagatedRisk >= 34 ? 'warn' : 'ok';
            return (
              <line key={i} x1={a.x * 10} y1={a.y * 6.2} x2={b.x * 10} y2={b.y * 6.2}
                stroke={TONE[tn]} strokeWidth={0.6 + (e.propagatedRisk / 100) * 2.2}
                strokeOpacity={0.16 + (e.propagatedRisk / 100) * 0.42} strokeDasharray="3 7"
                className="motion-safe:animate-dash-flow" />
            );
          })}

          {/* incident diffusion shock rings */}
          {layers.incidents ? mapNodes.filter(m => m.pressure >= 68).slice(0, 8).map(m => (
            <g key={`bl${m.ministryId}`}>
              <circle cx={m.x * 10} cy={m.y * 6.2} r="30" fill="none" stroke={TONE.alert} strokeWidth="1.6"
                className="origin-center animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
              <circle cx={m.x * 10} cy={m.y * 6.2} r={20 + pulse * 40} fill={TONE.alert} opacity={0.12 - pulse * 0.1} />
            </g>
          )) : null}
        </g>

        {provRisk.map(({ p, risk }) => {
          const tn = toneFor(risk);
          return (
            <g key={`l${p.n}`} style={{ pointerEvents: 'none' }}>
              <text x={p.cx} y={p.cy - 5} textAnchor="middle"
                className="fill-[rgb(var(--c-ink-soft))]" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
                {p.cap ? '★ ' : ''}{p.n}
              </text>
              <text x={p.cx} y={p.cy + 13} textAnchor="middle"
                style={{ fontSize: 12, fontWeight: 700, fill: TONE[tn] }}>
                {risk} · {tn === 'ok' ? 'STABLE' : tn === 'warn' ? 'ELEVATED' : tn === 'alert' ? 'CRITICAL' : 'WATCH'}
              </text>
              <text x={p.cx} y={p.cy + 27} textAnchor="middle"
                className="fill-[rgb(var(--c-ink-muted))]" style={{ fontSize: 9.5, letterSpacing: 1 }}>
                READINESS {Math.max(1, 100 - risk)}%
              </text>
            </g>
          );
        })}

        <rect width="1000" height="620" fill="url(#vignette)" style={{ pointerEvents: 'none' }} />
      </svg>

      {/* infrastructure nodes */}
      {layers.infra && infra.map(n => {
        const tone = toneFor(n.risk);
        const crit = n.risk >= 75;
        return (
          <span key={n.id} className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }} title={`${n.kind.label} · risk ${n.risk} · ${tone}`}>
            {crit ? <span className="absolute inset-0 -z-10 animate-ping rounded-full" style={{ backgroundColor: TONE.alert, opacity: 0.4 }} /> : null}
            <span className="grid h-5 w-5 place-items-center rounded-[4px] text-[9px] ring-1"
              style={{ backgroundColor: 'rgb(var(--c-surface-2))', color: TONE[tone], borderColor: TONE[tone], boxShadow: crit ? `0 0 8px ${TONE.alert}` : undefined }}>
              {n.kind.g}
            </span>
            {crit ? (
              <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded bg-surface/90 px-1 py-px text-[8px] font-semibold uppercase tracking-wide ring-1 ring-line" style={{ color: TONE.alert }}>{n.kind.label}</span>
            ) : (
              <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1 py-px text-[8px] text-ink-soft opacity-0 ring-1 ring-line transition-opacity group-hover:opacity-100">{n.kind.label} · {n.risk}</span>
            )}
          </span>
        );
      })}

      {/* labelled active incident markers (from live cross-ministry feed) */}
      {layers.incidents && incidents.slice(0, 7).map((inc, i) => {
        const host = mapNodes.find(m => m.ministry === inc.ministry) ?? mapNodes[i % Math.max(1, mapNodes.length)];
        const x = host ? host.x : 18 + seed(`ipx:${i}`) * 64;
        const y = host ? host.y : 20 + seed(`ipy:${i}`) * 56;
        const sv = inc.severity;
        const tn = sv === 'sev1' ? 'alert' : sv === 'sev2' ? 'alert' : sv === 'sev3' ? 'warn' : 'neutral';
        const lbl = sv === 'sev1' ? 'CRITICAL' : sv === 'sev2' ? 'ELEVATED' : sv === 'sev3' ? 'WARNING' : 'WATCH';
        return (
          <span key={`inc${i}`} className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x + 2.5}%`, top: `${y - 3}%` }} aria-hidden>
            <span className="flex items-center gap-1 whitespace-nowrap rounded-[3px] border px-1 py-px text-[8px] font-bold uppercase tracking-wider backdrop-blur"
              style={{ borderColor: TONE[tn], color: TONE[tn], backgroundColor: `color-mix(in srgb, ${TONE[tn]} 16%, rgb(var(--c-surface)))` }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[tn] }} />{lbl} · {inc.ministry}
            </span>
          </span>
        );
      })}

      {/* ministry command nodes */}
      {mapNodes.map(m => {
        const id = identityFor(m.archetype as ArchetypeKey);
        const tn = toneFor(m.pressure);
        return (
          <Link key={m.ministryId} href={`/gov/ministry/${m.ministryId}`}
            className="focus-ring group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${m.x}%`, top: `${m.y}%` }} title={`${m.ministry} · pressure ${m.pressure}`}>
            <span className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-bold text-white ring-2 transition-transform group-hover:scale-110"
              style={{ backgroundColor: id.accent, borderColor: TONE[tn], boxShadow: `0 0 16px ${TONE[tn]}66` }}>
              {id.glyph}
            </span>
            <span className="absolute left-1/2 top-10 -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1.5 py-0.5 text-[9px] text-ink-soft opacity-0 ring-1 ring-line transition-opacity group-hover:opacity-100">
              {m.ministry} · {m.pressure}
            </span>
          </Link>
        );
      })}

      {mapNodes.length === 0 ? <div className="absolute inset-0 grid place-items-center text-xs text-ink-muted">Awaiting institutional telemetry…</div> : null}

      {/* map controls — top-right */}
      <div className="absolute right-2 top-2 z-20 flex items-start gap-1.5">
        <div className="relative">
          <button type="button" onClick={() => onToggleLayer && setLayerOpen(o => !o)} aria-expanded={layerOpen}
            className="focus-ring flex items-center gap-1 rounded-[3px] border border-line bg-surface/85 px-2 py-1 text-[10px] text-ink-soft backdrop-blur transition-colors hover:text-ink">
            <span style={{ color: ACCENT }}>⧉</span> All Layers <span className="text-ink-muted">{layerOpen ? '▴' : '▾'}</span>
          </button>
          {layerOpen && onToggleLayer ? (
            <div className="absolute right-0 mt-1 w-40 overflow-hidden rounded-[3px] border border-line bg-surface shadow-elev-3">
              {([['infra', 'Infrastructure'], ['grid', 'Grid'], ['corridors', 'Corridors'], ['incidents', 'Incidents']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => onToggleLayer(k)}
                  className="focus-ring flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[11px] text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">
                  <span>{l}</span>
                  <span className="h-2.5 w-4 rounded-full" style={{ backgroundColor: layers[k] ? ACCENT : 'rgb(var(--c-line))' }} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" onClick={fullscreen} aria-label="Toggle fullscreen"
          className="focus-ring grid h-7 w-7 place-items-center rounded-[3px] border border-line bg-surface/85 text-[11px] text-ink-soft backdrop-blur transition-colors hover:text-ink">⛶</button>
      </div>

      {/* map controls — left tactical stack (functional) */}
      <div className="absolute left-2 top-2 z-20 flex flex-col gap-1">
        {([
          { i: '◎', t: 'Tactical framing', on: tactical, act: () => setTactical(v => !v) },
          { i: '✸', t: 'Heat intensity', on: heat, act: () => setHeat(v => !v) },
          { i: '▦', t: 'Grid overlay', on: layers.grid, act: () => onToggleLayer?.('grid') },
          { i: '⚠', t: 'Incident diffusion', on: layers.incidents, act: () => onToggleLayer?.('incidents') },
        ]).map(b => (
          <button key={b.t} title={b.t} type="button" onClick={b.act}
            className="focus-ring grid h-7 w-7 place-items-center rounded-[3px] border bg-surface/85 text-[12px] backdrop-blur transition-colors"
            style={{ borderColor: b.on ? ACCENT : 'rgb(var(--c-line))', color: b.on ? ACCENT : 'rgb(var(--c-ink-soft))' }}>{b.i}</button>
        ))}
      </div>

      <div className="absolute bottom-12 left-2 flex flex-wrap gap-3 rounded-[3px] border border-line bg-surface/85 px-2.5 py-1 text-[10px] text-ink-muted backdrop-blur">
        {(['ok', 'neutral', 'warn', 'alert'] as const).map(t => (<span key={t} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE[t] }} />{t === 'ok' ? 'Stable' : t === 'neutral' ? 'Watch' : t === 'warn' ? 'Elevated' : 'Critical'}</span>))}
        <span className="flex items-center gap-2 border-l border-line pl-2">
          <span className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: CORR_TONE.energy }} />energy</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: CORR_TONE.logistics }} />logistics</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: CORR_TONE.air }} />air</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: CORR_TONE.maritime }} />maritime</span>
        </span>
        <span className="flex items-center gap-1 border-l border-line pl-2">✚ medical ⚓ port ✈ air ⚡ power ▣ logistics ◑ water</span>
      </div>

      {/* in-map operational telemetry strip — keeps the theatre occupied */}
      <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-px border-t border-line bg-line/80 text-[10px] backdrop-blur sm:grid-cols-5">
        {overlay.map(o => (
          <div key={o.l} className="flex items-center justify-between gap-2 bg-surface/80 px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{o.l}</span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[o.t] }}>
              <span className="h-1.5 w-1.5 animate-breathe rounded-full" style={{ backgroundColor: TONE[o.t] }} />{o.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SituationRoom() {
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [layers, setLayers] = React.useState({ infra: true, grid: false, corridors: true, incidents: true });
  const [warManual, setWarManual] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const [n, c, s] = await Promise.all([
        api.cabinet.national().catch(() => null),
        api.cabinet.coordination().catch(() => null),
        api.sovereign.get().then(r => r.sovereign).catch(() => null),
      ]);
      setNat(n); setCoord(c); setSov(s);
    };
    void load();
    const poll = setInterval(() => void load(), 10_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const tickN = coord?.tick ?? 0;
  const epoch = Math.floor(tickN / 2);
  const identity = sov ? resolveIdentity(sov) : null;

  const regions = React.useMemo(
    () => Array.from({ length: 16 }).map((_, i) => ({
      id: `R${i + 1}`,
      x: 8 + seed(`rx:${i}`) * 84,
      y: 14 + seed(`ry:${i}`) * 72,
      r: 30 + seed(`rr:${i}`) * 30,
      risk: Math.round(seed(`reg:${i}:${epoch}`) * 100),
    })),
    [epoch],
  );

  const nodes = coord?.nodes ?? [];
  const fabricById = new Map((coord?.fabric ?? []).map(f => [f.ministryId, f]));
  const mapNodes = nodes.map((nd, i) => ({
    ...nd,
    x: 14 + seed(`mx:${nd.ministryId}`) * 72,
    y: 18 + ((i % 5) / 4) * 60 + (seed(`my:${nd.ministryId}`) - 0.5) * 10,
    pressure: fabricById.get(nd.ministryId)?.pressure ?? nd.riskScore,
    trend: fabricById.get(nd.ministryId)?.trend ?? 'steady',
  }));
  const nodePos = new Map(mapNodes.map(m => [m.ministryId, m]));

  const incidents = nat?.crossMinistryIncidents ?? [];
  const sev = (s: string) => incidents.filter(i => i.severity === s).length;
  const donut = [
    { label: 'Critical', value: sev('sev1'), tone: 'alert' },
    { label: 'Elevated', value: sev('sev2'), tone: 'alert' },
    { label: 'Warning', value: sev('sev3'), tone: 'warn' },
    { label: 'Informational', value: sev('sev4'), tone: 'neutral' },
  ];
  const finance = nodes.find(n => n.archetype === 'FINANCE');
  const ts = now / 4000;
  const revPts = waveSeries('sr:rev', ts, 18, 80, 130);
  const expPts = waveSeries('sr:exp', ts, 18, 70, 110);
  const mhPts = waveSeries('sr:mh', ts, 14, 70, 98);
  const revenue = (110 + seed(`rv:${epoch}`) * 30).toFixed(1);
  const expenditure = (90 + seed(`ex:${epoch}`) * 20).toFixed(1);
  const integ = 96 + seed(`int:${epoch}`) * 3.9;
  const totals = nat?.totals ?? null;
  const posture = coord?.posture;
  const pending = nodes.reduce((s, n) => s + n.queueDepth, 0) * 37 + 142;
  const indV = (l: string) => nat?.indicators.find(x => x.label.toLowerCase().includes(l))?.value ?? '—';
  const mhealth = nodes.length ? Math.round((nodes.filter(n => n.posture === 'ok').length / nodes.length) * 100) : 100;

  const cal = [
    { t: 'Cabinet economic review', m: 11 },
    { t: 'National security briefing', m: 101 },
    { t: 'Infrastructure progress review', m: 191 },
  ];
  const alerts = (coord?.chronology ?? [])
    .filter(c => c.tone === 'alert' || c.tone === 'warn')
    .slice(-3)
    .reverse();

  const nationalRisk = posture?.nationalRisk ?? 42;
  const pressOf = (arch: string) => {
    const n = nodes.find(x => x.archetype === arch);
    return n ? (fabricById.get(n.ministryId)?.pressure ?? n.riskScore) : 28 + Math.round(seed(`syn:${arch}:${epoch}`) * 48);
  };
  const critCount = sev('sev1');
  const autoWar = critCount >= 1 || posture?.level === 'alert' || incidents.length >= 6;
  const war = warManual ?? autoWar;

  const cmdItems: CommandItem[] = [
    { id: 's-sr', group: 'Surfaces', label: 'Situation Room', href: '/gov/situation-room' },
    { id: 's-cab', group: 'Surfaces', label: 'Cabinet Intelligence', href: '/gov' },
    { id: 's-coord', group: 'Surfaces', label: 'National Coordination', href: '/gov/coordination' },
    { id: 's-ops', group: 'Surfaces', label: 'Operations Centre', href: '/ops' },
    { id: 's-aud', group: 'Surfaces', label: 'Oversight & Audit', href: '/audit' },
    { id: 's-min', group: 'Surfaces', label: 'Institutions Admin', href: '/ministries' },
    { id: 's-cfg', group: 'Surfaces', label: 'Sovereign Configuration', href: '/gov/configuration' },
    ...mapNodes.map(m => ({ id: `m-${m.ministryId}`, group: 'Ministries', label: m.ministry, hint: `pressure ${m.pressure}`, href: `/gov/ministry/${m.ministryId}` })),
    ...incidents.slice(0, 12).map((c, i) => ({ id: `i-${i}`, group: 'Incident jump', label: c.label, hint: c.ministry, href: `/gov/ministry/${c.ministryId}` })),
  ];

  // Executive operational instruments — value · drift · trajectory · spark.
  const mkInstr = (l: string, val: number, unit: string, goodHigh: boolean, sk: string) => {
    const prev = Math.round(val + (seed(`prev:${sk}:${epoch}`) - 0.5) * 14);
    const d = val - prev;
    const sevV = goodHigh ? 100 - val : val;
    return {
      l, v: `${val}${unit}`,
      t: toneFor(sevV) as string,
      d, traj: d > 1 ? '↗' : d < -1 ? '↘' : '→',
      spark: waveSeries(`is:${sk}`, ts, 16, 35, 95),
      dot: false,
    };
  };
  const stabilityIdx = Math.max(1, 100 - nationalRisk);
  const instruments = [
    mkInstr('National Stability Index', stabilityIdx, '', true, 'stab'),
    { l: 'Institutional Pressure', v: posture?.label ?? 'STABLE', t: posture?.level ?? 'ok', d: 0, traj: '→', spark: mhPts, dot: true },
    mkInstr('Economic Resilience', 55 + Math.round(seed(`er:${epoch}`) * 24), '%', true, 'er'),
    { l: 'Treasury Liquidity', v: `$${revenue}B`, t: 'ok', d: 1, traj: '↗', spark: revPts, dot: false },
    mkInstr('Energy Stability', Math.max(1, 100 - pressOf('ENERGY')), '%', true, 'en'),
    mkInstr('Healthcare Capacity', Math.max(1, 100 - pressOf('HEALTH')), '%', true, 'hc'),
    mkInstr('Civil Stability', Math.max(1, 100 - Math.round(nationalRisk * 0.9)), '%', true, 'cs'),
    mkInstr('Infrastructure Integrity', Math.max(1, 100 - pressOf('TRANSPORT')), '%', true, 'ii'),
    mkInstr('Security Readiness', Math.max(1, 100 - pressOf('INTERIOR')), '%', true, 'sr'),
    mkInstr('Constitutional Integrity', totals?.auditIntact === false ? 71 : 96 + Math.round(seed(`ci:${epoch}`) * 3), '%', true, 'ci'),
  ];

  return (
    <div className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]"
      style={{ ...PALETTE, ...(war ? { ['--accent' as string]: TONE.alert } : {}) }}>
      <CommandPalette items={cmdItems} accent={war ? TONE.alert : ACCENT} />
      {war ? (
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-1.5 text-xs"
          style={{ backgroundColor: `color-mix(in srgb, ${TONE.alert} 16%, transparent)`, borderBottom: `1px solid ${TONE.alert}` }}>
          <span className="flex items-center gap-2 font-semibold uppercase tracking-[0.22em]" style={{ color: TONE.alert }}>
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: TONE.alert }} />
            War Room · National crisis coordination · {critCount} critical · {incidents.length} active
          </span>
          <button onClick={() => setWarManual(w => (w === false ? null : false))}
            className="focus-ring rounded border px-2 py-0.5 text-[10px] uppercase tracking-widest"
            style={{ borderColor: TONE.alert, color: TONE.alert }}>
            {autoWar ? 'Acknowledge' : 'Stand down'}
          </button>
        </div>
      ) : null}
      {/* Command top bar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        <Link href="/" className="focus-ring flex items-center gap-2.5 no-underline">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-sm text-sm font-bold text-white ring-1 ring-white/15"
            style={{ backgroundColor: ACCENT }}>
            {identity ? identity.seal : 'CO'}
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-[0.18em] text-ink">CIVICOS</span>
            <span className="block text-[9px] uppercase tracking-[0.16em] text-ink-muted">Sovereign Operating System</span>
          </span>
        </Link>
        <div className="hidden flex-1 text-center md:block">
          <div className="text-sm font-semibold tracking-[0.22em] text-ink">NATIONAL SITUATION ROOM</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">Real-time command &amp; coordination</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button type="button"
            onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true }); window.dispatchEvent(e); }}
            className="focus-ring hidden items-center gap-1.5 rounded-sm border border-line bg-bg px-2 py-1 text-xs text-ink-muted transition-colors hover:text-ink lg:flex">
            <span style={{ color: ACCENT }}>⌕</span> Global search
            <kbd className="ml-1 rounded border border-line px-1 text-[9px] text-ink-muted">⌘K</kbd>
          </button>
          <span className="hidden items-center gap-1 rounded-sm border border-line px-2 py-1 text-[10px] text-ink-muted lg:flex">
            <span style={{ color: TONE.alert }}>⚑</span> {incidents.length} esc
            <span className="mx-1 text-line">·</span>
            <span style={{ color: ACCENT }}>✉</span> {3 + (epoch % 4)} briefs
            <span className="mx-1 text-line">·</span>
            <span style={{ color: TONE.ok }}>$</span> {revenue}B
          </span>
          <span className="hidden font-mono text-xs tabular-nums text-ink-muted sm:inline">{new Date(now).toLocaleTimeString()}</span>
          <button onClick={() => setWarManual(w => (w === true ? null : true))}
            className="focus-ring rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors"
            style={{ borderColor: war ? TONE.alert : 'rgb(var(--c-line))', color: war ? TONE.alert : 'rgb(var(--c-ink-muted))', backgroundColor: war ? `color-mix(in srgb, ${TONE.alert} 14%, transparent)` : 'transparent' }}
            title="Toggle War Room posture">
            ⚑ War Room
          </button>
          <span className="flex items-center gap-1.5 rounded-sm border border-line px-2 py-1">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: war ? TONE.alert : TONE.ok }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{war ? 'CRISIS' : 'Live'} · T{tickN}</span>
          </span>
          <span className="border-l border-line pl-3">
            <ExecutiveMenu title={sov?.executiveTitle ?? 'Executive Office'} sub="Head of Government" accent={war ? TONE.alert : ACCENT} />
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Icon command rail */}
        <nav aria-label="Situation Room navigation" className="hidden w-[212px] shrink-0 flex-col border-r border-line bg-bg lg:flex">
          <div className="flex-1 overflow-y-auto py-1">
            {RAIL.map(grp => (
              <div key={grp.g} className="mb-0.5">
                <div className="px-3 pb-0.5 pt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{grp.g}</div>
                {grp.items.map(it => (
                  <Link key={it.l} href={it.href}
                    className={`focus-ring flex items-center gap-2 border-l-2 px-3 py-1 no-underline transition-colors duration-150 ${
                      it.on ? 'bg-surface-2 font-medium' : 'border-transparent text-ink-muted hover:bg-surface-2/50 hover:text-ink'
                    }`}
                    style={it.on ? { borderLeftColor: ACCENT } : undefined}>
                    <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-[4px] bg-surface-2 text-[10px] ring-1 ring-line"
                      style={it.on ? { color: ACCENT } : { color: 'rgb(var(--c-ink-soft))' }}>{it.i}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px]" style={it.on ? { color: ACCENT } : undefined}>{it.l}</span>
                      <span className="block truncate text-[8.5px] text-ink-muted">{it.s}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <button onClick={() => setWarManual(w => (w === true ? null : true))}
            className="focus-ring mx-2 mb-1 mt-1 flex items-center gap-2 rounded border px-2.5 py-1.5 text-left text-[11px]"
            style={{ borderColor: war ? TONE.alert : 'rgb(var(--c-line))', backgroundColor: war ? `color-mix(in srgb, ${TONE.alert} 12%, transparent)` : 'transparent' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE.alert }} />
            <span><span className="block font-semibold uppercase tracking-widest" style={{ color: TONE.alert }}>Command Mode</span><span className="block text-ink-muted">{war ? 'War Room — active' : 'War Room'}</span></span>
          </button>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-t border-line px-3 py-2 text-[9px]">
            <div className="text-ink-muted">System</div><div className="text-right" style={{ color: TONE.ok }}>Operational</div>
            <div className="text-ink-muted">Environment</div><div className="text-right text-ink-soft">{nat?.environment ?? 'Production'}</div>
            <div className="text-ink-muted">Version</div><div className="text-right text-ink-soft">v2.1.0</div>
            <div className="text-ink-muted">Channel</div><div className="text-right" style={{ color: TONE.ok }}>Encrypted</div>
          </div>
        </nav>

        {/* Operational canvas */}
        <main className="min-w-0 flex-1 space-y-2 overflow-y-auto p-2"
          style={{ backgroundImage: 'linear-gradient(rgba(55,199,212,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(55,199,212,0.022) 1px, transparent 1px)', backgroundSize: '36px 36px' }}>
          {/* Row 1 — executive telemetry (10) */}
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 xl:grid-cols-10">
            {instruments.map(t => (
              <div key={t.l} className="rounded-[3px] border border-line bg-surface px-2 py-1.5"
                style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
                <div className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t.l}</div>
                <div className="flex items-center gap-1 font-mono text-[15px] leading-tight tabular-nums" style={{ color: t.t ? TONE[t.t] : 'rgb(var(--c-ink))' }}>
                  {t.dot ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[t.t ?? 'ok'] }} /> : null}
                  <LiveValue raw={t.v} />
                  <span className="ml-auto text-[10px]" style={{ color: t.d > 0 ? TONE.ok : t.d < 0 ? TONE.alert : TONE.neutral }}>{t.traj}{t.d ? Math.abs(t.d) : ''}</span>
                </div>
                <div className="mt-1 opacity-80"><Spark pts={t.spark} tone={t.t ?? 'ok'} /></div>
              </div>
            ))}
          </div>

          {/* Map-first band */}
          <div className="grid gap-2 xl:grid-cols-12">
            <Panel title="National activity map"
              meta={
                <span className="flex items-center gap-1">
                  {([['infra', 'Infra'], ['grid', 'Grid'], ['corridors', 'Corridors'], ['incidents', 'Incidents']] as const).map(([k, lbl]) => (
                    <button key={k} type="button" onClick={() => setLayers(s => ({ ...s, [k]: !s[k] }))}
                      className="focus-ring rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors"
                      style={{
                        backgroundColor: layers[k] ? `color-mix(in srgb, ${ACCENT} 20%, transparent)` : 'transparent',
                        color: layers[k] ? ACCENT : 'rgb(var(--c-ink-muted))',
                      }}
                      aria-pressed={layers[k]}>
                      {lbl}
                    </button>
                  ))}
                </span>
              }
              className="xl:col-span-6" bodyClass="!p-2">
              <NationalMap mapNodes={mapNodes} edges={coord?.edges ?? []} incidents={incidents} now={now} layers={layers} epoch={epoch} focus={sov?.stateName} onToggleLayer={k => setLayers(s => ({ ...s, [k]: !s[k] }))} />
            </Panel>

            <Panel title="Ministry status matrix" meta="cross-domain risk" className="xl:col-span-4" bodyClass="!p-0">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-line bg-surface-2 text-left text-[8px] uppercase tracking-wide text-ink-muted">
                    <th className="px-2 py-1.5">Ministry</th>
                    {['Ops', 'Fisc', 'Infra', 'Civil', 'Sec', 'Logi', 'SLA', 'Esc', 'Work', 'Emrg'].map(d => (
                      <th key={d} className="px-1 py-1.5 text-center">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapNodes.map(m => {
                    const id = identityFor(m.archetype as ArchetypeKey);
                    const cell = (dom: string) => {
                      const v = domainStress(m.archetype as string, dom.toLowerCase(), m.pressure, ts, m.ministryId);
                      const st = v >= 78 ? 'alert' : v >= 58 ? 'warn' : v >= 40 ? 'neutral' : 'ok';
                      const lbl = st === 'alert' ? 'CRIT' : st === 'warn' ? 'ELEV' : st === 'neutral' ? 'WTCH' : 'STBL';
                      return (
                        <td key={dom} className="px-1 py-1.5 text-center">
                          <span className="inline-block w-full rounded px-1 py-0.5 text-[8.5px] font-semibold"
                            style={{ backgroundColor: `color-mix(in srgb, ${TONE[st]} 16%, transparent)`, color: TONE[st] }}>{lbl}</span>
                        </td>
                      );
                    };
                    return (
                      <tr key={m.ministryId} className="border-b border-line-soft transition-colors hover:bg-surface-2/50 last:border-0">
                        <td className="px-2 py-1.5">
                          <Link href={`/gov/ministry/${m.ministryId}`} className="focus-ring flex items-center gap-1.5 no-underline">
                            <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] text-[7px] text-white" style={{ backgroundColor: id.accent }}>{id.glyph}</span>
                            <span className="truncate text-ink">{m.ministry}</span>
                          </Link>
                        </td>
                        {['Ops', 'Fisc', 'Infra', 'Civil', 'Sec', 'Logi', 'SLA', 'Esc', 'Work', 'Emrg'].map(cell)}
                      </tr>
                    );
                  })}
                  {mapNodes.length === 0 ? <tr><td colSpan={11} className="px-3 py-8 text-center text-ink-muted">No active institutions.</td></tr> : null}
                </tbody>
              </table>
            </Panel>

            <Panel title="Cabinet escalation stream" meta="executive level" className="xl:col-span-2" bodyClass="!p-0">
              {incidents.length === 0 ? <p className="p-3 text-xs text-ink-muted">No active cross-ministry escalations.</p> : incidents.slice(0, 9).map((c, i) => {
                const id = identityFor(c.archetype);
                const tn = c.severity === 'sev1' || c.severity === 'sev2' ? 'alert' : c.severity === 'sev3' ? 'warn' : 'neutral';
                const pop = (0.2 + seed(`pop:${c.ministry}:${i}`) * 7.8).toFixed(1);
                const prop = Math.round(40 + seed(`pr:${c.ministry}:${i}:${epoch}`) * 58);
                const ageM = 2 + Math.floor(seed(`ag:${c.ministry}:${i}`) * 58);
                const lvl = c.severity === 'sev1' ? 3 : c.severity === 'sev2' ? 2 : 1;
                const regionsN = 1 + Math.floor(seed(`rgn:${c.ministry}:${i}`) * 13);
                const ack = seed(`ack:${c.ministry}:${i}:${epoch}`) > 0.45;
                const treas = c.severity === 'sev1' ? 'Reserve intervention' : c.severity === 'sev2' ? 'Contingency draw' : 'Within budget';
                const owner = c.authority;
                const eta = lvl === 3 ? `${1 + (epoch % 4)}h` : lvl === 2 ? `${4 + (epoch % 6)}h` : `${12 + (epoch % 12)}h`;
                const linked = (coord?.edges ?? []).filter(e => e.fromId === c.ministryId || e.toId === c.ministryId).length;
                const rec = c.severity === 'sev1' ? 'Convene Cabinet · activate War Room' : c.severity === 'sev2' ? 'Regional coordination · pre-position reserves' : 'Ministry-level containment';
                return (
                  <Link key={i} href={`/gov/ministry/${c.ministryId}`} className="focus-ring block border-b border-line-soft px-3 py-2 no-underline transition-colors hover:bg-surface-2/50 last:border-0" style={{ borderLeft: `3px solid ${TONE[tn]}` }}>
                    <div className="flex items-center justify-between">
                      <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tn]} 18%, transparent)`, color: TONE[tn] }}>
                        {c.severity === 'sev1' ? 'Critical' : c.severity === 'sev2' ? 'Elevated' : c.severity === 'sev3' ? 'Warning' : 'Info'} · L{lvl}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-ink-muted">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ack ? TONE.ok : TONE.warn }} title={ack ? 'Acknowledged' : 'Unacknowledged'} />
                        {ageM}m
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs font-medium text-ink">{c.label}</div>
                    <div className="truncate text-[10px] text-ink-muted">{id.glyph} {c.ministry} · owner {owner}</div>
                    <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-ink-muted">
                      <span>~{pop}M · {regionsN} regions</span>
                      <span className="text-right" style={{ color: prop >= 70 ? TONE.alert : prop >= 50 ? TONE.warn : TONE.neutral }}>propagation {prop}%</span>
                      <span>treasury: {treas}</span>
                      <span className="text-right">ETA {eta} · {linked} linked</span>
                    </div>
                    <div className="mt-1 truncate text-[9px]" style={{ color: TONE.warn }}>▸ {rec}</div>
                  </Link>
                );
              })}
            </Panel>
          </div>

          {/* Dependency intelligence + strategic forecast */}
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <Panel title="National dependency graph" meta="systemic impact propagation" bodyClass="!pb-2">
              {(() => {
                const dep = [
                  { k: 'Energy', g: '⚡', a: 'ENERGY', x: 14, y: 30 },
                  { k: 'Transport', g: '⇄', a: 'TRANSPORT', x: 42, y: 18 },
                  { k: 'Healthcare', g: '✚', a: 'HEALTH', x: 80, y: 30 },
                  { k: 'Treasury', g: '§', a: 'FINANCE', x: 40, y: 76 },
                  { k: 'Civil Stability', g: '◈', a: 'INTERIOR', x: 78, y: 78 },
                ].map(d => ({ ...d, p: pressOf(d.a) }));
                const links: [number, number][] = [[0, 1], [1, 2], [0, 2], [2, 3], [1, 3], [3, 4], [2, 4]];
                return (
                  <div className="relative h-[188px] w-full">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                      {links.map(([a, b], i) => {
                        const A = dep[a], B = dep[b];
                        if (!A || !B) return null;
                        const t = Math.max(A.p, B.p);
                        const tn = t >= 67 ? 'alert' : t >= 40 ? 'warn' : 'ok';
                        return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={TONE[tn]} strokeWidth="0.7"
                          strokeOpacity={0.3 + (t / 100) * 0.5} strokeDasharray={t >= 67 ? '0' : '2 3'}
                          className={t >= 67 ? 'motion-safe:animate-[shimmer_2s_linear_infinite]' : ''} vectorEffect="non-scaling-stroke" />;
                      })}
                    </svg>
                    {dep.map(d => {
                      const tn = toneFor(d.p);
                      return (
                        <span key={d.k} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${d.x}%`, top: `${d.y}%` }}>
                          <span className="grid h-9 w-9 place-items-center rounded-full text-sm ring-2" style={{ backgroundColor: 'rgb(var(--c-surface-2))', color: TONE[tn], borderColor: TONE[tn], boxShadow: d.p >= 67 ? `0 0 10px ${TONE.alert}` : undefined }}>{d.g}</span>
                          <span className="mt-0.5 block text-[9px] text-ink-muted">{d.k}</span>
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
              <div className="flex gap-3 text-[10px] text-ink-muted">
                <span className="flex items-center gap-1"><span className="h-px w-4" style={{ backgroundColor: TONE.ok }} />Direct</span>
                <span className="flex items-center gap-1"><span className="h-px w-4 border-t border-dashed" style={{ borderColor: TONE.warn }} />Indirect</span>
                <span className="flex items-center gap-1"><span className="h-px w-4" style={{ backgroundColor: TONE.alert }} />Critical path</span>
              </div>
            </Panel>
            <Panel title="Operational timeline" meta="live tempo" bodyClass="!p-0">
              {(coord?.timeline ?? []).slice(0, 9).map((e, i) => {
                const phase = e.tone === 'alert' ? 'Containment' : e.tone === 'warn' ? 'Assessment' : 'Coordination';
                const res = e.tone === 'alert' ? 'Open' : e.tone === 'warn' ? 'In progress' : 'Monitored';
                return (
                  <div key={i} className="border-b border-line-soft px-3 py-1.5 text-xs last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] tabular-nums text-ink-muted">{rel(e.at, now)}</span>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[e.tone] ?? TONE.neutral }} />
                      <span className="truncate text-ink-soft">{e.title}</span>
                    </div>
                    <div className="ml-[42px] flex items-center gap-2 text-[9px] text-ink-muted">
                      <span style={{ color: TONE[e.tone] ?? TONE.neutral }}>{phase}</span>
                      <span className="border-l border-line pl-2">{res}</span>
                    </div>
                  </div>
                );
              })}
              {(coord?.timeline ?? []).length === 0 ? <p className="p-3 text-xs text-ink-muted">Awaiting operational events…</p> : null}
            </Panel>
            <Panel title="Strategic forecast · 72h" meta="advisory simulation">
              <ul className="space-y-2 text-xs">
                {[
                  { l: 'Energy reserve threshold', v: `In ${10 + Math.round(seed(`f1:${epoch}`) * 40)}h`, t: pressOf('ENERGY') >= 60 ? 'alert' : 'warn' },
                  { l: 'Hospital capacity stress', v: `+${8 + Math.round(seed(`f2:${epoch}`) * 18)}%`, t: pressOf('HEALTH') >= 55 ? 'alert' : 'warn' },
                  { l: 'Logistics disruption probability', v: pressOf('TRANSPORT') >= 60 ? 'High' : 'Moderate', t: pressOf('TRANSPORT') >= 60 ? 'alert' : 'warn' },
                  { l: 'Treasury stress forecast', v: 'Intervention within 48h', t: 'warn' },
                  { l: 'Infrastructure degradation', v: `${4 + Math.round(seed(`f5:${epoch}`) * 9)}% / wk`, t: 'neutral' },
                  { l: 'Civil unrest probability', v: nationalRisk >= 60 ? 'Elevated' : 'Low–Moderate', t: nationalRisk >= 60 ? 'alert' : 'ok' },
                ].map(f => (
                  <li key={f.l} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE[f.t] }} /><span className="text-ink-soft">{f.l}</span></span>
                    <span className="font-mono text-[11px] tabular-nums" style={{ color: TONE[f.t] }}>{f.v}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Advisory projection only — no autonomous action. Executive decides.</p>
            </Panel>
            <Panel title="Regional risk heatmap" meta="exposure by region" bodyClass="!p-2">
              <TerritoryHeat epoch={epoch} height={150} focus={sov?.stateName} />
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
                <span>Low</span>
                <span className="mx-2 h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${TONE.ok}, ${TONE.warn}, ${TONE.alert})` }} />
                <span>Critical</span>
              </div>
            </Panel>
          </div>

          {/* Operational analytics band */}
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <Panel title="Incident severity distribution" meta="by classification"><Donut segs={donut} /></Panel>
            <Panel title="Treasury flow monitor" meta="24h revenue · expenditure">
              <div className="space-y-2">
                <div>
                  <div className="flex items-baseline justify-between"><span className="text-[10px] uppercase tracking-wide text-ink-muted">Revenue</span><span className="font-mono text-sm tabular-nums" style={{ color: TONE.ok }}>${revenue}B</span></div>
                  <Spark pts={revPts} tone="ok" />
                </div>
                <div>
                  <div className="flex items-baseline justify-between"><span className="text-[10px] uppercase tracking-wide text-ink-muted">Expenditure</span><span className="font-mono text-sm tabular-nums" style={{ color: TONE.warn }}>${expenditure}B</span></div>
                  <Spark pts={expPts} tone="warn" />
                </div>
                {finance ? <Link href={`/gov/ministry/${finance.ministryId}`} className="focus-ring block text-[11px] text-link underline underline-offset-2">Open Treasury command →</Link> : null}
              </div>
            </Panel>
            <Panel title="System integration" meta="data fabric">
              <ul className="space-y-1 text-[11px]">
                {['Health', 'Treasury', 'Transport', 'Security', 'Energy'].map((s, i) => {
                  const deg = seed(`sis:${i}:${epoch}`) > 0.86;
                  return <li key={s} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: deg ? TONE.alert : TONE.ok }} /><span className="text-ink-soft">{s} System</span><span className="ml-auto text-[10px]" style={{ color: deg ? TONE.alert : TONE.ok }}>{deg ? 'Degraded' : 'Online'}</span></li>;
                })}
              </ul>
            </Panel>
            <Panel title="Quick actions" meta="human-authorised">
              <div className="grid gap-1.5">
                {[
                  { l: 'National coordination', h: '/gov/coordination' },
                  { l: 'Cabinet intelligence', h: '/gov' },
                  { l: 'Operations centre', h: '/ops' },
                  { l: 'Oversight & audit', h: '/audit' },
                ].map(a => (
                  <Link key={a.l} href={a.h} className="focus-ring flex items-center justify-between rounded-sm border border-line bg-bg px-2.5 py-1.5 text-[11px] text-ink-soft no-underline transition-colors hover:border-link/40 hover:text-ink"><span>{a.l}</span><span className="text-ink-muted">→</span></Link>
                ))}
              </div>
            </Panel>
          </div>

          {/* Executive band */}
          <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
            <Panel title="System integration fabric" meta="cross-government" bodyClass="">
              <div className="mb-2 flex items-center gap-3">
                <Ring pct={integ} label="integrated" />
                <div className="text-[10px] text-ink-muted">
                  <div className="font-mono text-lg tabular-nums" style={{ color: TONE.ok }}>{(9 - Math.round(seed(`deg:${epoch}`) * 1.6))}/9</div>
                  systems nominal
                </div>
              </div>
              <table className="w-full text-[10px]">
                <tbody>
                  {['Health', 'Treasury', 'Security', 'Transport', 'Energy', 'National Registry', 'Emergency Comms', 'Border Systems', 'Intelligence'].map((s, i) => {
                    const node = nodes.find(n => n.ministry.toLowerCase().includes(s.toLowerCase()));
                    const deg = (node?.posture === 'alert') || seed(`sys:${i}:${epoch}`) > 0.88;
                    const up = (deg ? 95 + seed(`u:${i}:${epoch}`) * 4 : 99 + seed(`u:${i}:${epoch}`) * 0.99);
                    const lat = Math.round((deg ? 80 : 12) + seed(`lt:${i}:${epoch}`) * (deg ? 220 : 40));
                    return (
                      <tr key={s} className="border-b border-line-soft last:border-0">
                        <td className="py-1"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: deg ? TONE.alert : TONE.ok }} /><span className="text-ink-soft">{s}</span></span></td>
                        <td className="py-1 text-right font-mono tabular-nums text-ink-muted">{up.toFixed(2)}%</td>
                        <td className="py-1 text-right font-mono tabular-nums" style={{ color: lat > 150 ? TONE.alert : lat > 60 ? TONE.warn : 'rgb(var(--c-ink-soft))' }}>{lat}ms</td>
                        <td className="py-1 text-right text-[9px]" style={{ color: deg ? TONE.alert : TONE.ok }}>{deg ? 'Degraded' : 'Synced'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
            <Panel title="National KPI snapshot" meta="macro-state intelligence" bodyClass="">
              <ul className="space-y-1.5 text-xs">
                {[
                  { l: 'Inflation', v: `${(2 + seed(`m1:${epoch}`) * 4).toFixed(1)}%`, d: seed(`d1:${epoch}`) - 0.55, intp: 'within target band' },
                  { l: 'Unemployment', v: `${(4 + seed(`m2:${epoch}`) * 5).toFixed(1)}%`, d: seed(`d2:${epoch}`) - 0.5, intp: 'labour market stable' },
                  { l: 'Public satisfaction', v: `${(64 + seed(`m3:${epoch}`) * 18).toFixed(0)}%`, d: seed(`d3:${epoch}`) - 0.45, intp: 'civil sentiment steady' },
                  { l: 'Healthcare response', v: `${(8 + seed(`m4:${epoch}`) * 10).toFixed(0)}m`, d: 0.5 - seed(`d4:${epoch}`), intp: 'within SLA' },
                  { l: 'Education continuity', v: `${(90 + seed(`m5:${epoch}`) * 9).toFixed(0)}%`, d: seed(`d5:${epoch}`) - 0.4, intp: 'nominal' },
                  { l: 'Fuel reserve', v: `${(18 + seed(`m6:${epoch}`) * 20).toFixed(0)}d`, d: 0.5 - seed(`d6:${epoch}`), intp: pressOf('ENERGY') >= 60 ? 'monitor closely' : 'adequate' },
                  { l: 'Energy availability', v: `${Math.max(1, 100 - pressOf('ENERGY'))}%`, d: 0.5 - seed(`d7:${epoch}`), intp: pressOf('ENERGY') >= 60 ? 'stressed' : 'stable' },
                  { l: 'Food security', v: `${(78 + seed(`m8:${epoch}`) * 14).toFixed(0)}`, d: seed(`d8:${epoch}`) - 0.4, intp: 'secure' },
                  { l: 'Logistics continuity', v: `${Math.max(1, 100 - pressOf('TRANSPORT'))}%`, d: 0.5 - seed(`d9:${epoch}`), intp: pressOf('TRANSPORT') >= 60 ? 'congested' : 'flowing' },
                  { l: 'Emergency readiness', v: `${(82 + seed(`m10:${epoch}`) * 14).toFixed(0)}%`, d: seed(`d10:${epoch}`) - 0.4, intp: 'ready' },
                ].map(k => (
                  <li key={k.l} className="flex items-center justify-between gap-2">
                    <span className="min-w-0"><span className="block text-ink-soft">{k.l}</span><span className="block text-[9px] text-ink-muted">{k.intp}</span></span>
                    <span className="flex items-center gap-2 text-right"><span className="font-mono tabular-nums text-ink">{k.v}</span><span className="w-7 text-[10px]" style={{ color: k.d >= 0 ? TONE.ok : TONE.alert }}>{k.d >= 0 ? '▲' : '▼'}{Math.abs(k.d * 4).toFixed(1)}</span></span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Top operational alerts" meta="high impact">
              {alerts.length === 0 ? <p className="text-xs text-ink-muted">No high-impact alerts in the current window.</p> : (
                <ul className="space-y-2 text-xs">
                  {alerts.map((a, i) => {
                    const owner = a.tone === 'alert' ? 'Cabinet Office' : 'Duty Coordinator';
                    const eta = a.tone === 'alert' ? `${1 + (epoch % 3)}h` : `${4 + (epoch % 8)}h`;
                    const path = a.tone === 'alert' ? 'Ministry → Regional → Cabinet' : 'Ministry → Regional';
                    return (
                      <li key={i} className="border-b border-line-soft pb-2 last:border-0 last:pb-0">
                        <div className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[a.tone] ?? TONE.warn }} />
                          <span className="min-w-0"><span className="block font-medium text-ink">{a.title}</span><span className="block truncate text-[10px] text-ink-muted">{a.detail}</span></span>
                        </div>
                        <div className="ml-[14px] mt-1 grid grid-cols-2 gap-x-2 text-[9px] text-ink-muted">
                          <span>owner: {owner}</span>
                          <span className="text-right">ETA {eta}</span>
                          <span className="col-span-2" style={{ color: TONE[a.tone] ?? TONE.warn }}>↗ {path}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
            <Panel title="Cabinet calendar" meta="upcoming">
              <ul className="space-y-2 text-xs">
                {cal.map(c => <li key={c.t} className="flex items-center justify-between"><span className="text-ink-soft">{c.t}</span><span className="font-mono text-[10px] tabular-nums text-ink-muted">in {c.m < 60 ? `${c.m}m` : `${Math.floor(c.m / 60)}h ${c.m % 60}m`}</span></li>)}
              </ul>
              <Link href="/gov" className="focus-ring mt-3 inline-block text-[11px] text-link underline underline-offset-2">Open Cabinet →</Link>
            </Panel>
          </div>

          {/* Row 5 — persistent command status strip */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
            {[
              { l: 'Readiness posture', v: war ? 'CRITICAL' : posture?.label ?? 'STABLE', t: war ? 'alert' : posture?.level ?? 'ok' },
              { l: 'Operational tempo', v: `T${tickN} · ${Math.round(40 + seed(`tempo:${epoch}`) * 50)}/min`, t: 'ok' },
              { l: 'Active incidents', v: `${incidents.length} · ${sev('sev1')} crit`, t: incidents.length ? 'alert' : 'ok' },
              { l: 'Population impacted', v: `${(0.4 + seed(`pi:${epoch}`) * 9).toFixed(1)}M`, t: 'warn' },
              { l: 'War Room', v: war ? 'ENGAGED' : 'Standby', t: war ? 'alert' : 'neutral' },
            ].map(s => (
              <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
                <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
                <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
                  {s.l === 'War Room' || s.l === 'Readiness posture' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
                  {s.v}
                </span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
