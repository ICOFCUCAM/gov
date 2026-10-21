'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { CommandPalette, type CommandItem } from '@/components/ui/CommandPalette';
import { ExecutiveMenu } from '@/components/ui/ExecutiveMenu';
import { identityFor } from '@/lib/archetype-profiles';
import { POSTURE_TONE, THEATRE_SVG_SITES, postureTone, type TheatreLink, type TheatreSite, TheatreControls, TheatreLayersSvg, TheatreLegend, theatreFrame } from '@/components/features/situation/Theatre';
import type {
  NationalSnapshot,
  NationalCoordination,
  SovereignProfile,
  ArchetypeKey,
} from '@/lib/api/types';

import { TONE, TONE_SHAPE, TONE_WORD } from '@/lib/tone-palette';
import { CONSOLE, INFO } from '@/lib/theme/tokens';
import { ConsoleMark, PoweredBy } from '@/components/ui/ConsoleMark';
import { SignalTag } from '@/components/ui/SignalTag';
import { AccessibilityMenu } from '@/components/ui/AccessibilityMenu';
import { REFERENCE_MODEL, type SignalKind } from '@/lib/twin/signal';
import { isGenerated } from '@/lib/twin/generated';
import { GeneratedFold, GeneratedMarked, GeneratedText, useGenerated, shownValue, NOT_CONNECTED } from '@/components/ui/Generated';
import { executivePosture } from '@/lib/gov/executive-posture';
export { TONE };
export const ACCENT = INFO;

// Deep-navy situation-room palette (overrides the .sov tokens locally); values in lib/theme/tokens.ts.
export const PALETTE = {
  ...CONSOLE,
  '--accent': ACCENT,
} as React.CSSProperties;

import { seed, toneFor, wave, waveSeries, domainStress } from '@/lib/telemetry';
import { nationalAssets, nationalNetworks, networkPressure } from '@/lib/gov/infrastructure';
import {
  nationalOperatingState, forecast, governIncident, nationalPosture,
} from '@/lib/gov/sovereign-operating-model';

import { DispatchChannel, NationalDispatchDigest, NationalRecordsLedger, NationalEncounterDigest, NationalReferralBoard, NationalBureaucracyPulse } from '@/apps/_shared/InstitutionChain';
import { formatMoney } from '@/lib/nation/registry';
import { useRenderNow } from '@/lib/clock/render-now';
import { CONSOLE_NAV, locate } from '@/lib/nav/console-nav';
import { ConsoleTabs } from '@/components/ui/ConsoleTabs';
import { NationMap, type MapPoint, type MapValue } from '@/components/map/NationMap';
import { FACILITY_TILES, type PointTileSource } from '@/lib/map/tile-loader';
import { nationalRegions, type RegionModel } from '@/lib/gov/regions';
import { provinceMemory } from '@/lib/gov/sovereign-operating-model';

/** The ministry grid's columns: short heading, and the full name read aloud and shown on hover. */
const MATRIX_DOMAINS = [
  { key: 'ops', short: 'Ops', name: 'Operations' }, { key: 'fisc', short: 'Fin', name: 'Finance' },
  { key: 'infra', short: 'Infra', name: 'Infrastructure' }, { key: 'civil', short: 'Civil', name: 'Civil order' },
  { key: 'sec', short: 'Sec', name: 'Security' }, { key: 'logi', short: 'Logi', name: 'Logistics' },
  { key: 'sla', short: 'Time', name: 'On time' }, { key: 'esc', short: 'Esc', name: 'Escalations' },
  { key: 'work', short: 'Work', name: 'Workload' }, { key: 'emrg', short: 'Emrg', name: 'Emergencies' },
] as const;

const NATL_ASSETS = nationalAssets();
const NATL_NETWORKS = nationalNetworks();
export { seed, toneFor, wave, waveSeries, domainStress };
export function rel(at: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
}

// Governance doctrine (NATL_DEP, decision pipeline, mandate, tradeoff and
// the unified governIncident) lives in the shared sovereign operating model
// engine — panels render it, they no longer script escalation behaviour.

// A function so labels that follow the nation's AI choice are read at render.
// The same plain-language menu as every console page (lib/nav/console-nav.ts), in this page's own design.
const rail = (): { g: string; items: { i: string; l: string; s: string; href: string; on?: boolean }[] }[] =>
  CONSOLE_NAV.map(sec => ({ g: sec.label, items: sec.items.map(it => ({ i: it.icon, l: it.label, s: it.purpose, href: it.href, ...(it.key === 'sr' ? { on: true } : {}) })) }));

export function Panel({
  title, meta, className = '', bodyClass = '', signal, children,
}: {
  title: string; meta?: React.ReactNode; className?: string; bodyClass?: string;
  /**
   * Where the panel's figures come from; anything not observed or reported shows its marker (lib/twin/signal.ts).
   * Generated ones (`sample`, `simulated`) fold to "Not connected" on a production installation (lib/twin/generated.ts).
   */
  signal?: SignalKind;
  children: React.ReactNode;
}) {
  const gen = useGenerated(signal === 'simulated' ? 'simulated' : 'sample');
  const folded = isGenerated(signal) && !gen.show;
  return (
    <section className={`relative flex min-h-0 flex-col rounded-[3px] border border-line bg-surface ${className}`}
      style={{
        boxShadow:
          'inset 2px 0 0 color-mix(in srgb,#37c7d4 28%,transparent),' +   // tactical command rail
          'inset 0 0 0 1px rgba(120,170,205,0.045),' +                    // inner chassis hairline
          'inset 0 -26px 34px -30px rgba(0,0,0,0.85),' +                  // recessed structural depth
          '0 1px 0 rgba(0,0,0,0.5)',                                      // mounted-into-surface edge
      }}>
      {/* infrastructure grain — restrained machine texture, non-blocking */}
      <span aria-hidden className="pointer-events-none absolute inset-0 z-0 rounded-[3px] opacity-[0.035]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(150,200,235,0.7) 0 1px, transparent 1px 4px)' }} />
      <div className="relative z-[1] flex items-center justify-between gap-2 border-b border-line px-2 py-1"
        style={{ backgroundImage: 'linear-gradient(180deg, rgba(120,170,205,0.05), transparent)', boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.08)' }}>
        <h2 className="flex min-w-0 items-center gap-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-soft">
          <span aria-hidden className="h-1 w-1 shrink-0 rounded-full motion-safe:animate-breathe" style={{ background: ACCENT, boxShadow: `0 0 4px ${ACCENT}` }} />
          {title}
          {folded ? <SignalTag kind="unavailable" source={gen.src} /> : signal ? <SignalTag kind={signal} source={REFERENCE_MODEL} /> : null}
        </h2>
        {meta && !folded ? <span className="shrink-0 text-[9.5px] text-ink-muted">{meta}</span> : null}
      </div>
      {folded
        ? <div className="relative z-[1] flex-1 p-2"><GeneratedFold kind={signal === 'simulated' ? 'simulated' : 'sample'} what="This panel's figures">{meta ? <div className="mb-1 text-[9.5px] text-ink-muted">{meta}</div> : null}<div className={bodyClass}>{children}</div></GeneratedFold></div>
        : <div className={`relative z-[1] flex-1 p-2 ${bodyClass}`}>{isGenerated(signal) ? <GeneratedMarked>{children}</GeneratedMarked> : children}</div>}
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
  const rid = React.useId().replace(/:/g, '');
  const max = Math.max(...pts), min = Math.min(...pts), rng = max - min || 1;
  const mean = pts.reduce((s, p) => s + p, 0) / pts.length;
  const Y = (p: number) => 30 - ((p - min) / rng) * 26 - 2;
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${((i / (pts.length - 1)) * 100).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
  const area = `${line} L100,30 L0,30 Z`;
  const meanY = Y(mean).toFixed(1);
  const c = TONE[tone] ?? ACCENT;
  const ey = Y(pts[pts.length - 1] ?? mean);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-9 w-full overflow-visible">
      <defs>
        <linearGradient id={`sg${rid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.26" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map(g => (
        <line key={g} x1={g} y1="0" x2={g} y2="30" stroke="rgb(var(--c-line))" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      ))}
      <line x1="0" y1={meanY} x2="100" y2={meanY} stroke={c} strokeOpacity="0.3" strokeWidth="0.55"
        strokeDasharray="2.2 2.4" vectorEffect="non-scaling-stroke" />
      <path d={area} fill={`url(#sg${rid})`} />
      <path d={line} fill="none" stroke={c} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx="100" cy={ey} r="1.7" fill={c} />
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

// ── Sovereign national telemetry spine primitives (top intelligence band) ──
// Intelligence-grade KPI model: value + drift + anomaly + state + threshold.
export type Instr = {
  l: string; v: string; t: string; d: number; traj: string;
  spark: number[]; crit: boolean; anom: boolean; state: string;
  base: number; band: number; pulse: boolean;
  /** What kind of figure it is; unset = a sample from the reference model (lib/twin/signal.ts). */
  kind?: SignalKind; source?: string;
};

// Sharp infrastructure-monitoring sparkline — gradient body, threshold
// baseline, anomaly-peak markers, live pulsing telemetry head.
export function TeleSpark({ pts, tone, active }: { pts: number[]; tone: string; active?: boolean }) {
  const rid = React.useId().replace(/:/g, '');
  const max = Math.max(...pts), min = Math.min(...pts), rng = max - min || 1;
  const mean = pts.reduce((s, p) => s + p, 0) / pts.length;
  const X = (i: number) => (i / (pts.length - 1)) * 100;
  const Y = (p: number) => 28 - ((p - min) / rng) * 23 - 2.5;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
  const area = `${line} L100,28 L0,28 Z`;
  const meanY = Y(mean).toFixed(1);
  const thr = min + rng * 0.8;
  const peaks = pts.map((p, i) => (p >= thr && i > 0 && i < pts.length - 1 ? { x: X(i), y: Y(p), i } : null))
    .filter(Boolean) as { x: number; y: number; i: number }[];
  const c = TONE[tone] ?? ACCENT;
  const ex = X(pts.length - 1), ey = Y(pts[pts.length - 1] ?? mean);
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full overflow-visible">
      <defs>
        <linearGradient id={`tg${rid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.32" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[20, 40, 60, 80].map(g => (
        <line key={g} x1={g} y1="0" x2={g} y2="28" stroke="rgb(var(--c-line))" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      ))}
      <line x1="0" y1={meanY} x2="100" y2={meanY} stroke={c} strokeOpacity="0.36" strokeWidth="0.6"
        strokeDasharray="2.2 2.2" vectorEffect="non-scaling-stroke" />
      <path d={area} fill={`url(#tg${rid})`} />
      <path d={line} fill="none" stroke={c} strokeWidth="1.45" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {peaks.map(pk => (
        <circle key={pk.i} cx={pk.x} cy={pk.y} r="1.4" fill={c}
          className={active ? 'motion-safe:animate-breathe' : ''} />
      ))}
      {active ? <circle cx={ex} cy={ey} r="2.4" fill="none" stroke={c} strokeWidth="0.9" className="motion-safe:animate-diffuse" /> : null}
      <circle cx={ex} cy={ey} r="2" fill={c} />
    </svg>
  );
}

// Intelligence-grade KPI cell — state chip, dominant metric, drift,
// sharp telemetry, baseline/threshold footer; criticals visually dominate.
export function KpiCell({ d }: { d: Instr }) {
  // A generated reading (the default) is "Not connected" on a production installation (lib/twin/generated.ts).
  const gen = useGenerated();
  const kind = d.kind ?? 'sample';
  if (isGenerated(kind) && !gen.show) {
    return (
      <div data-generated="not-connected" className="relative overflow-hidden rounded-[3px] border border-line bg-surface px-2 py-1.5">
        <div className="truncate text-[8px] font-semibold uppercase tracking-[0.13em] text-ink-muted">{d.l}</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">{NOT_CONNECTED}<SignalTag kind="unavailable" source={gen.src} className="!text-[7px] !leading-none" /></div>
      </div>
    );
  }
  const tone = d.t || 'ok';
  const c = TONE[tone] ?? ACCENT;
  const up = d.d > 0, dn = d.d < 0;
  const dC = up ? TONE.ok : dn ? TONE.alert : TONE.neutral;
  return (
    <div className="relative overflow-hidden rounded-[3px] border bg-surface px-2 py-1.5"
      style={{
        borderColor: d.crit ? `color-mix(in srgb,${c} 52%,rgb(var(--c-line)))` : 'rgb(var(--c-line))',
        boxShadow: d.crit
          ? `inset 0 0 0 1px color-mix(in srgb,${c} 20%,transparent), inset 0 1px 0 rgba(55,199,212,0.06), 0 0 16px color-mix(in srgb,${c} 13%,transparent)`
          : 'inset 0 1px 0 rgba(55,199,212,0.06)',
      }}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-[2px]"
        style={{ background: c, opacity: d.crit ? 0.95 : 0.42 }} />
      <div className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-[8px] font-semibold uppercase tracking-[0.13em] text-ink-muted">{d.l}</span>
        <span className="shrink-0 rounded-[2px] px-1 py-px text-[7px] font-bold uppercase tracking-[0.07em]"
          style={{ background: `color-mix(in srgb,${c} 15%,transparent)`, color: c }}>{d.state}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        {d.pulse ? <span className="h-1 w-1 shrink-0 rounded-full motion-safe:animate-breathe" style={{ background: c, boxShadow: `0 0 5px ${c}` }} /> : null}
        <span className="font-mono text-[16px] font-semibold leading-none tabular-nums"
          style={{ color: c, textShadow: d.crit ? `0 0 12px color-mix(in srgb,${c} 60%,transparent)` : undefined }}>
          <LiveValue raw={d.v} />
        </span>
        <span className="ml-auto shrink-0 font-mono text-[9px] tabular-nums" style={{ color: dC }}>{d.traj}{d.d ? Math.abs(d.d) : ''}</span>
      </div>
      <div className="mt-1 -mb-0.5"><TeleSpark pts={d.spark} tone={tone} active={d.crit || d.pulse} /></div>
      <div className="mt-0.5 flex items-center justify-between gap-1 whitespace-nowrap text-[7px] font-medium uppercase tracking-[0.05em]">
        <span className="min-w-0 truncate text-ink-muted" title="The usual level">normal {d.base}</span>
        <SignalTag kind={d.kind ?? 'sample'} source={d.source ?? REFERENCE_MODEL} className="!text-[7px] !leading-none" />
        {d.anom
          ? <span className="flex items-center gap-0.5" style={{ color: TONE.warn }}><span className="h-[3px] w-[3px] rounded-full motion-safe:animate-pulse" style={{ background: TONE.warn }} />unusual</span>
          : <span style={{ color: c }} title="Level at which this needs attention">alert at {d.band}</span>}
      </div>
    </div>
  );
}

// Live sovereign decision spine — completed stages cool to green, the
// active stage pulses under pressure (shared breathe cadence), future
// stages stay dim. Makes the procedural pipeline feel alive & progressing.
export function PipelineSpine({ idx, tone, n = 9 }: { idx: number; tone: string; n?: number }) {
  const c = TONE[tone] ?? ACCENT;
  return (
    <span aria-hidden className="flex items-center gap-[2px]">
      {Array.from({ length: n }).map((_, k) => {
        const done = k < idx, active = k === idx;
        return (
          <span key={k} className="relative h-[3px] flex-1 overflow-hidden rounded-full"
            style={{ background: done ? `color-mix(in srgb,${TONE.ok} 52%,transparent)` : active ? c : 'rgb(var(--c-line))' }}>
            {active ? <span className="absolute inset-0 rounded-full motion-safe:animate-breathe"
              style={{ background: c, boxShadow: `0 0 6px ${c}` }} /> : null}
          </span>
        );
      })}
    </span>
  );
}

// Operational resource-strain bar — visualizes the competing national
// resource under load (depletion %), cooling as the response stabilizes.
export function StrainBar({ pct, tone }: { pct: number; tone: string }) {
  const c = TONE[tone] ?? ACCENT;
  return (
    <span aria-hidden className="relative inline-block h-[3px] w-12 overflow-hidden rounded-full align-middle" style={{ background: 'rgb(var(--c-line))' }}>
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: c, boxShadow: `0 0 5px ${c}` }} />
    </span>
  );
}

// The nation on a map, through the shared map engine (components/map/NationMap,
// docs/MAP_SYSTEM_PLAN.md): its own regions in their real shapes and official
// order — all of them, not six slots — shaded by the regional model. The
// regional figures are samples until regional sources are connected in
// National data, so they are hatched and marked. Nothing is placed at
// invented positions: facilities and corridors appear once registered.
type LayerKey = 'infra' | 'grid' | 'corridors' | 'incidents' | 'environment' | 'institutions';

const REGIONAL_SOURCE = 'Regional model (sample) until regional sources are connected in National data';

function regionalFigures(epoch: number, pick: (r: RegionModel) => number = r => r.composite) {
  const regions = nationalRegions(epoch);
  return {
    regions,
    values: regions.map((r): MapValue => ({ key: r.name, value: pick(r), unit: 'stress index', note: `Status: ${r.posture}` })),
  };
}

export function TerritoryHeat({ epoch, height = 150 }: { epoch: number; height?: number; focus?: string; tactical?: boolean }) {
  const { values } = React.useMemo(() => regionalFigures(epoch), [epoch]);
  return (
    <NationMap title="Operational stress by region" values={values} kind="sample" source={REGIONAL_SOURCE}
      valueLabel="Stress" unit="index" maxHeight={Math.max(height, 200)} minHeight={Math.min(height, 180)} compact={height < 260}
      emptyNote="No regional figures yet." />
  );
}

export function NationalMap({
  mapNodes, edges, incidents, now, layers, epoch, height, onToggleLayer,
}: {
  mapNodes: { ministryId: string; ministry: string; archetype: string; x: number; y: number; pressure: number }[];
  edges: { fromId: string; toId: string; propagatedRisk: number }[];
  incidents: { ministry: string; severity: string }[];
  now: number;
  layers: { infra: boolean; grid: boolean; corridors: boolean; incidents: boolean; environment?: boolean; institutions?: boolean };
  epoch: number;
  height?: number;
  focus?: string;
  onToggleLayer?: (k: LayerKey) => void;
}) {
  const [layerOpen, setLayerOpen] = React.useState(false);
  const showInstitutions = layers.institutions !== false;
  const ts = now / 4000;
  // The national operating state (one shared finite-capacity model, sample).
  const aggP = mapNodes.length ? Math.round(mapNodes.reduce((s, m) => s + m.pressure, 0) / mapNodes.length) : 30;
  const peakP = mapNodes.length ? Math.max(...mapNodes.map(m => m.pressure)) : 40;
  const sevLoad = incidents.filter(i => i.severity === 'sev1' || i.severity === 'sev2').length;
  const opState = nationalOperatingState(ts, aggP, peakP, sevLoad, incidents.length, epoch);
  const D = opState.display;
  // Regional pressure as the earlier theatre worked it out: each region's own model, the strain of the
  // institutions operating across the nation, the national contention floor and a regional rhythm,
  // so regions rise and cool with the government's real load (sample until regions report).
  const { regions, values } = React.useMemo(() => {
    const base = nationalRegions(epoch);
    const raws = base.map((r, i) => {
      // The earlier theatre's doctrine: institution strain 0.52, contention 0.2, regional rhythm 0.18,
      // decayed crisis memory 0.1; the region's own model stands in for nearness to the institutions.
      // Each region feels most the institutions most active in it (two, chosen by the region's name).
      const host = mapNodes.length ? mapNodes[Math.floor(seed(`host:${r.name}`) * mapNodes.length)]!.pressure : aggP;
      const host2 = mapNodes.length ? mapNodes[Math.floor(seed(`host2:${r.name}`) * mapNodes.length)]!.pressure : aggP;
      const strain = (host * 0.6 + host2 * 0.4) * 0.5 + aggP * 0.3 + r.composite * 0.2;
      const raw = strain * 0.52 + opState.contention * 0.2 + wave(`prov:${r.name}`, ts, 8, 70) * 0.18 + provinceMemory(i, epoch) * 0.1 + r.incidents * 1.2;
      return { r, raw: Math.max(raw, provinceMemory(i, epoch) * 0.7) };
    });
    // Spread around the national mean so the regions read apart, as on the earlier theatre.
    const mean = raws.reduce((a, x) => a + x.raw, 0) / Math.max(1, raws.length);
    const out = raws.map(({ r, raw }) => {
      const risk = Math.max(2, Math.min(99, Math.round(mean + (raw - mean) * 1.9)));
      return { ...r, composite: risk, readiness: Math.max(1, 100 - risk), posture: (risk >= 78 ? 'critical' : risk >= 58 ? 'elevated' : risk >= 40 ? 'watch' : 'stable') as RegionModel['posture'] };
    });
    return { regions: out, values: out.map((r): MapValue => ({ key: r.name, value: r.composite, unit: 'stress index', note: `Status: ${r.posture} · readiness ${r.readiness}%` })) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch, aggP, Math.round(opState.contention), Math.floor(ts), mapNodes.map(m => m.pressure).join(',')]);
  // Incident markers where a region is under pressure; stable regions keep theirs in the table.
  const points = React.useMemo<MapPoint[]>(() => (layers.incidents
    ? regions.filter(r => r.incidents > 0 && r.posture !== 'stable').map(r => ({ key: r.name, label: 'Incidents', tone: POSTURE_TONE[r.posture], count: r.incidents }))
    : []), [regions, layers.incidents]);
  const [tactical, setTactical] = React.useState(true);
  const [heat, setHeat] = React.useState(false);
  const tBand = (v: number, a: number, b: number) => (v >= b ? 'alert' : v >= a ? 'warn' : 'ok');
  const overlay = [
    { l: 'Grid corridors', v: `${D.gridLoad}% load`, t: tBand(D.gridLoad, 72, 86) },
    { l: 'Goods moved', v: `${D.logiThru.toLocaleString()} kt/h`, t: tBand(700 - D.logiThru, 180, 320) },
    { l: 'Telecom integrity', v: `${D.telecom.toFixed(1)}%`, t: tBand(99 - D.telecom, 4, 9) },
    { l: 'Strategic reserves', v: `${D.reserves}%`, t: tBand(90 - D.reserves, 22, 40) },
    { l: 'Coordination capacity', v: `${D.coordBw}%`, t: tBand(95 - D.coordBw, 20, 38) },
  ];
  const critCount = sevLoad;
  const flowDur = critCount >= 3 ? '0.6s' : critCount >= 1 ? '0.95s' : '1.4s';
  const ranked = [...regions].sort((a, b) => b.composite - a.composite);
  const [allRegions, setAllRegions] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  // The theatre's size follows its panel: wide panels keep the pressure ladder over the map.
  const [frameW, setFrameW] = React.useState(900);
  React.useEffect(() => {
    if (!rootRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(es => { const w = es[0]?.contentRect.width; if (w) setFrameW(Math.round(w)); });
    ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, []);
  const [isFull, setIsFull] = React.useState(false);
  React.useEffect(() => {
    const on = () => setIsFull(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const wide = frameW >= 620;
  const frameH = isFull ? Math.max(480, (typeof window !== 'undefined' ? window.innerHeight : 900) - 120) : height ?? Math.round(Math.max(440, Math.min(760, frameW * (frameW >= 620 ? 0.9 : 0.8))));
  // The nation's registered sites (national facility register), refreshed every half minute.
  // A national-scale register (more than 2,000 published sites) is not fetched whole: the map reads its
  // vector tiles for what it shows and draws them on the GPU in the theatre's tile style (NationMap `pointTiles`).
  const [sites, setSites] = React.useState<TheatreSite[]>([]);
  const [siteScale, setSiteScale] = React.useState<{ total: number; kinds: string[]; glyphs: Record<string, string>; version: string } | null>(null);
  const [conn, setConn] = React.useState<{ links: TheatreLink[]; seats: Record<string, { lng: number; lat: number }> }>({ links: [], seats: {} });
  React.useEffect(() => {
    let live = true;
    type Reg = { sites?: { id: string; name: string; category: string; location: { lng: number; lat: number }; certification: { state: string }; generalised?: boolean }[]; categories?: { key: string; glyph: string }[]; counts?: { published: number; byCategory: Record<string, number> } };
    const load = () => fetch('/api/facilities?sites=none').then(r => (r.ok ? r.json() : null)).then((c: Reg | null) => {
      if (!live || !c?.counts) return null;
      if (c.counts.published > THEATRE_SVG_SITES) {
        setSites([]);
        setSiteScale({ total: c.counts.published, kinds: Object.keys(c.counts.byCategory), glyphs: Object.fromEntries((c.categories ?? []).map(x => [x.key, x.glyph])), version: String(Date.now()) });
        return null;
      }
      setSiteScale(null);
      return fetch('/api/facilities').then(r => (r.ok ? r.json() : null)).then((j: Reg | null) => {
        if (!live || !j?.sites) return;
        const glyph = new Map((j.categories ?? []).map(x => [x.key, x.glyph]));
        setSites(j.sites.map(s => ({ id: s.id, name: s.name, category: s.category, glyph: glyph.get(s.category) ?? '●', lng: s.location.lng, lat: s.location.lat, certified: s.certification.state === 'certified', generalised: s.generalised })));
      });
    }).catch(() => undefined);
    // Recorded exchanges between institutions, between their registered seats (lib/data/interop-map.ts).
    const loadConn = () => fetch('/api/facilities/connections').then(r => (r.ok ? r.json() : null)).then((j: { nodes?: { id: string; seat?: { lng: number; lat: number } }[]; links?: { from: string; to: string; kind: 'agreed' | 'live'; label: string; health: TheatreLink['health'] }[] } | null) => {
      if (!live || !j?.nodes) return;
      const seat = new Map(j.nodes.filter(n => n.seat).map(n => [n.id, n.seat!]));
      setConn({
        links: (j.links ?? []).flatMap(l => (seat.has(l.from) && seat.has(l.to) ? [{ ...l, a: seat.get(l.from)!, b: seat.get(l.to)! }] : [])),
        seats: Object.fromEntries(j.nodes.filter(n => n.seat && n.id !== 'central-government').map(n => [n.id, n.seat!])),
      });
    }).catch(() => undefined);
    void load(); void loadConn();
    const t = setInterval(() => { void load(); void loadConn(); }, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);
  // The registered sites as the theatre's glyph tiles from vector tiles (certified green, awaiting amber, dashed when generalised).
  const siteTiles = React.useMemo<PointTileSource | undefined>(() => (siteScale && layers.infra ? {
    source: FACILITY_TILES, layer: 'facilities', version: siteScale.version, label: 'Registered sites',
    toPoint: f => {
      const id = String(f.props.id ?? f.key), name = String(f.props.name ?? id), certified = f.props.certification === 'certified' || f.props.certified === true, generalised = f.props.generalised === true;
      return { key: id, name, label: `${name} · ${certified ? 'location certified' : 'awaiting certification'}${generalised ? ' · position generalised' : ''}`, tone: certified ? 'ok' : 'warn', glyph: siteScale.glyphs[String(f.props.category)] ?? '●', href: `/gov/sites#${id}`, generalised };
    },
  } : undefined), [siteScale, layers.infra]);
  const registeredCount = siteScale?.total ?? sites.length;
  const colourOf =React.useCallback((v: MapValue): string => TONE[postureTone(v.value)] ?? ACCENT, []);
  const fullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };
  const glass = 'rounded-[3px] border border-line bg-surface/85 backdrop-blur';
  // The operating strip and legend sit inside the theatre, over the bottom of the map.
  const strip = (
    <div className={`grid grid-cols-1 gap-px overflow-hidden border-t border-line bg-line/80 text-[10px] ${frameW >= 760 ? 'grid-cols-5' : wide ? 'grid-cols-3' : 'min-[480px]:grid-cols-2'}`}>
      {overlay.map(o => (
        <div key={o.l} className="flex min-w-0 items-center justify-between gap-2 bg-surface/80 px-2.5 py-1.5 backdrop-blur">
          <span className="min-w-0 truncate uppercase tracking-[0.1em] text-ink-muted" title={o.l}>{o.l}</span>
          <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[o.t] }}>
            <span className="h-1.5 w-1.5 rounded-full motion-safe:animate-breathe" style={{ backgroundColor: TONE[o.t] }} aria-hidden />{o.v}
          </span>
        </div>
      ))}
    </div>
  );

  const ladder = (
    <div className={`${glass} p-2 ${wide ? 'absolute end-2 top-12 z-10 w-[156px]' : ''}`}>
      <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Regional pressure <SignalTag kind="sample" source={REGIONAL_SOURCE} /></div>
      <ol className={`space-y-1 ${allRegions ? 'max-h-[300px] overflow-y-auto pe-1' : ''}`}>
        {(allRegions ? ranked : ranked.slice(0, 8)).map(r => {
          const tn = POSTURE_TONE[r.posture];
          return (
            <li key={r.name}>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="truncate text-ink-soft">{r.name}</span>
                <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{r.composite}</span>
              </div>
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full rounded-full transition-all duration-1000 ease-sov" style={{ width: `${r.composite}%`, backgroundColor: TONE[tn] }} />
              </div>
            </li>
          );
        })}
      </ol>
      {ranked.length > 8 ? (
        <button type="button" onClick={() => setAllRegions(v => !v)} className="mt-1 text-[10px] text-link underline">
          {allRegions ? 'Show the top 8' : `Show all ${ranked.length}`}
        </button>
      ) : null}
    </div>
  );

  const actions = (
    <>
      <div className="relative">
        <button type="button" onClick={() => onToggleLayer && setLayerOpen(o => !o)} aria-expanded={layerOpen}
          className={`focus-ring flex items-center gap-1 px-2 py-0.5 text-[11px] text-ink-soft hover:text-ink ${glass}`}>
          <span style={{ color: ACCENT }} aria-hidden>⧉</span> All layers <span className="text-ink-muted" aria-hidden>{layerOpen ? '▴' : '▾'}</span>
        </button>
        {layerOpen && onToggleLayer ? (
          <div className="absolute end-0 z-30 mt-1 w-48 overflow-hidden rounded-[3px] border border-line bg-surface shadow-elev-3">
            {([['institutions', 'Institutions and knock-on links'], ['incidents', 'Incidents'], ['infra', 'Infrastructure'], ['corridors', 'Corridors'], ['grid', 'Grid'], ['environment', 'Environment']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => onToggleLayer(k)} aria-pressed={k === 'institutions' ? showInstitutions : !!layers[k]}
                className="focus-ring flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[11px] text-ink-soft hover:bg-surface-2 hover:text-ink">
                <span>{l}</span>
                <span className="h-2.5 w-4 rounded-full" style={{ backgroundColor: (k === 'institutions' ? showInstitutions : layers[k]) ? ACCENT : 'rgb(var(--c-line))' }} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button type="button" onClick={fullscreen} aria-label={isFull ? 'Leave full screen' : 'Show the map full screen'}
        className={`focus-ring grid h-6 w-7 place-items-center text-[11px] text-ink-soft hover:text-ink ${glass}`}>⛶</button>
    </>
  );

  return (
    <div ref={rootRef} className="relative space-y-2 overflow-hidden rounded-[4px] border p-1.5" style={theatreFrame()}>
      {critCount >= 1 ? (
        <div className="pointer-events-none absolute bottom-[calc(100%-5.5rem)] start-[45%] z-20 -translate-x-1/2 whitespace-nowrap rounded-[3px] border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em] backdrop-blur"
          style={{ borderColor: TONE.alert, color: TONE.alert, backgroundColor: `color-mix(in srgb, ${TONE.alert} 14%, rgb(var(--c-surface)))` }}>
          <span className="me-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full align-middle" style={{ backgroundColor: TONE.alert }} aria-hidden />
          Activity · {critCount >= 3 ? 'very high' : 'high'} · {critCount} serious incident{critCount === 1 ? '' : 's'}
        </div>
      ) : null}

      <div className="relative">
        <NationMap title="Activity by region" values={values} kind="sample" source={REGIONAL_SOURCE} variant="theatre" heat={heat}
          valueLabel="Stress" unit="index" points={points} pointsLabel="Open incidents" maxHeight={frameH} minHeight={360}
          frameHeight={frameH} insetEnd={wide ? 168 : 0} insetBottom={wide ? (frameW >= 760 ? 84 : 112) : 0} colourOf={colourOf} actions={actions}
          inMap={wide ? <><div className="px-2 pb-1.5"><TheatreLegend layers={{ ...layers, institutions: showInstitutions }} registered={registeredCount} /></div>{strip}</> : undefined}
          pointTiles={siteTiles} pointLabels={siteTiles ? 20 : undefined} cluster
          hud={<TheatreControls tactical={tactical} heat={heat} grid={layers.grid} incidents={layers.incidents}
            onTactical={() => setTactical(v => !v)} onHeat={() => setHeat(v => !v)} onGrid={() => onToggleLayer?.('grid')} onIncidents={() => onToggleLayer?.('incidents')} />}
          overlay={ctx => <TheatreLayersSvg ctx={ctx} regions={regions} nodes={showInstitutions ? mapNodes : []} edges={edges} incidents={incidents} layers={layers} tactical={tactical} heat={heat} flowDur={flowDur} reserveEnd={wide ? 168 : 0} ts={ts} sites={sites} registeredCategories={siteScale?.kinds} links={conn.links} seats={conn.seats} />} />
        {wide ? ladder : null}
      </div>
      {!wide ? <>{ladder}{strip}<TheatreLegend layers={{ ...layers, institutions: showInstitutions }} registered={registeredCount} /></> : null}

      <p className="px-1 text-[10.5px] text-ink-muted">
        {showInstitutions && mapNodes.length ? `Institutions: ${mapNodes.length}, each opens its workspace; they stand around the capital until their seats are registered. ` : ''}
        Regional pressure, institution pressure and knock-on links come from the models. {registeredCount ? `${registeredCount.toLocaleString()} registered site${registeredCount === 1 ? '' : 's'} from the national facility register; ` : ''}corridors, evacuation routes, population and any infrastructure not yet registered are samples
        until facilities and networks are registered with coordinates (Sites, under National data). <SignalTag kind="sample" source="Models and samples until National data holds the nation's own" />
      </p>
    </div>
  );
}

export function SituationRoom() {
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [now, setNow] = React.useState(useRenderNow());
  const [layers, setLayers] = React.useState({ infra: true, grid: false, corridors: true, incidents: true, environment: true, institutions: true });
  const [warManual, setWarManual] = React.useState<boolean | null>(null);
  // Below the large breakpoint the menu is a drawer opened from the header (phones, tablets).
  const [navOpen, setNavOpen] = React.useState(false);

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
  // Generated readings: marked Sample in demo and training, "Not connected" in production (lib/twin/generated.ts).
  const gen = useGenerated();
  const xp = executivePosture(nat, coord);

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
  // Shared operating model at command scope — feeds escalation latency,
  // cascade and strain so the stream and the map agree on national state.
  const aggPS = mapNodes.length ? Math.round(mapNodes.reduce((s, m) => s + m.pressure, 0) / mapNodes.length) : nationalRisk;
  const peakPS = mapNodes.length ? Math.max(...mapNodes.map(m => m.pressure)) : nationalRisk;
  const sevLoadS = incidents.filter(i => i.severity === 'sev1' || i.severity === 'sev2').length;
  const opS = nationalOperatingState(ts, aggPS, peakPS, sevLoadS, incidents.length, epoch);
  // Shared evolving strategic doctrine — one posture for the whole surface.
  const natPost = nationalPosture(epoch);
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

  // Executive operational instruments — multi-layer national telemetry:
  // value · drift · anomaly · operational state · alert threshold · spark.
  const STATE = (t: string) => (t === 'alert' ? 'CRIT' : t === 'warn' ? 'ELEV' : t === 'ok' ? 'NOMINAL' : 'WATCH');
  const mkInstr = (l: string, val: number, unit: string, goodHigh: boolean, sk: string): Instr => {
    const prev = Math.round(val + (seed(`prev:${sk}:${epoch}`) - 0.5) * 14);
    const d = val - prev;
    const sevV = goodHigh ? 100 - val : val;
    const t = toneFor(sevV) as string;
    const spark = waveSeries(`is:${sk}`, ts, 18, 32, 97);
    const base = Math.round(spark.reduce((s, p) => s + p, 0) / spark.length);
    const peak = Math.round(Math.max(...spark));
    const last = spark[spark.length - 1] ?? val;
    return {
      l, v: `${val}${unit}`, t,
      d, traj: d > 1 ? '↗' : d < -1 ? '↘' : '→',
      spark, crit: t === 'alert',
      anom: t === 'alert' || last >= base + 13,
      state: STATE(t), base, band: peak, pulse: false,
    };
  };
  const fill = (o: Partial<Instr> & Pick<Instr, 'l' | 'v' | 't' | 'spark'>): Instr => {
    const base = Math.round(o.spark.reduce((s, p) => s + p, 0) / o.spark.length);
    return {
      d: 0, traj: '→', crit: o.t === 'alert', anom: o.t === 'alert',
      state: STATE(o.t), base, band: Math.round(Math.max(...o.spark)), pulse: false, ...o,
    };
  };
  const stabilityIdx = Math.max(1, 100 - nationalRisk);
  const instruments: Instr[] = [
    mkInstr('National Stability Index', stabilityIdx, '', true, 'stab'),
    fill({ l: 'Institutional Pressure', v: posture?.label ?? 'STABLE', t: posture?.level ?? 'ok', spark: mhPts, pulse: true, anom: posture?.level === 'alert' || posture?.level === 'warn' }),
    mkInstr('Economic Resilience', 55 + Math.round(seed(`er:${epoch}`) * 24), '%', true, 'er'),
    fill({ l: 'Treasury Liquidity', v: formatMoney(Number(revenue) * 1e9, { compact: true }), t: 'ok', d: 1, traj: '↗', spark: revPts }),
    mkInstr('Energy Stability', Math.max(1, 100 - pressOf('ENERGY')), '%', true, 'en'),
    mkInstr('Healthcare Capacity', Math.max(1, 100 - pressOf('HEALTH')), '%', true, 'hc'),
    mkInstr('Civil Stability', Math.max(1, 100 - Math.round(nationalRisk * 0.9)), '%', true, 'cs'),
    mkInstr('Infrastructure Integrity', Math.max(1, 100 - pressOf('TRANSPORT')), '%', true, 'ii'),
    mkInstr('Security Readiness', Math.max(1, 100 - pressOf('INTERIOR')), '%', true, 'sr'),
    mkInstr('Constitutional Integrity', totals?.auditIntact === false ? 71 : 96 + Math.round(seed(`ci:${epoch}`) * 3), '%', true, 'ci'),
  ];

  // National intelligence telemetry spine — multidimensional sovereign
  // synchronization signals rendered as a fixed command sub-header.
  const coordLvl = critCount >= 1 || incidents.length >= 6 ? 'CRITICAL' : incidents.length >= 3 || nationalRisk >= 55 ? 'ELEVATED' : 'SYNCHRONISED';
  const coordTone = coordLvl === 'CRITICAL' ? 'alert' : coordLvl === 'ELEVATED' ? 'warn' : 'ok';
  const propVel = Math.round(wave(`prop:${epoch}`, ts, 4, 34));
  const syncInt = (99.2 - (incidents.length * 0.18)).toFixed(2);
  const emLoad = Math.round((incidents.length / 9) * 100);
  const driftSign = (posture?.level === 'alert' ? '↑' : posture?.level === 'warn' ? '↗' : '→');
  // `gen`: generated by the reference model (Sample in demo and training, "Not connected" in production).
  const spineRaw: { k: string; v: string; t: string; pulse?: boolean; gen?: boolean }[] = [
    { k: 'STATUS', v: war ? 'WAR ROOM' : xp.risk.v, t: war ? 'alert' : xp.risk.t, pulse: true },
    { k: 'NAT RISK', v: `${nationalRisk}`, t: toneFor(nationalRisk) as string, gen: true },
    { k: 'COORD', v: coordLvl, t: coordTone, pulse: coordTone !== 'ok', gen: true },
    { k: 'SYNC', v: `${syncInt}%`, t: Number(syncInt) >= 98 ? 'ok' : 'warn', gen: true },
    { k: 'READINESS', v: `${stabilityIdx}`, t: toneFor(100 - stabilityIdx) as string, gen: true },
    { k: 'PROPAGATION', v: `${propVel}/s`, t: propVel >= 24 ? 'alert' : propVel >= 14 ? 'warn' : 'ok', gen: true },
    { k: 'ESC DRIFT', v: driftSign, t: posture?.level ?? 'ok', gen: true },
    { k: 'EMERG LOAD', v: `${emLoad}%`, t: emLoad >= 60 ? 'alert' : emLoad >= 30 ? 'warn' : 'ok', pulse: emLoad >= 60, gen: true },
    { k: 'INCIDENTS', v: `${incidents.length}`, t: incidents.length >= 6 ? 'alert' : incidents.length ? 'warn' : 'ok' },
  ];
  const spine = spineRaw.map(x => (x.gen && !gen.show ? { ...x, v: NOT_CONNECTED, t: 'neutral', pulse: false } : x));

  return (
    <div data-mode={war ? 'crisis' : 'normal'} className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]"
      style={{ ...PALETTE, ...(war ? { ['--accent' as string]: TONE.alert } : {}) }}>
      <CommandPalette items={cmdItems} accent={war ? TONE.alert : ACCENT} />
      {/* Restrained environmental depth — institutional vignette only
          (corner glow & scanline glaze dialled back). Non-blocking. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[55]" style={{
        background:
          `radial-gradient(120% 80% at 50% -10%, color-mix(in srgb,${war ? TONE.alert : ACCENT} 4%,transparent) 0%, transparent 55%),` +
          'radial-gradient(80% 60% at 50% 120%, rgba(2,6,14,0.4) 0%, transparent 60%),' +
          'radial-gradient(140% 120% at 50% 50%, transparent 62%, rgba(1,4,9,0.42) 100%)',
      }} />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[55] opacity-[0.025]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(150,200,235,0.6) 0 1px, transparent 1px 3px)',
      }} />
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
      {/* National command operations header */}
      <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:gap-4 sm:px-4">
        <button type="button" aria-label="Open the menu" aria-expanded={navOpen} onClick={() => setNavOpen(o => !o)}
          className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-[3px] border border-line text-ink-soft lg:hidden">
          <span aria-hidden className="text-base leading-none">{navOpen ? '✕' : '☰'}</span>
        </button>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb,${war ? TONE.alert : ACCENT} 60%,transparent), transparent)` }} />
        <ConsoleMark crisis={war} />
        <div className="hidden min-w-0 flex-1 flex-col items-center md:flex">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-px w-6" style={{ background: `color-mix(in srgb,${war ? TONE.alert : ACCENT} 50%,transparent)` }} />
            <span className="text-sm font-bold uppercase tracking-[0.34em] text-ink" style={{ textShadow: `0 0 16px color-mix(in srgb,${war ? TONE.alert : ACCENT} 50%,transparent)` }}>NATIONAL SITUATION ROOM</span>
            <span aria-hidden className="h-px w-6" style={{ background: `color-mix(in srgb,${war ? TONE.alert : ACCENT} 50%,transparent)` }} />
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
            <span>Real-time Command &amp; Coordination</span>
            <span className="text-line">·</span>
            <span style={{ color: war ? TONE.alert : ACCENT }}>OFFICIAL USE</span>
            <span className="text-line">·</span>
            <span className="font-mono tabular-nums">EPOCH {String(epoch).padStart(3, '0')}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
          <AccessibilityMenu compact />
          <button type="button"
            onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true }); window.dispatchEvent(e); }}
            className="focus-ring hidden items-center gap-1.5 rounded-sm border border-line bg-bg px-2 py-1 text-xs text-ink-muted transition-colors hover:text-ink lg:flex">
            <span style={{ color: ACCENT }}>⌕</span> Global search
            <kbd className="ml-1 rounded border border-line px-1 text-[9px] text-ink-muted">⌘K</kbd>
          </button>
          <span className="hidden items-center gap-1 rounded-sm border border-line px-2 py-1 text-[10px] text-ink-muted lg:flex">
            <span style={{ color: TONE.alert }}>⚑</span> {incidents.length} esc
            <span className="mx-1 text-line">·</span>
            <span style={{ color: ACCENT }}>✉</span> <GeneratedText source={`Briefs · ${REFERENCE_MODEL}`}>{3 + (epoch % 4)} briefs</GeneratedText>
            <span className="mx-1 text-line">·</span>
            <GeneratedText source={`Treasury liquidity · ${REFERENCE_MODEL}`}>{formatMoney(Number(revenue) * 1e9, { compact: true })}</GeneratedText>
          </span>
          <span className="hidden font-mono text-xs tabular-nums text-ink-muted sm:inline">{new Date(now).toLocaleTimeString()}</span>
          <button onClick={() => setWarManual(w => (w === true ? null : true))}
            className="focus-ring rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors"
            style={{ borderColor: war ? TONE.alert : 'rgb(var(--c-line))', color: war ? TONE.alert : 'rgb(var(--c-ink-muted))', backgroundColor: war ? `color-mix(in srgb, ${TONE.alert} 14%, transparent)` : 'transparent' }}
            title="Turn the war room view on or off" aria-label="War room view">
            ⚑<span className="hidden sm:inline"> War Room</span>
          </button>
          <span className="relative hidden items-center gap-1.5 overflow-hidden rounded-sm border px-2 py-1 sm:flex"
            style={{ borderColor: war ? `color-mix(in srgb,${TONE.alert} 45%,rgb(var(--c-line)))` : 'rgb(var(--c-line))' }}>
            <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.55] motion-safe:animate-shimmer"
              style={{ backgroundImage: `linear-gradient(90deg, transparent, color-mix(in srgb,${war ? TONE.alert : TONE.ok} 28%,transparent), transparent)`, backgroundSize: '200% 100%' }} />
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: war ? TONE.alert : TONE.ok, boxShadow: `0 0 6px ${war ? TONE.alert : TONE.ok}` }} />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider tabular-nums text-ink-soft">{war ? 'CRISIS' : 'SYNC'} · T{tickN}</span>
          </span>
          <span className="hidden border-l border-line pl-3 sm:inline">
            <ExecutiveMenu accent={war ? TONE.alert : ACCENT} />
          </span>
        </div>
      </header>

      {/* National intelligence telemetry spine — fixed synchronization band */}
      <div className="relative flex h-7 shrink-0 items-stretch overflow-hidden border-b border-line bg-bg"
        style={{ boxShadow: 'inset 0 -8px 14px -10px rgba(0,0,0,0.7)' }}>
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04] motion-safe:animate-shimmer"
          style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(150,200,235,0.8), transparent)', backgroundSize: '240% 100%' }} />
        <span className="flex shrink-0 items-center gap-1.5 px-3 text-[8.5px] font-bold uppercase tracking-[0.18em]"
          style={{ color: war ? TONE.alert : ACCENT }}>
          <span className="h-1.5 w-1.5 rounded-full motion-safe:animate-breathe" style={{ background: war ? TONE.alert : ACCENT, boxShadow: `0 0 6px ${war ? TONE.alert : ACCENT}` }} />
          LIVE READINGS
          <SignalTag kind={gen.kind} source={`Readings other than status and incidents · ${gen.src}`} className="!text-[7px] !leading-none" />
        </span>
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {spine.map((s, i) => {
            const c = TONE[s.t] ?? ACCENT;
            return (
              <div key={s.k} className="flex shrink-0 items-center gap-1.5 px-3"
                style={{ borderLeft: i ? '1px solid rgb(var(--c-line))' : undefined }}>
                <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{s.k}</span>
                {s.pulse ? <span className="h-1 w-1 rounded-full motion-safe:animate-breathe" style={{ background: c, boxShadow: `0 0 5px ${c}` }} /> : null}
                <span className="font-mono text-[10px] font-bold uppercase tabular-nums" style={{ color: c }}>{s.v}</span>
              </div>
            );
          })}
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 border-l border-line px-3 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-muted lg:flex">
          <span className="h-1 w-1 rounded-full motion-safe:animate-pulse" style={{ background: TONE.ok }} />
          LINK SECURE · {new Date(now).toLocaleTimeString()}
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Icon command rail */}
        {navOpen ? <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden /> : null}
        <nav aria-label="Situation Room navigation" className={`${navOpen ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-40 w-[240px] shrink-0 flex-col border-r border-line bg-bg lg:static lg:z-auto lg:flex lg:w-[212px]`}>
          <div className="border-b border-line px-3 py-2 sm:hidden"><ExecutiveMenu /></div>
          <div className="flex-1 overflow-y-auto py-1" onClick={() => setNavOpen(false)}>
            {rail().map(grp => (
              <div key={grp.g} className="mb-0.5">
                <div className="px-3 pb-0.5 pt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{grp.g}</div>
                {grp.items.map(it => {
                  const navAcc = war ? TONE.alert : ACCENT;
                  const n = /Incident|Situation now|Emergency/.test(it.l) ? incidents.length
                    : it.l === 'Cabinet brief' ? critCount
                    : 0;
                  return (
                    <Link key={it.l} href={it.href}
                      className={`focus-ring flex items-center gap-2 border-l-2 px-3 py-1 no-underline transition-colors duration-150 ${
                        it.on ? 'bg-surface-2 font-medium' : 'border-transparent text-ink-muted hover:bg-surface-2/50 hover:text-ink'
                      }`}
                      style={it.on ? { borderLeftColor: navAcc } : undefined}>
                      <span aria-hidden className="relative grid h-5 w-5 shrink-0 place-items-center rounded-[4px] bg-surface-2 text-[10px] ring-1 ring-line"
                        style={it.on ? { color: navAcc } : { color: 'rgb(var(--c-ink-soft))' }}>
                        {it.i}
                        {n > 0 ? <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: n >= 4 ? TONE.alert : TONE.warn }} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 truncate text-[11.5px]" style={it.on ? { color: navAcc } : undefined}>
                          {it.l}
                          {it.on ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: navAcc }} /> : null}
                        </span>
                        <span className="block truncate text-[8.5px] text-ink-muted">{it.s}</span>
                      </span>
                      {n > 0 ? <span className="shrink-0 rounded-[3px] px-1 text-[8px] font-bold tabular-nums" style={{ backgroundColor: `color-mix(in srgb, ${n >= 4 ? TONE.alert : TONE.warn} 20%, transparent)`, color: n >= 4 ? TONE.alert : TONE.warn }}>{n}</span> : null}
                    </Link>
                  );
                })}
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
            <div className="text-ink-muted">Environment</div><div className="text-right text-ink-soft">{nat?.environment ?? '—'}</div>
            <div className="text-ink-muted">Version</div><div className="text-right text-ink-soft">v2.1.0</div>
            <div className="text-ink-muted">Channel</div><div className="text-right" style={{ color: TONE.ok }}>Encrypted</div>
            <PoweredBy />
          </div>
        </nav>

        {/* Operational canvas */}
        <main className="min-w-0 flex-1 space-y-1.5 overflow-y-auto p-1.5"
          style={{ backgroundImage: 'linear-gradient(rgba(55,199,212,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(55,199,212,0.022) 1px, transparent 1px)', backgroundSize: '36px 36px' }}>
          <ConsoleTabs here={locate('/gov/situation-room')} branches={[]} pathname="/gov/situation-room" />
          {/* Row 1 — sovereign national intelligence telemetry (10) */}
          <div className="grid grid-cols-1 gap-1.5 min-[480px]:grid-cols-2 sm:grid-cols-5 xl:grid-cols-10">
            {instruments.map(t => <KpiCell key={t.l} d={t} />)}
          </div>

          {/* Map-first band */}
          <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-12">
            <Panel signal="sample" title="National activity map"
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
              className="self-start xl:col-span-6" bodyClass="!p-2">
              <NationalMap mapNodes={mapNodes} edges={coord?.edges ?? []} incidents={incidents} now={now} layers={layers} epoch={epoch} focus={sov?.stateName} onToggleLayer={k => setLayers(s => ({ ...s, [k]: !s[k] }))} />
            </Panel>

            <Panel signal="sample" title="Ministry status matrix" meta="inter-ministerial coordination · live" className="xl:col-span-4" bodyClass="!p-0">
              {(() => {
                // Cross-ministry dependency lattice — upstream stressors per
                // archetype propagate cascading pressure (sovereign realism).
                const DEP: Record<string, string[]> = {
                  HEALTH: ['TRANSPORT', 'ENERGY'], TRANSPORT: ['ENERGY'], ENERGY: ['FINANCE'],
                  EDUCATION: ['FINANCE'], AGRICULTURE: ['ENERGY', 'TRANSPORT'], ENVIRONMENT: ['ENERGY'],
                  JUSTICE: ['INTERIOR'], LABOR: ['FINANCE'], TRADE: ['FINANCE', 'TRANSPORT'],
                  INTERIOR: ['ENERGY'], FINANCE: [],
                };
                const pByArch = new Map<string, number>();
                mapNodes.forEach(n => pByArch.set(String(n.archetype), Math.max(pByArch.get(String(n.archetype)) ?? 0, n.pressure)));
                const critN = mapNodes.filter(n => n.pressure >= 80).length;
                const elevN = mapNodes.filter(n => n.pressure >= 60 && n.pressure < 80).length;
                const coordTone = critN >= 2 ? 'alert' : critN || elevN >= 3 ? 'warn' : 'ok';
                return (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-[11px]">
                <thead>
                  <tr className="sticky top-0 z-10 border-b text-left text-[8px] font-bold uppercase tracking-[0.16em] text-ink-muted"
                    style={{ background: 'rgb(var(--c-surface-2))', borderColor: `color-mix(in srgb,${ACCENT} 28%,rgb(var(--c-line)))` }}>
                    <th className="px-2 py-1.5">Ministry · State · Live readings</th>
                    {MATRIX_DOMAINS.map(d => (
                      <th key={d.key} className="px-0.5 py-1.5 text-center"><abbr title={d.name} className="no-underline">{d.short}</abbr></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapNodes.map(m => {
                    const id = identityFor(m.archetype as ArchetypeKey);
                    const p = m.pressure;
                    const tier = p >= 80 ? 'alert' : p >= 60 ? 'warn' : p >= 40 ? 'neutral' : 'ok';
                    const tierLbl = tier === 'alert' ? 'CRIT' : tier === 'warn' ? 'ELEV' : tier === 'neutral' ? 'WTCH' : 'STBL';
                    const tierName = tier === 'alert' ? 'Critical' : tier === 'warn' ? 'Elevated' : tier === 'neutral' ? 'Watch' : 'Stable';
                    const trend = waveSeries(`msm:${m.ministryId}`, ts, 9, Math.max(4, p - 26), Math.min(99, p + 14));
                    const drift = trend[trend.length - 1]! - trend[0]!;
                    const dArrow = drift > 6 ? '▲' : drift < -6 ? '▼' : '→';
                    const dTone = drift > 6 ? 'alert' : drift < -6 ? 'ok' : 'neutral';
                    const alerts = MATRIX_DOMAINS.map(d => d.key)
                      .reduce((n, dm) => n + (domainStress(m.archetype as string, dm, p, ts, m.ministryId) >= 78 ? 1 : 0), 0);
                    const ups = (DEP[String(m.archetype)] ?? []).map(a => pByArch.get(a) ?? 0);
                    const cascade = ups.filter(v => v >= 58).length;
                    const cascTone = ups.some(v => v >= 80) ? 'alert' : cascade ? 'warn' : 'ok';
                    const sl = (() => { const mn = Math.min(...trend), sp = Math.max(...trend) - mn || 1; return trend.map((v, i) => `${(i / (trend.length - 1)) * 44},${13 - ((v - mn) / sp) * 11}`).join(' '); })();
                    return (
                      <tr key={m.ministryId} className="border-b transition-colors hover:bg-surface-2/60 last:border-0"
                        style={{
                          borderColor: 'rgb(var(--c-line-soft))',
                          background: tier === 'alert' ? `color-mix(in srgb,${TONE.alert} 9%,transparent)` : tier === 'warn' ? `color-mix(in srgb,${TONE.warn} 5%,transparent)` : 'transparent',
                          opacity: tier === 'ok' ? 0.74 : 1,
                          boxShadow: `inset 3px 0 0 ${TONE[tier]}`,
                        }}>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            {tier === 'alert' ? <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full motion-safe:animate-breathe" style={{ background: TONE.alert, boxShadow: `0 0 6px ${TONE.alert}` }} /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE[tier], opacity: 0.7 }} />}
                            <Link href={`/gov/ministry/${m.ministryId}`} className="focus-ring flex min-w-0 items-center gap-1.5 no-underline">
                              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] text-[7px] text-white" style={{ backgroundColor: id.accent }}>{id.glyph}</span>
                              <span className="truncate font-medium text-ink">{m.ministry}</span>
                            </Link>
                            <span className="ml-auto shrink-0 rounded-[2px] px-1 py-0.5 text-[7.5px] font-bold uppercase tracking-[0.12em]" style={{ background: `color-mix(in srgb,${TONE[tier]} 20%,transparent)`, color: TONE[tier] }}><abbr title={tierName} className="no-underline">{tierLbl}</abbr></span>
                            <span className="shrink-0 font-mono text-[9px] tabular-nums" style={{ color: TONE[tier] }}>{p}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 pl-3 text-[7.5px] text-ink-muted">
                            <svg width="44" height="13" viewBox="0 0 44 13" className="shrink-0"><polyline points={sl} fill="none" stroke={TONE[dTone]} strokeWidth="1" vectorEffect="non-scaling-stroke" /></svg>
                            <span className="font-mono" style={{ color: TONE[dTone] }}>{dArrow}{Math.abs(Math.round(drift))}</span>
                            <span className="font-mono uppercase tracking-wider" style={{ color: alerts ? TONE.alert : 'rgb(var(--c-ink-muted))' }}>A:{alerts}</span>
                            <span className="font-mono uppercase tracking-wider" style={{ color: TONE[cascTone] }} title="upstream dependency stress">⇄{cascade}</span>
                          </div>
                        </td>
                        {MATRIX_DOMAINS.map(({ key: dom, name }) => {
                          const v = domainStress(m.archetype as string, dom, p, ts, m.ministryId);
                          const st = v >= 78 ? 'alert' : v >= 58 ? 'warn' : v >= 40 ? 'neutral' : 'ok';
                          return (
                            <td key={dom} className="px-0.5 py-1.5 align-middle" title={`${name} ${Math.round(v)} · ${TONE_WORD[st]}`}>
                              <span className="flex flex-col items-center gap-0.5">
                                <span aria-hidden className="text-[8px] leading-none" style={{ color: TONE[st], textShadow: st === 'alert' ? `0 0 4px ${TONE.alert}` : undefined }}>{TONE_SHAPE[st]}</span>
                                <span className="sr-only">{name} {TONE_WORD[st]} {Math.round(v)}</span>
                                <span className="h-0.5 w-5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}><span className="block h-full rounded-full" style={{ width: `${v}%`, background: TONE[st] }} /></span>
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {mapNodes.length === 0 ? <tr><td colSpan={11} className="px-3 py-8 text-center text-ink-muted">No active institutions.</td></tr> : null}
                </tbody>
                <tfoot>
                  <tr className="border-t text-[7.5px] uppercase tracking-[0.14em] text-ink-muted" style={{ borderColor: `color-mix(in srgb,${ACCENT} 24%,rgb(var(--c-line)))`, background: 'rgb(var(--c-surface-2))' }}>
                    <td className="px-2 py-1.5">
                      <span className="font-bold" style={{ color: TONE[coordTone] }}>● COORDINATION {coordTone === 'alert' ? 'CRITICAL' : coordTone === 'warn' ? 'ELEVATED' : 'SYNCHRONISED'}</span>
                    </td>
                    <td colSpan={10} className="px-2 py-1.5 text-right font-mono">
                      <span style={{ color: TONE.alert }}>{critN} CRIT</span><span className="mx-1.5 text-line">·</span>
                      <span style={{ color: TONE.warn }}>{elevN} ELEV</span><span className="mx-1.5 text-line">·</span>
                      <span className="text-ink-muted">⇄ knock-on links live · {mapNodes.length} ministries</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
                );
              })()}
            </Panel>

            <Panel signal="sample" title="Cabinet escalations as they arrive"
              meta={(() => {
                if (!incidents.length) return 'executive level';
                const s = incidents.slice(0, 9).reduce((a, c, i) => {
                  const ag = 2 + Math.floor(seed(`ag:${c.ministry}:${i}`) * 58);
                  const ak = seed(`ack:${c.ministry}:${i}:${epoch}`) > 0.45;
                  const ig = governIncident({
                    archetype: String(c.archetype), severity: c.severity, ageM: ag, ack: ak,
                    epoch, ministryId: c.ministryId, prop: 0,
                    contention: opS.contention, telecom: opS.display.telecom,
                    reservesHeadroom: opS.resources.reserves.headroom, transportUtil: opS.resources.transport.util, posture: natPost,
                  });
                  if (ig.pIdx >= 7) a.rec++; else if (ig.pIdx >= 4) a.auth++; else a.coord++;
                  if (ig.gate.held) a.held++;
                  return a;
                }, { coord: 0, auth: 0, rec: 0, held: 0 });
                return `doctrine ${natPost.label.toLowerCase()} · conf ${natPost.execConfidence}% · ${s.coord} coordinating · ${s.auth} authorized · ${s.rec} recovering${s.held ? ` · ${s.held} held at gate` : ''}`;
              })()}
              className="xl:col-span-2" bodyClass="!p-0">
              {incidents.length === 0 ? <p className="p-3 text-xs text-ink-muted">No active cross-ministry escalations.</p> : (() => {
                // Executive attention triage — finite command bandwidth, so
                // the stream is continuously ordered by what matters most and
                // lower-priority items are deferred (attention-constrained).
                const ranked = incidents.slice(0, 9).map((c, i) => {
                  const ag = 2 + Math.floor(seed(`ag:${c.ministry}:${i}`) * 58);
                  const ak = seed(`ack:${c.ministry}:${i}:${epoch}`) > 0.45;
                  const pr = Math.round(40 + seed(`pr:${c.ministry}:${i}:${epoch}`) * 58);
                  const a = governIncident({
                    archetype: String(c.archetype), severity: c.severity, ageM: ag, ack: ak, epoch,
                    ministryId: c.ministryId, prop: pr,
                    contention: opS.contention, telecom: opS.display.telecom,
                    reservesHeadroom: opS.resources.reserves.headroom, transportUtil: opS.resources.transport.util, posture: natPost,
                  }).attention;
                  return { c, i, a };
                }).sort((x, y) => y.a - x.a);
                return ranked.map(({ c, i }, rank) => {
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
                const arch = String(c.archetype);
                // One shared governing model — the panel renders it, it does
                // not script escalation behaviour (single executive doctrine).
                const g = governIncident({
                  archetype: arch, severity: c.severity, ageM, ack, epoch,
                  ministryId: c.ministryId, prop,
                  contention: opS.contention, telecom: opS.display.telecom,
                  reservesHeadroom: opS.resources.reserves.headroom, transportUtil: opS.resources.transport.util, posture: natPost,
                });
                const {
                  behavior: beh, reliability: rel, cascade: casc, eta, dep, cause,
                  pIdx, stageCur: cur, stageNext: nxt, machinery, stTone, mandate,
                  gate: gov, authority: chain, conflict, wear, aged, wornDot,
                  strain, strainTone, fragile, confLabel, confidence, burden, fatigue, field,
                } = g;
                const stT = pIdx >= 6 ? TONE.ok : pIdx >= 4 ? ACCENT : pIdx >= 2 ? TONE.warn : TONE.alert;
                const deferred = rank >= 5 && lvl < 3;
                const confTone = confidence >= 85 ? TONE.ok : confidence >= 68 ? TONE.neutral : confidence >= 48 ? TONE.warn : TONE.alert;
                return (
                  <Link key={i} href={`/gov/ministry/${c.ministryId}`} className="focus-ring block border-b border-line-soft px-3 py-2 no-underline transition-colors hover:bg-surface-2/50 last:border-0" style={{ borderLeft: `3px solid ${TONE[tn]}`, opacity: deferred ? 0.5 : 1 }}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tn]} 18%, transparent)`, color: TONE[tn] }}>
                          {c.severity === 'sev1' ? 'Critical' : c.severity === 'sev2' ? 'Elevated' : c.severity === 'sev3' ? 'Warning' : 'Info'} · L{lvl}
                        </span>
                        {rank === 0 ? <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: TONE.alert }}>▲ focus</span>
                          : deferred ? <span className="text-[8px] uppercase tracking-wider text-ink-muted">⤓ deferred</span> : null}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-ink-muted">
                        {aged ? <span style={{ color: wear >= 75 ? TONE.alert : TONE.warn }} title={`operational wear ${wear}`}>⊘{wear}</span> : null}
                        <span className={`h-1.5 w-1.5 rounded-full ${wornDot ? 'motion-safe:animate-breathe' : !ack ? 'motion-safe:animate-pulse' : ''}`}
                          style={{ backgroundColor: ack ? TONE.ok : TONE.warn }} title={ack ? 'Acknowledged' : wornDot ? 'Unacknowledged · institutional inertia' : 'Unacknowledged'} />
                        {ageM}m
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs font-medium text-ink">{c.label}</div>
                    <div className="truncate text-[10px] text-ink-muted">{id.glyph} {c.ministry} · owner {owner} › {chain.slice(1).join(' › ')} · <span style={{ color: TONE.neutral }}>{beh.orientation}</span>{fatigue > 45 ? <span style={{ color: fatigue >= 70 ? TONE.alert : TONE.warn }}> · fatigue {fatigue}</span> : null}</div>
                    <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-ink-muted">
                      <span>~{pop}M · {regionsN} regions</span>
                      <span className="text-right" style={{ color: prop >= 70 ? TONE.alert : prop >= 50 ? TONE.warn : TONE.neutral }}>propagation {prop}%</span>
                      <span>treasury: {treas}</span>
                      <span className="text-right">ETA {eta} · rel <span style={{ color: rel >= 80 ? TONE.ok : rel >= 65 ? TONE.warn : TONE.alert }}>{rel}%</span></span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 truncate text-[9px]">
                      <span style={{ color: TONE.neutral }}>⛓</span>
                      <span style={{ color: dep.up.length ? TONE.warn : TONE.neutral }}>{cause}</span>
                      <span className="text-line">▸</span>
                      <span className="font-semibold" style={{ color: TONE[tn] }}>{arch}</span>
                      {casc.hops.length > 1 ? <><span className="text-line">▸</span><span className="truncate" style={{ color: TONE.alert }}>{casc.hops.slice(1).join('▸')}</span></> : null}
                    </div>
                    <div className="truncate text-[9px] text-ink-muted">⮡ {casc.effect}{casc.depth >= 2 ? <span style={{ color: TONE.warn }}> · {casc.depth}-hop cascade</span> : null} · <span style={{ color: confTone }}>{confLabel} {confidence}%</span></div>
                    {field.fIdx >= 0 ? (
                      <div className="truncate text-[9px] text-ink-muted">⟱ {field.stage} · {field.region} · <span style={{ color: TONE[field.frictionTone] }}>{field.friction}</span>{field.relapse ? <span style={{ color: TONE.alert }}> · relapse risk</span> : null}{field.eta !== '—' ? <span className="text-ink-muted"> · ETA {field.eta}</span> : null}</div>
                    ) : null}
                    <div className="mt-1 flex items-center justify-between gap-2 text-[9px]">
                      <span className="truncate" style={{ color: TONE.warn }}>▸ {machinery}</span>
                      <span className="shrink-0 font-mono uppercase tracking-wider" style={{ color: stT }}>
                        {cur}▸{nxt}{fragile ? <span style={{ color: TONE.warn }}> · fragile</span> : null}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="min-w-0 flex-1"><PipelineSpine idx={pIdx} tone={stTone} /></span>
                      <span className="shrink-0 font-mono text-[8px] uppercase tracking-wider text-ink-muted" title="coordination burden">cb {burden}</span>
                      <span className="shrink-0 font-mono text-[8px] uppercase tracking-wider"
                        style={{ color: gov.held ? TONE.warn : gov.idx >= 5 ? TONE.ok : ACCENT }}>
                        {gov.held ? '⏸ ' : ''}{gov.stage}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-ink-muted">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate" style={{ color: conflict.tense ? TONE.warn : 'rgb(var(--c-ink-muted))' }}>⚖ {conflict.text}</span>
                        <StrainBar pct={strain} tone={strainTone} />
                        <span className="shrink-0 font-mono tabular-nums" style={{ color: TONE[strainTone] }}>{strain}%</span>
                      </span>
                      <span className="shrink-0 font-mono uppercase tracking-wider" style={{ color: lvl >= 3 ? TONE.alert : lvl === 2 ? TONE.warn : TONE.neutral }}>{mandate}</span>
                    </div>
                  </Link>
                );
                });
              })()}
            </Panel>
          </div>

          {/* Dependency intelligence + strategic forecast */}
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            <Panel signal="sample" title="National dependency graph" meta="systemic impact propagation" bodyClass="!pb-2">
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
            <Panel signal="sample" title="Operational timeline" meta="live tempo" bodyClass="!p-0">
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
            <Panel signal="sample" title="Strategic forecast · 72h" meta="24h → 72h · operating doctrine">
              {(() => {
                // Forward projection from the shared operating doctrine —
                // same pools/keys as the substrate so the outlook stays
                // consistent with live national state (no separate math).
                const fEn = forecast('som:en', opS.resources.energy.util, ts, false);
                const fRes = forecast('som:res', opS.resources.reserves.headroom, ts, true);
                const fHe = forecast('hsat', pressOf('HEALTH'), ts, false);
                const fLo = forecast('som:logi', opS.resources.logistics.util, ts, false);
                const fTr = forecast('som:tre', opS.resources.treasury.util, ts, false);
                const fCv = forecast('civil', nationalRisk, ts, false);
                const prob = (r: string) => (r === 'alert' ? 'High' : r === 'warn' ? 'Moderate' : 'Low');
                const rows: { l: string; v: string; t: string }[] = [
                  { l: 'Energy grid outlook', v: `${fEn.h24}→${fEn.h72}% load`, t: fEn.risk },
                  { l: 'Reserve exhaustion', v: fRes.exhaustMin ? `~${Math.max(1, Math.round(fRes.exhaustMin / 60))}h` : 'sustained', t: fRes.risk },
                  { l: 'Healthcare saturation', v: `${fHe.h24}→${fHe.h72}%`, t: fHe.risk },
                  { l: 'Logistics disruption probability', v: prob(fLo.risk), t: fLo.risk },
                  { l: 'Treasury stress forecast', v: fTr.risk === 'alert' ? 'Intervention <48h' : fTr.risk === 'warn' ? 'Contingency watch' : 'Within budget', t: fTr.risk },
                  { l: 'Civil instability trajectory', v: `${fCv.h24}→${fCv.h72}`, t: fCv.risk },
                ];
                return (
                  <ul className="space-y-1.5 text-xs">
                    {rows.map(f => (
                      <li key={f.l} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE[f.t] }} /><span className="text-ink-soft">{f.l}</span></span>
                        <span className="font-mono text-[11px] tabular-nums" style={{ color: TONE[f.t] }}>{f.v}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
              <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Advisory projection only — no autonomous action. Executive decides.</p>
            </Panel>
            <Panel signal="sample" title="Regional risk heatmap" meta="exposure by region" bodyClass="!p-2">
              <TerritoryHeat epoch={epoch} height={150} focus={sov?.stateName} />
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
                <span>Low</span>
                <span className="mx-2 h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${TONE.ok}, ${TONE.warn}, ${TONE.alert})` }} />
                <span>Critical</span>
              </div>
            </Panel>
          </div>

          {/* Operational analytics band */}
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            <Panel signal="sample" title="Infrastructure network pressure" meta="digital twin" bodyClass="!p-1.5">
              <div className="grid grid-cols-2 gap-1">
                {(['road', 'rail', 'grid', 'telecom', 'water', 'pipeline'] as const).map(k => {
                  const p = networkPressure(k, now / 4000);
                  const tn = p >= 78 ? 'alert' : p >= 62 ? 'warn' : 'ok';
                  return (
                    <div key={k} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{k}</div>
                      <div className="font-mono text-[13px] tabular-nums" style={{ color: TONE[tn] }}>{p}%</div>
                      <div className="-mb-0.5 h-3 overflow-hidden opacity-70"><Spark pts={waveSeries(`srnp:${k}`, now / 4000, 12, 30, 88)} tone={tn} /></div>
                    </div>
                  );
                })}
              </div>
            </Panel>
            <Panel signal={nat?.samples === false ? 'record' : 'sample'} title="Incident severity distribution" meta="by classification"><Donut segs={donut} /></Panel>
            <Panel signal="sample" title="Treasury flow monitor" meta="24h revenue · expenditure">
              <div className="space-y-2">
                <div>
                  <div className="flex items-baseline justify-between"><span className="text-[10px] uppercase tracking-wide text-ink-muted">Revenue</span><span className="font-mono text-sm tabular-nums" style={{ color: TONE.ok }}>{formatMoney(Number(revenue) * 1e9, { compact: true })}</span></div>
                  <Spark pts={revPts} tone="ok" />
                </div>
                <div>
                  <div className="flex items-baseline justify-between"><span className="text-[10px] uppercase tracking-wide text-ink-muted">Expenditure</span><span className="font-mono text-sm tabular-nums" style={{ color: TONE.warn }}>{formatMoney(Number(expenditure) * 1e9, { compact: true })}</span></div>
                  <Spark pts={expPts} tone="warn" />
                </div>
                {finance ? <Link href={`/gov/ministry/${finance.ministryId}`} className="focus-ring block text-[11px] text-link underline underline-offset-2">Open Treasury command →</Link> : null}
              </div>
            </Panel>
            <Panel signal="sample" title="System integration" meta="data connections">
              <ul className="space-y-1 text-[11px]">
                {['Health', 'Treasury', 'Transport', 'Security', 'Energy'].map((s, i) => {
                  const deg = seed(`sis:${i}:${epoch}`) > 0.86;
                  return <li key={s} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: deg ? TONE.alert : TONE.ok }} /><span className="text-ink-soft">{s} System</span><span className="ml-auto text-[10px]" style={{ color: deg ? TONE.alert : TONE.ok }}>{deg ? 'Degraded' : 'Online'}</span></li>;
                })}
              </ul>
            </Panel>
            {/* Links only, no figures: nothing to mark. */}
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
          <div className="grid gap-1.5 lg:grid-cols-2 xl:grid-cols-4">
            <Panel signal="sample" title="Connected systems" meta="cross-government" bodyClass="">
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
            <Panel signal="sample" title="National figures at a glance" meta="the whole state" bodyClass="">
              <ul className="space-y-1.5 text-xs">
                {[
                  { l: 'Inflation', v: `${(2 + seed(`m1:${epoch}`) * 4).toFixed(1)}%`, d: seed(`d1:${epoch}`) - 0.55, intp: 'within target band' },
                  { l: 'Unemployment', v: `${(4 + seed(`m2:${epoch}`) * 5).toFixed(1)}%`, d: seed(`d2:${epoch}`) - 0.5, intp: 'labour market stable' },
                  { l: 'Public satisfaction', v: `${(64 + seed(`m3:${epoch}`) * 18).toFixed(0)}%`, d: seed(`d3:${epoch}`) - 0.45, intp: 'civil sentiment steady' },
                  { l: 'Healthcare response', v: `${(8 + seed(`m4:${epoch}`) * 10).toFixed(0)}m`, d: 0.5 - seed(`d4:${epoch}`), intp: 'within time target' },
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
            <Panel signal="sample" title="Top operational alerts" meta="high impact">
              {alerts.length === 0 ? <p className="text-xs text-ink-muted">No high-impact alerts in the current window.</p> : (
                <ul className="space-y-1.5 text-xs">
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
            <Panel signal="sample" title="Cabinet calendar" meta="upcoming">
              <ul className="space-y-1.5 text-xs">
                {cal.map(c => <li key={c.t} className="flex items-center justify-between"><span className="text-ink-soft">{c.t}</span><span className="font-mono text-[10px] tabular-nums text-ink-muted">in {c.m < 60 ? `${c.m}m` : `${Math.floor(c.m / 60)}h ${c.m % 60}m`}</span></li>)}
              </ul>
              <Link href="/gov" className="focus-ring mt-3 inline-block text-[11px] text-link underline underline-offset-2">Open Cabinet →</Link>
            </Panel>
          </div>

          {/* Row 5 — persistent command status strip */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
            {/* Readiness from the executive posture (not connected in production); tempo and population impacted are generated. */}
            {[
              { l: 'Readiness', v: war ? 'CRITICAL' : xp.readiness.v, t: war ? 'alert' : xp.readiness.t, kind: war ? undefined : xp.readiness.kind, src: xp.readiness.src },
              { l: 'Operational tempo', v: shownValue(gen, `T${tickN} · ${Math.round(40 + seed(`tempo:${epoch}`) * 50)}/min`), t: gen.show ? 'ok' : 'neutral', kind: gen.kind, src: gen.src },
              { l: 'Active incidents', v: `${incidents.length} · ${sev('sev1')} crit`, t: incidents.length ? 'alert' : 'ok', kind: xp.incidents.kind, src: xp.incidents.src },
              { l: 'Population impacted', v: shownValue(gen, `${(0.4 + seed(`pi:${epoch}`) * 9).toFixed(1)}M`), t: gen.show ? 'warn' : 'neutral', kind: gen.kind, src: gen.src },
              { l: 'War Room', v: war ? 'ENGAGED' : 'Standby', t: war ? 'alert' : 'neutral', kind: undefined, src: '' },
            ].map(s => (
              <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
                <span className="flex items-center gap-1 uppercase tracking-[0.14em] text-ink-muted">{s.l}<SignalTag kind={s.kind as SignalKind | undefined} source={s.src} /></span>
                <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
                  {s.l === 'War Room' || s.l === 'Readiness' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
                  {s.v}
                </span>
              </div>
            ))}
          </div>

          {/* Row 6 — the whole-of-government live bureaucratic chain */}
          <NationalBureaucracyPulse accent={ACCENT} now={now} />
          <div className="grid gap-2 lg:grid-cols-2">
            <NationalDispatchDigest accent={ACCENT} now={now} />
            <NationalRecordsLedger accent={ACCENT} now={now} />
            <NationalEncounterDigest accent={ACCENT} now={now} />
            <NationalReferralBoard accent={ACCENT} now={now} />
          </div>
          <DispatchChannel scope="xmin:coordination" now={now} accent={ACCENT}
            selfTier="MINISTRY" selfName="Cabinet Secretariat" toTier="MINISTRY"
            title="Interministerial coordination — lateral, cross-ministry" />
        </main>
      </div>
    </div>
  );
}
