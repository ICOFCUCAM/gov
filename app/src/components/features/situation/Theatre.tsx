'use client';

// The Situation Room's command theatre, drawn over the nation's real map
// (components/map/NationMap.tsx, variant "theatre"). It keeps everything the
// earlier schematic theatre had — tactical framing, radar sweep over the
// capital, scanline, grid, pressure diffusion, readiness rings and status
// callouts, institutions as command nodes with knock-on links and cascades,
// incident chips, corridors with moving traffic, infrastructure, evacuation
// routes and population — now placed on the nation's own geography. What is
// not yet the nation's data is drawn as a sample and the legend says so:
// regional figures and institution pressure come from the models, and
// corridors, infrastructure, evacuation routes and population stand in until
// facilities and networks are registered with coordinates in National data.

import * as React from 'react';
import Link from 'next/link';
import type { OverlayContext } from '@/components/map/NationMap';
import { identityFor } from '@/lib/archetype-profiles';
import type { ArchetypeKey, IncidentPlace } from '@/lib/api/types';
import { ASSET_GLYPH, ASSET_LABEL, NET_TONE, networkPressure, sampleAssetsAround, sampleCorridors, sampleNetworksOn } from '@/lib/gov/infrastructure';
import { seed, toneFor, wave } from '@/lib/telemetry';
import { INFO as ACCENT } from '@/lib/theme/tokens';
import { TONE } from '@/lib/tone-palette';

export type Posture = 'stable' | 'watch' | 'elevated' | 'critical';
export interface TheatreRegion { name: string; composite: number; posture: Posture; incidents: number }
export interface TheatreNode { ministryId: string; ministry: string; archetype: string; pressure: number }
export interface TheatreEdge { fromId: string; toId: string; propagatedRisk: number }
export interface TheatreLayers { infra: boolean; grid: boolean; corridors: boolean; incidents: boolean; environment?: boolean; institutions?: boolean }

export const POSTURE_TONE = { stable: 'ok', watch: 'neutral', elevated: 'warn', critical: 'alert' } as const;
const POSTURE_WORD: Record<Posture, string> = { stable: 'STABLE', watch: 'WATCH', elevated: 'ELEVATED', critical: 'CRITICAL' };
export const CORRIDOR_TONE = { energy: ACCENT, logistics: TONE.warn, air: TONE.link, telecom: NET_TONE.telecom } as const;

/** The theatre's frame: deep vignette, accent edge and a faint glow over the upper territory. */
export function theatreFrame(): React.CSSProperties {
  return {
    borderColor: `color-mix(in srgb, ${ACCENT} 26%, rgb(var(--c-line-soft)))`,
    boxShadow: `inset 0 0 90px rgba(0,0,0,0.62), inset 0 0 0 1px color-mix(in srgb,${ACCENT} 8%,transparent)`,
    background:
      `radial-gradient(ellipse at 46% 26%, color-mix(in srgb,${ACCENT} 9%,transparent) 0%, color-mix(in srgb,${ACCENT} 3%,transparent) 34%, transparent 60%),` +
      'radial-gradient(ellipse at 50% 120%, rgba(3,9,18,0.5) 0%, transparent 55%),' +
      'radial-gradient(150% 130% at 50% 48%, transparent 56%, rgba(1,4,9,0.5) 100%),' +
      'rgb(var(--c-bg))',
  };
}

/** True when the viewer asked for reduced motion; moving traffic and sweeps then stand still. */
export function useReducedMotion(): boolean {
  const [r, setR] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return;
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return r;
}

/** The control stack on the map: tactical framing, heat intensity, grid, incident diffusion. */
export function TheatreControls({ tactical, heat, grid, incidents, onTactical, onHeat, onGrid, onIncidents }: {
  tactical: boolean; heat: boolean; grid: boolean; incidents: boolean;
  onTactical: () => void; onHeat: () => void; onGrid: () => void; onIncidents: () => void;
}) {
  const items = [
    { i: '◎', t: 'Tactical framing', on: tactical, act: onTactical },
    { i: '✸', t: 'Heat intensity', on: heat, act: onHeat },
    { i: '▦', t: 'Grid overlay', on: grid, act: onGrid },
    { i: '⚠', t: 'Incident diffusion', on: incidents, act: onIncidents },
  ];
  return (
    <>
      {items.map(b => (
        <button key={b.t} title={b.t} aria-label={b.t} aria-pressed={b.on} type="button" onClick={b.act}
          className="focus-ring grid h-7 w-7 place-items-center rounded-[3px] border bg-surface/85 text-[12px] backdrop-blur transition-colors"
          style={{ borderColor: b.on ? ACCENT : 'rgb(var(--c-line))', color: b.on ? ACCENT : 'rgb(var(--c-ink-soft))' }}>{b.i}</button>
      ))}
    </>
  );
}

/** The tone of a regional pressure figure, on the same thresholds as its status word. */
export function postureTone(v: number): 'ok' | 'neutral' | 'warn' | 'alert' {
  return v >= 78 ? 'alert' : v >= 58 ? 'warn' : v >= 40 ? 'neutral' : 'ok';
}

/** A published site of the national facility register, as the theatre draws it. */
export interface TheatreSite { id: string; name: string; category: string; glyph: string; lng: number; lat: number; certified: boolean; generalised?: boolean }
/** Which register category stands for each kind of sample asset: once the nation registers sites of it, that kind's samples go. */
const KIND_CATEGORY: Partial<Record<string, string>> = {
  hospital: 'health', port: 'port', airport: 'airport', power: 'power', telecom: 'telecom', water: 'water', logistics: 'logistics', customs: 'border-post', military: 'defence',
};

/** A recorded exchange between institutions (lib/data/interop-map.ts), between their registered seats. */
export interface TheatreLink { from: string; to: string; kind: 'agreed' | 'live'; label: string; health: 'agreed' | 'healthy' | 'quiet' | 'failing'; a: { lng: number; lat: number }; b: { lng: number; lat: number } }

/** An active incident as the national snapshot carries it (place recorded by the institution: lib/data/incident-places.ts). */
export interface TheatreIncident { ministry: string; severity: string; ministryId?: string; key?: string; label?: string; authority?: string; place?: IncidentPlace }

const SEV_WORD: Record<string, string> = { sev1: 'CRITICAL', sev2: 'ELEVATED', sev3: 'WARNING', sev4: 'WATCH' };
const sevTone = (s: string) => (s === 'sev1' || s === 'sev2' ? 'alert' : s === 'sev3' ? 'warn' : 'neutral') as 'alert' | 'warn' | 'neutral';

/** Severity by shape as well as colour: diamond critical, triangle elevated, square warning, circle watch. */
function sevShape(sev: string, x: number, y: number, r: number): string {
  if (sev === 'sev1') return `M${x},${y - r * 1.25} L${x + r * 1.25},${y} L${x},${y + r * 1.25} L${x - r * 1.25},${y} Z`;
  if (sev === 'sev2') return `M${x},${y - r * 1.2} L${x + r * 1.1},${y + r * 0.8} L${x - r * 1.1},${y + r * 0.8} Z`;
  if (sev === 'sev3') return `M${x - r * 0.9},${y - r * 0.9} h${r * 1.8} v${r * 1.8} h${-r * 1.8} Z`;
  return `M${x - r},${y} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`;
}

/**
 * Incidents where they are: a severity marker at the recorded point (or the
 * region's centre), a pulse for the gravest, a tether back to the institution
 * that reported it, and a tag naming it. Each opens the institution's incidents.
 */
function PlacedIncidents({ ctx, incidents, nodeAt, reserveEnd, reduced }: {
  ctx: OverlayContext; incidents: TheatreIncident[]; nodeAt: Map<string, { x: number; y: number }>; reserveEnd: number; reduced: boolean;
}) {
  const { width: W, height: H } = ctx;
  const unitAt = (p: IncidentPlace) => ctx.units.find(u => (p.regionCode && u.code === p.regionCode) || u.name === p.region);
  const order = ['sev1', 'sev2', 'sev3', 'sev4'];
  const placed = incidents
    .flatMap(inc => {
      const p = inc.place!;
      const q = p.lng != null && p.lat != null ? ctx.project(p.lng, p.lat) : null;
      const u = q ? null : unitAt(p);
      const at = q ? { x: q[0], y: q[1] } : u ? { x: u.x, y: u.y } : null;
      return at ? [{ inc, ...at, area: !q }] : [];
    })
    .sort((a, b) => order.indexOf(a.inc.severity) - order.indexOf(b.inc.severity));
  // Several incidents at one spot fan out around it; tags stack so they do not overlap.
  const seen = new Map<string, number>();
  const tags: { x: number; y: number; w: number }[] = [];
  return (
    <g>
      {placed.map(({ inc, x: x0, y: y0, area }, i) => {
        const k = `${Math.round(x0 / 6)}:${Math.round(y0 / 6)}`;
        const n = seen.get(k) ?? 0; seen.set(k, n + 1);
        const x = x0 + (n ? Math.cos(n * 2.1) * 9 : 0), y = y0 + (n ? Math.sin(n * 2.1) * 9 : 0);
        const tn = sevTone(inc.severity), c = TONE[tn], r = inc.severity === 'sev1' ? 6 : 5;
        const host = inc.ministryId ? nodeAt.get(inc.ministryId) : undefined;
        const word = SEV_WORD[inc.severity] ?? 'WATCH';
        const lbl = `${word} · ${inc.label ?? inc.ministry}`.slice(0, 38);
        const w = lbl.length * 4.5 + 14;
        let tx = Math.min(W - reserveEnd - w - 4, x + 10), ty = y - 18;
        if (tx < 4) tx = 4;
        for (const t of tags) if (Math.abs(t.x - tx) < Math.max(t.w, w) && Math.abs(t.y - ty) < 12) ty = t.y - 13;
        ty = Math.max(30, Math.min(H - 14, ty));
        tags.push({ x: tx, y: ty, w });
        const where = inc.place!.facilityName ?? [inc.place!.district, inc.place!.region].filter(Boolean).join(', ');
        const name = `${word.toLowerCase()} incident: ${inc.label ?? ''} (${inc.ministry})${where ? ` at ${where}` : ''}${inc.authority ? `, with ${inc.authority}` : ''}. Open the institution's incidents`;
        return (
          <a key={`pi${inc.ministryId}${inc.key}${i}`} href={inc.ministryId ? `/gov/ministry/${inc.ministryId}?tab=incidents` : undefined} aria-label={name}>
            {host ? <path d={`M${x},${y} Q${(x + host.x) / 2},${Math.min(y, host.y) - 18} ${host.x},${host.y}`} fill="none" stroke={c} strokeOpacity={0.45} strokeWidth={0.8} strokeDasharray="2 3" pointerEvents="none" /> : null}
            {area ? <circle cx={x} cy={y} r={r * 3.2} fill={c} fillOpacity={0.1} stroke={c} strokeOpacity={0.5} strokeWidth={0.7} strokeDasharray="3 2" /> : null}
            {tn === 'alert' && !reduced ? (
              <circle cx={x} cy={y} r={r * 1.6} fill="none" stroke={c} strokeWidth={1.1} className="animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} pointerEvents="none" />
            ) : null}
            <circle cx={x} cy={y} r={r * 2.4} fill={c} fillOpacity={0.14} />
            <path d={sevShape(inc.severity, x, y, r)} fill={c} stroke="rgb(var(--c-bg))" strokeWidth={1.2} style={{ filter: `drop-shadow(0 0 3px ${c})` }} />
            <line x1={x + r} y1={y - r * 0.6} x2={tx} y2={ty + 5.5} stroke={c} strokeOpacity={0.6} strokeWidth={0.6} pointerEvents="none" />
            <rect x={tx} y={ty} width={w} height={11} rx={2} fill="rgb(var(--c-surface))" fillOpacity={0.92} stroke={c} strokeWidth={0.8} />
            <text x={tx + 5} y={ty + 8} fontSize="7" fontWeight="700" letterSpacing="0.4" fill={c}>{lbl}</text>
            <title>{name}</title>
          </a>
        );
      })}
    </g>
  );
}

export function TheatreLayersSvg({ ctx, regions, nodes, edges, incidents, layers, tactical, heat, flowDur, reserveEnd = 0, ts = 0, sites = [], links = [], seats = {} }: {
  /** Recorded exchanges between institutions' registered seats (agreed and live). */
  links?: TheatreLink[];
  /** Registered seats of institutions, by institution id: their command node is tethered to it. */
  seats?: Record<string, { lng: number; lat: number }>;
  /** Published sites of the national facility register (drawn where they are, linked to their record). */
  sites?: TheatreSite[];
  ctx: OverlayContext;
  /** Width kept free at the end of the frame for panels laid over the map. */
  reserveEnd?: number;
  /** Clock of the live readings (seconds/4), for asset load and network pressure. */
  ts?: number;
  regions: TheatreRegion[];
  nodes: TheatreNode[];
  edges: TheatreEdge[];
  /** Active incidents; those with a recorded place are drawn where they are, the rest beside their institution. */
  incidents: TheatreIncident[];
  layers: TheatreLayers;
  tactical: boolean;
  heat: boolean;
  flowDur: string;
}) {
  const reduced = useReducedMotion();
  const uid = React.useId().replace(/:/g, '');
  const { width: W, height: H } = ctx;
  const cap = ctx.capital ?? { x: W / 2, y: H / 2 };
  const byName = new Map(regions.map(r => [r.name, r]));
  const anchors = ctx.units.map(u => ({ ...u, r: byName.get(u.name) }));
  // Typical spacing between label points: sizes glows, assets and rings to the nation's density.
  const spread = Math.max(6, Math.min(34, Math.sqrt((W * H) / Math.max(1, anchors.length)) * 0.42));
  const flagged = anchors.filter(a => a.r && a.r.posture !== 'stable');
  const top = [...anchors].filter(a => a.r).sort((a, b) => b.r!.composite - a.r!.composite).slice(0, Math.min(4, anchors.length));
  // Asset tiles, the most important first, capped so the theatre stays readable at any number of regions.
  const registered = new Set(sites.map(s => s.category));
  const placed = layers.infra ? sites.flatMap(s => { const q = ctx.project(s.lng, s.lat); return q ? [{ ...s, x: q[0], y: q[1] }] : []; }) : [];
  // Names of registered sites only where they do not run into another (certified first); the rest on hover.
  const named = new Set<string>();
  {
    const boxes: [number, number, number, number][] = [];
    for (const s of [...placed].sort((a, b) => Number(b.certified) - Number(a.certified))) {
      const w = Math.min(180, s.name.length * 4.6);
      const bx: [number, number, number, number] = [s.x - w / 2, s.y + 11, s.x + w / 2, s.y + 23];
      if (boxes.some(o => bx[0] < o[2] && bx[2] > o[0] && bx[1] < o[3] && bx[3] > o[1])) continue;
      boxes.push(bx); named.add(s.id);
    }
  }
  const assets = (layers.infra ? sampleAssetsAround(anchors, spread).filter(a => !registered.has(KIND_CATEGORY[a.kind] ?? '')).map(a => ({ ...a, risk: Math.round(wave(`arisk:${a.id}`, ts, 15, 92)) })) : [])
    .sort((a, b) => a.tier - b.tier || b.risk - a.risk).slice(0, Math.round(Math.min(60, Math.max(18, (W * H) / 9000))));
  // Names only for critical assets, never over another label.
  const labelled = new Set<string>();
  {
    const boxes: [number, number, number, number][] = [];
    for (const a of [...assets].filter(x => x.risk >= 75).sort((x, y) => y.risk - x.risk)) {
      const bx: [number, number, number, number] = [a.x - 40, a.y + 6, a.x + 40, a.y + 20];
      if (boxes.some(b => bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1])) continue;
      boxes.push(bx); labelled.add(a.id);
      if (labelled.size >= 6) break;
    }
  }
  const networks = layers.infra ? sampleNetworksOn(cap, anchors) : [];
  // Air lanes across the theatre (sample): long arcs over the capital with moving traffic.
  const lanes = layers.corridors ? [
    `M${-20},${H * 0.22} Q${cap.x},${cap.y - H * 0.5} ${W + 20},${H * 0.3}`,
    `M${-20},${H * 0.8} Q${cap.x},${cap.y + H * 0.35} ${W + 20},${H * 0.62}`,
    `M${W * 0.15},${H + 20} Q${cap.x - W * 0.1},${cap.y} ${W * 0.85},${-20}`,
  ] : [];
  const corridors = layers.corridors && anchors.length > 1 ? sampleCorridors(cap, anchors, Math.min(6, anchors.length)) : [];
  const evac = layers.corridors ? top.filter(a => a.r!.posture === 'critical' || a.r!.posture === 'elevated').slice(0, 2) : [];

  // Command nodes in a ring around the capital until their seats are registered.
  const R = Math.max(70, Math.min(210, Math.min(W, H) * 0.3));
  // The ring is centred on the capital where it fits; near an edge it moves inwards and keeps its spokes to the capital.
  const ringX = Math.max(R + 28, Math.min(W - reserveEnd - R - 28, cap.x));
  const ringY = Math.max(R * 0.8 + 48, Math.min(H - R * 0.8 - 28, cap.y));
  const nodeAt = new Map(nodes.map((m, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, nodes.length);
    return [m.ministryId, { x: Math.max(26, Math.min(W - 26, ringX + R * Math.cos(a))), y: Math.max(44, Math.min(H - 26, ringY + R * 0.8 * Math.sin(a))) }];
  }));
  const showNodes = layers.institutions !== false && nodes.length > 0;
  const crit = showNodes && layers.incidents ? nodes.filter(m => m.pressure >= 80).slice(0, 3) : [];
  const nearestFlagged = (p: { x: number; y: number }) => [...(flagged.length ? flagged : anchors)].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 2);
  const glow = heat ? 1.8 : 1;

  // Callouts: the five most pressed regions, labelled to the side, stacked so they do not overlap.
  const callouts = (() => {
    const placed: { a: (typeof top)[number]; lx: number; ly: number; right: boolean }[] = [];
    for (const a of [...top].sort((p, q) => p.y - q.y)) {
      const right = a.x >= cap.x;
      let ly = Math.max(48, Math.min(H - 44, a.y - 16));
      for (const p of placed) if (p.right === right && Math.abs(p.ly - ly) < 38) ly = p.ly + 38;
      placed.push({ a, lx: right ? Math.min(W - 134, Math.max(a.x + spread + 30, cap.x + R + 30)) : Math.max(8, Math.min(a.x - spread - 158, cap.x - R - 158)), ly: Math.min(H - 44, ly), right });
    }
    return placed;
  })();

  return (
    <g aria-hidden={false}>
      <defs>
        <pattern id={`grid-${uid}`} width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M34 0H0V34" fill="none" stroke="rgb(var(--c-line))" strokeWidth="0.5" />
        </pattern>
        <pattern id={`terrain-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="rgb(var(--c-line))" strokeWidth="0.5" strokeOpacity="0.5" />
        </pattern>
        <radialGradient id={`vig-${uid}`} cx="50%" cy="46%" r="62%">
          <stop offset="60%" stopColor="rgb(var(--c-bg))" stopOpacity="0" />
          <stop offset="100%" stopColor="rgb(var(--c-bg))" stopOpacity="0.62" />
        </radialGradient>
        {(['ok', 'neutral', 'warn', 'alert'] as const).map(t => (
          <radialGradient key={t} id={`gl-${t}-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={TONE[t]} stopOpacity={0.34 * glow} />
            <stop offset="55%" stopColor={TONE[t]} stopOpacity={0.13 * glow} />
            <stop offset="100%" stopColor={TONE[t]} stopOpacity="0" />
          </radialGradient>
        ))}
        <linearGradient id={`sweep-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <g pointerEvents="none" aria-hidden>
        {/* operational graticule */}
        <rect width={W} height={H} fill={`url(#grid-${uid})`} opacity={layers.grid ? 0.5 : 0.16} />
        <rect width={W} height={H} fill={`url(#terrain-${uid})`} opacity="0.1" />

        {/* population (sample): density around each region, denser towards the capital */}
        {layers.environment !== false ? anchors.flatMap((a, h) => Array.from({ length: 4 }, (_, i) => {
          const near = Math.max(0, 1 - Math.hypot(a.x - cap.x, a.y - cap.y) / (Math.max(W, H) * 0.7));
          if (seed(`pp:${a.name}:${i}`) > near + 0.25) return null;
          const ang = seed(`ppa:${a.name}:${i}`) * Math.PI * 2, rad = seed(`ppr:${a.name}:${i}`) * spread;
          return <circle key={`pp${h}-${i}`} cx={a.x + Math.cos(ang) * rad} cy={a.y + Math.sin(ang) * rad} r={0.7 + near * 1.2} fill="rgb(var(--c-ink-soft))" opacity={0.08 + near * 0.18} />;
        })) : null}

        {/* pressure diffusion over every region that is not stable */}
        {flagged.map(a => {
          const tn = POSTURE_TONE[a.r!.posture];
          return (
            <g key={`df${a.name}`}>
              <circle cx={a.x} cy={a.y} r={spread * (a.r!.posture === 'critical' ? 2.6 : a.r!.posture === 'elevated' ? 2.1 : 1.6)} fill={`url(#gl-${tn}-${uid})`} />
              <circle cx={a.x} cy={a.y} r={spread * 1.05} fill="none" stroke={TONE[tn]} strokeOpacity="0.3" strokeWidth="0.9" strokeDasharray="2 6" />
              {a.r!.posture === 'critical' && layers.incidents ? (
                <circle cx={a.x} cy={a.y} r={spread * 0.9} fill="none" stroke={TONE.alert} strokeWidth="1.3"
                  className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
              ) : null}
            </g>
          );
        })}

        {/* corridors (sample): capital to the regions, moving traffic by load */}
        {corridors.map((c, i) => {
          const col = CORRIDOR_TONE[c.kind];
          const load = byName.get(c.to)?.composite ?? 40;
          const dur = `${(2.2 + (100 - load) / 100 * 3).toFixed(1)}s`;
          return (
            <g key={c.id}>
              <path d={c.d} fill="none" stroke={col} strokeWidth={3.2} strokeOpacity={0.08} strokeLinecap="round" />
              <path d={c.d} fill="none" stroke={col} strokeWidth={1 + load / 80} strokeOpacity={0.5} strokeDasharray="2 8" strokeLinecap="round"
                className="motion-safe:animate-dash-flow" style={{ animationDuration: flowDur }} />
              {!reduced ? [0, 1].map(k => (
                <circle key={k} r={1.4} fill={col} opacity="0.8" style={{ filter: `drop-shadow(0 0 1.5px ${col})` }}>
                  <animateMotion dur={dur} begin={`${k * 1.3 + i * 0.4}s`} repeatCount="indefinite" path={c.d} />
                </circle>
              )) : null}
            </g>
          );
        })}

        {/* evacuation routes (sample): from the most pressed regions to the capital */}
        {evac.map((a, i) => {
          const d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${((a.x + cap.x) / 2 + 24).toFixed(1)},${((a.y + cap.y) / 2 - 24).toFixed(1)} ${cap.x.toFixed(1)},${cap.y.toFixed(1)}`;
          return (
            <g key={`ev${i}`}>
              <path d={d} fill="none" stroke={TONE.warn} strokeWidth="2.4" strokeOpacity="0.12" />
              <path d={d} fill="none" stroke={TONE.warn} strokeWidth="1" strokeOpacity="0.55" strokeDasharray="5 4" className="motion-safe:animate-dash-flow" style={{ animationDuration: '1.4s' }} />
            </g>
          );
        })}

        {/* air lanes (sample) */}
        {lanes.map((d, i) => (
          <g key={`al${i}`}>
            <path d={d} fill="none" stroke={TONE.link} strokeOpacity="0.2" strokeWidth="0.8" strokeDasharray="1 6" />
            {!reduced ? <circle r="1.6" fill={TONE.link} style={{ filter: `drop-shadow(0 0 2px ${TONE.link})` }}><animateMotion dur={`${8 + i * 2}s`} repeatCount="indefinite" path={d} rotate="auto" /></circle> : null}
          </g>
        ))}

        {/* networks (sample): road, rail, grid, pipeline, hot where under pressure */}
        {networks.map(n => {
          const col = NET_TONE[n.kind];
          const press = networkPressure(n.kind, ts);
          return (
            <g key={n.id}>
              <path d={n.d} fill="none" stroke={col} strokeWidth={n.kind === 'road' ? 1.2 : 0.9} strokeOpacity={n.kind === 'road' ? 0.3 : 0.45}
                strokeDasharray={n.kind === 'rail' ? '4 3' : n.kind === 'pipeline' ? '1 4' : undefined} />
              {press >= 62 ? <path d={n.d} fill="none" stroke={press >= 78 ? TONE.alert : TONE.warn} strokeWidth="1.2" strokeOpacity="0.55" strokeDasharray="2 7"
                className="motion-safe:animate-dash-flow" style={{ animationDuration: '1s' }} /> : null}
            </g>
          );
        })}
      </g>

      {/* infrastructure (sample): asset tiles by load, tethered to their region; critical ones named */}
      {assets.length ? (
        <g pointerEvents="none" aria-hidden>
          {assets.map(a => {
            const home = anchors.reduce((best, x) => (Math.hypot(x.x - a.x, x.y - a.y) < Math.hypot(best.x - a.x, best.y - a.y) ? x : best), anchors[0]!);
            return <line key={`t${a.id}`} x1={a.x} y1={a.y} x2={home.x} y2={home.y} stroke="rgb(var(--c-line))" strokeOpacity="0.3" strokeWidth="0.5" />;
          })}
          {assets.map(a => {
            const tone = toneFor(a.risk);
            const crit = a.risk >= 75;
            const k = Math.max(0.75, Math.min(1, spread / 22));
            const s = (a.tier === 1 ? 16 : a.tier === 2 ? 13 : 10) * k;
            return (
              <g key={a.id}>
                {crit ? <circle cx={a.x} cy={a.y} r={s} fill={TONE.alert} fillOpacity="0.18" className="motion-safe:animate-breathe" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} /> : null}
                <rect x={a.x - s / 2} y={a.y - s / 2} width={s} height={s} rx={3} fill="rgb(var(--c-surface-2))" fillOpacity="0.92" stroke={TONE[tone]} strokeWidth={crit ? 1.4 : 0.9}
                  style={crit ? { filter: `drop-shadow(0 0 4px ${TONE.alert})` } : undefined} />
                <text x={a.x} y={a.y + s * 0.3} textAnchor="middle" fontSize={s * 0.66} fill={TONE[tone]}>{ASSET_GLYPH[a.kind]}</text>
                {labelled.has(a.id) ? (
                  <g>
                    <rect x={a.x - 38} y={a.y + s / 2 + 2} width={76} height={11} rx={2} fill="rgb(var(--c-surface))" fillOpacity="0.9" stroke={crit ? TONE.alert : 'rgb(var(--c-line))'} strokeWidth="0.6" />
                    <text x={a.x} y={a.y + s / 2 + 10} textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="0.6" fill={crit ? TONE.alert : 'rgb(var(--c-ink-soft))'}>{ASSET_LABEL[a.kind].toUpperCase()}</text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
      ) : null}

      {/* registered sites (the nation's own, from the facility register): solid tiles where they are */}
      {placed.length ? (
        <g aria-label={`${placed.length} registered sites`}>
          {placed.map(s => (
            <a key={s.id} href={`/gov/sites#${s.id}`} aria-label={`${s.name} (${s.certified ? 'location certified' : 'awaiting certification'}${s.generalised ? ', position generalised' : ''})`}>
              <title>{`${s.name} · ${s.certified ? 'location certified' : 'awaiting certification'}${s.generalised ? ' · position generalised' : ''}`}</title>
              <rect x={s.x - 9} y={s.y - 9} width={18} height={18} rx={3} fill="rgb(var(--c-surface))" stroke={s.certified ? TONE.ok : TONE.warn} strokeWidth={1.8}
                strokeDasharray={s.generalised ? '3 2' : undefined} style={{ filter: `drop-shadow(0 0 4px ${s.certified ? TONE.ok : TONE.warn})` }} />
              <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="11" fill={s.certified ? TONE.ok : TONE.warn}>{s.glyph}</text>
              {named.has(s.id) ? <text x={s.x} y={s.y + 20} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="rgb(var(--c-ink))" stroke="rgb(var(--c-bg))" strokeWidth={2.5} paintOrder="stroke">{s.name}</text> : null}
            </a>
          ))}
        </g>
      ) : null}

      <g pointerEvents="none" aria-hidden>
        {/* radar range rings and sweep over the capital */}
        {tactical ? (
          <g>
            {[1, 2, 3].map(k => <circle key={k} cx={cap.x} cy={cap.y} r={R * 0.55 * k} fill="none" stroke={ACCENT} strokeOpacity={0.14} strokeWidth="0.7" strokeDasharray="2 5" />)}
            <path d={`M${cap.x},${cap.y} L${cap.x + R * 1.65},${cap.y} A${R * 1.65},${R * 1.65} 0 0 0 ${cap.x + R * 1.65 * Math.cos(-0.45)},${cap.y + R * 1.65 * Math.sin(-0.45)} Z`}
              fill={`url(#sweep-${uid})`}>
              {!reduced ? <animateTransform attributeName="transform" type="rotate" from={`0 ${cap.x} ${cap.y}`} to={`360 ${cap.x} ${cap.y}`} dur="7s" repeatCount="indefinite" /> : null}
            </path>
            <circle cx={cap.x} cy={cap.y} r={10} fill="none" stroke={ACCENT} strokeOpacity="0.6" strokeWidth="1"
              className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          </g>
        ) : null}
      </g>

      {/* recorded exchanges between institutions' registered seats: solid, by how they are doing */}
      {layers.institutions !== false && links.length ? (
        <g aria-label={`${links.length} recorded exchanges between institutions`}>
          {links.map((l, i) => {
            const pa = ctx.project(l.a.lng, l.a.lat), pb = ctx.project(l.b.lng, l.b.lat);
            if (!pa || !pb) return null;
            const tone = l.health === 'healthy' ? TONE.ok : l.health === 'failing' ? TONE.alert : l.health === 'quiet' ? TONE.warn : ACCENT;
            const d = `M${pa[0]},${pa[1]} Q${(pa[0] + pb[0]) / 2},${(pa[1] + pb[1]) / 2 - 26 - (i % 3) * 10} ${pb[0]},${pb[1]}`;
            return (
              <g key={`rx${i}`}>
                <title>{`${l.label}: ${l.kind === 'live' ? 'live exchange' : 'agreed exchange'} (${l.health})`}</title>
                <path d={d} fill="none" stroke={tone} strokeWidth={4} strokeOpacity={0.12} />
                <path d={d} fill="none" stroke={tone} strokeWidth={1.6} strokeOpacity={0.9} strokeDasharray={l.health === 'quiet' ? '4 3' : undefined} />
                {l.kind === 'live' && l.health === 'healthy' && !reduced ? <circle r="2" fill={tone} style={{ filter: `drop-shadow(0 0 2px ${tone})` }}><animateMotion dur="3s" repeatCount="indefinite" path={d} /></circle> : null}
              </g>
            );
          })}
        </g>
      ) : null}

      {/* institutions: command nodes, knock-on links, cascades into the regions */}
      {showNodes ? (
        <g>
          <g pointerEvents="none" aria-hidden>
            {nodes.map(m => { const p = nodeAt.get(m.ministryId)!; return <line key={`s${m.ministryId}`} x1={cap.x} y1={cap.y} x2={p.x} y2={p.y} stroke={ACCENT} strokeOpacity={0.16} strokeWidth={0.6} />; })}
            {/* a node whose institution has registered its seat is tethered to it */}
            {nodes.map(m => {
              const s = seats[m.ministryId]; const q = s && ctx.project(s.lng, s.lat); const p = nodeAt.get(m.ministryId)!;
              return q ? <g key={`seat${m.ministryId}`}><line x1={p.x} y1={p.y} x2={q[0]} y2={q[1]} stroke={TONE.ok} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="2 3" /><rect x={q[0] - 4} y={q[1] - 4} width={8} height={8} rx={1.5} fill={TONE.ok} /></g> : null;
            })}
            {edges.slice(0, 26).map((e, i) => {
              const a = nodeAt.get(e.fromId), b = nodeAt.get(e.toId);
              if (!a || !b) return null;
              const tn = e.propagatedRisk >= 67 ? 'alert' : e.propagatedRisk >= 34 ? 'warn' : 'ok';
              const qx = (a.x + b.x) / 2 + (cap.x - (a.x + b.x) / 2) * 0.45, qy = (a.y + b.y) / 2 + (cap.y - (a.y + b.y) / 2) * 0.45;
              return (
                <path key={i} d={`M${a.x},${a.y} Q${qx},${qy} ${b.x},${b.y}`} fill="none" stroke={TONE[tn]}
                  strokeWidth={0.6 + (e.propagatedRisk / 100) * 2.2} strokeOpacity={0.25 + (e.propagatedRisk / 100) * 0.5} strokeDasharray="3 7"
                  className="motion-safe:animate-dash-flow" style={{ animationDuration: flowDur }} />
              );
            })}
            {crit.flatMap(m => {
              const p = nodeAt.get(m.ministryId)!;
              return nearestFlagged(p).map((r, k) => (
                <path key={`cs${m.ministryId}${k}`} d={`M${p.x},${p.y} Q${(p.x + r.x) / 2},${(p.y + r.y) / 2 - 30} ${r.x},${r.y}`}
                  fill="none" stroke={TONE.alert} strokeWidth="1.2" strokeOpacity="0.55" strokeDasharray="2 5"
                  className="motion-safe:animate-dash-flow" style={{ animationDuration: '0.7s' }} />
              ));
            })}
            {layers.incidents ? nodes.filter(m => m.pressure >= 68).map(m => {
              const p = nodeAt.get(m.ministryId)!;
              return <circle key={`sh${m.ministryId}`} cx={p.x} cy={p.y} r={20} fill="none" stroke={TONE.alert} strokeWidth="1.1"
                className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />;
            }) : null}
          </g>
          {nodes.map(m => {
            const p = nodeAt.get(m.ministryId)!;
            const id = identityFor(m.archetype as ArchetypeKey);
            const tn = toneFor(m.pressure);
            const tier = m.pressure >= 80 ? 'crit' : m.pressure >= 60 ? 'sec' : 'passive';
            const r = tier === 'crit' ? 19 : tier === 'sec' ? 15 : 11;
            return (
              <Link key={m.ministryId} href={`/gov/ministry/${m.ministryId}`} aria-label={`${m.ministry}: pressure ${m.pressure} (sample). Open its workspace`}
                className="focus-ring" style={{ opacity: tier === 'passive' ? 0.78 : 1 }}>
                <title>{`${m.ministry} · pressure ${m.pressure}`}</title>
                {tier === 'crit' ? (
                  <>
                    <circle cx={p.x} cy={p.y} r={r + 9} fill="none" stroke={TONE[tn]} strokeOpacity={0.6} strokeWidth={1}
                      className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                    <circle cx={p.x} cy={p.y} r={r + 6} fill={TONE[tn]} fillOpacity={0.14} className="motion-safe:animate-breathe" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                  </>
                ) : null}
                <circle cx={p.x} cy={p.y} r={r} fill={id.accent} stroke={TONE[tn]} strokeWidth={2.4}
                  style={{ filter: `drop-shadow(0 0 ${tier === 'crit' ? 11 : tier === 'sec' ? 7 : 4}px ${TONE[tn]})` }} />
                <text x={p.x} y={p.y + r * 0.38} textAnchor="middle" fontSize={r} fontWeight={700} fill="#fff" pointerEvents="none">{id.glyph}</text>
                {tier !== 'passive' ? <text x={p.x} y={p.y + r + 11} textAnchor="middle" fontSize="9" fontWeight="700" fill={TONE[tn]} stroke="rgb(var(--c-bg))" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">{m.ministry}</text> : null}
              </Link>
            );
          })}
          {/* incident chips beside the institution that reported them */}
          {layers.incidents ? Object.values(incidents.filter(inc => !inc.place).reduce<Record<string, { ministry: string; severity: string; n: number }>>((acc, inc) => {
            const k = `${inc.ministry}|${inc.severity}`;
            acc[k] = { ...inc, n: (acc[k]?.n ?? 0) + 1 };
            return acc;
          }, {})).slice(0, 7).map((inc, i) => {
            const host = nodes.find(m => m.ministry === inc.ministry) ?? nodes[i % nodes.length]!;
            const p = nodeAt.get(host.ministryId)!;
            const tn = inc.severity === 'sev1' || inc.severity === 'sev2' ? 'alert' : inc.severity === 'sev3' ? 'warn' : 'neutral';
            const lbl = `${inc.severity === 'sev1' ? 'CRITICAL' : inc.severity === 'sev2' ? 'ELEVATED' : inc.severity === 'sev3' ? 'WARNING' : 'WATCH'} · ${inc.ministry}${inc.n > 1 ? ` ×${inc.n}` : ''}`;
            const w = Math.min(170, lbl.length * 4.6 + 14), x = Math.min(W - w - 4, p.x + 12), y = p.y - 20 - (i % 2) * 13;
            return (
              <g key={`ic${i}`} pointerEvents="none" aria-hidden>
                <rect x={x} y={y} width={w} height={11} rx={2} fill="rgb(var(--c-surface))" fillOpacity={0.88} stroke={TONE[tn]} strokeWidth={0.8} />
                <circle cx={x + 5} cy={y + 5.5} r={1.8} fill={TONE[tn]} className="motion-safe:animate-pulse" />
                <text x={x + 9} y={y + 8} fontSize="7" fontWeight="700" letterSpacing="0.5" fill={TONE[tn]}>{lbl}</text>
              </g>
            );
          }) : null}
        </g>
      ) : null}

      {/* status callouts: readiness ring at the region, label to the side */}
      <g pointerEvents="none" aria-hidden>
        {callouts.map(({ a, lx, ly, right }) => {
          const tn = POSTURE_TONE[a.r!.posture];
          const ready = Math.max(1, 100 - a.r!.composite);
          const rr = Math.max(5, spread * 0.55), circ = 2 * Math.PI * rr;
          return (
            <g key={`co${a.name}`}>
              <g transform={`rotate(-90 ${a.x} ${a.y})`}>
                <circle cx={a.x} cy={a.y} r={rr} fill="none" stroke="rgb(var(--c-line))" strokeOpacity="0.35" strokeWidth="1.4" />
                <circle cx={a.x} cy={a.y} r={rr} fill="none" stroke={TONE[tn]} strokeWidth="1.6" strokeLinecap="round"
                  strokeDasharray={`${(ready / 100) * circ} ${circ}`} style={{ filter: `drop-shadow(0 0 2px ${TONE[tn]})` }} />
              </g>
              <path d={`M${a.x + (right ? rr : -rr)},${a.y} L${right ? lx - 4 : lx + 132},${ly + 13}`} stroke={TONE[tn]} strokeOpacity="0.6" strokeWidth="0.7" fill="none" />
              <rect x={lx} y={ly} width={128} height={32} rx={2} fill="rgb(var(--c-surface))" fillOpacity={0.82} stroke={TONE[tn]} strokeOpacity={0.55} strokeWidth={0.7} />
              <text x={lx + 6} y={ly + 11} fontSize="9.5" fontWeight="600" fill="rgb(var(--c-ink))">{a.name.length > 20 ? `${a.name.slice(0, 19)}…` : a.name}</text>
              <text x={lx + 6} y={ly + 21} fontSize="8.5" fontWeight="700" fill={TONE[tn]}>{a.r!.composite} · {POSTURE_WORD[a.r!.posture]}</text>
              <text x={lx + 6} y={ly + 29.5} fontSize="7" letterSpacing="1" fill="rgb(var(--c-ink-muted))">READINESS {ready}%</text>
            </g>
          );
        })}
      </g>

      {/* incidents where they are (recorded by the institution), above everything but the framing */}
      {layers.incidents ? <PlacedIncidents ctx={ctx} incidents={incidents.filter(i => i.place)} nodeAt={showNodes ? nodeAt : new Map()} reserveEnd={reserveEnd} reduced={reduced} /> : null}

      {/* tactical framing: scanline, corner brackets, crosshair, vignette */}
      {tactical ? (
        <g pointerEvents="none" aria-hidden>
          {!reduced ? (
            <line x1={0} x2={W} y1={0} y2={0} stroke={ACCENT} strokeOpacity={0.35} strokeWidth={0.8} style={{ filter: `drop-shadow(0 0 3px ${ACCENT})` }}>
              <animateTransform attributeName="transform" type="translate" from="0 0" to={`0 ${H}`} dur="6.5s" repeatCount="indefinite" />
            </line>
          ) : null}
          {[[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]].map(([x, y, dx, dy], i) => (
            <path key={i} d={`M${x},${y! + dy! * 14} L${x},${y} L${x! + dx! * 14},${y}`} fill="none" stroke={ACCENT} strokeOpacity={0.45} strokeWidth={1} />
          ))}
          <line x1={W / 2 - 18} x2={W / 2 + 18} y1={H / 2} y2={H / 2} stroke={ACCENT} strokeOpacity={0.16} />
          <line y1={H / 2 - 18} y2={H / 2 + 18} x1={W / 2} x2={W / 2} stroke={ACCENT} strokeOpacity={0.16} />
          <rect width={W} height={H} fill={`url(#vig-${uid})`} />
        </g>
      ) : null}
    </g>
  );
}

/** The theatre's legend: status, sample layers and glyphs, each sample marked. */
export function TheatreLegend({ layers, registered = 0 }: { layers: TheatreLayers; registered?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[3px] border border-line bg-surface/85 px-2.5 py-1 text-[10px] text-ink-muted backdrop-blur">
      {(['ok', 'neutral', 'warn', 'alert'] as const).map(t => (
        <span key={t} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE[t] }} aria-hidden />{t === 'ok' ? 'Stable' : t === 'neutral' ? 'Watch' : t === 'warn' ? 'Elevated' : 'Critical'}</span>
      ))}
      <span className="flex items-center gap-1 border-s border-line ps-2"><span style={{ color: ACCENT }} aria-hidden>◎</span>radar over the capital</span>
      {layers.institutions !== false ? <span className="flex items-center gap-1"><span style={{ color: TONE.alert }} aria-hidden>↯</span>cascade · <span style={{ color: TONE.warn }} aria-hidden>┄</span>knock-on link</span> : null}
      {layers.corridors ? (
        <span className="flex items-center gap-2 border-s border-line ps-2">
          {(Object.keys(CORRIDOR_TONE) as (keyof typeof CORRIDOR_TONE)[]).map(k => (
            <span key={k} className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: CORRIDOR_TONE[k] }} aria-hidden />{k}</span>
          ))}
          <span className="flex items-center gap-1"><span style={{ color: TONE.warn }} aria-hidden>┄</span>evacuation</span>
          <span className="rounded-[2px] border border-dashed border-line px-1 text-[9px] uppercase tracking-[0.1em]">sample</span>
        </span>
      ) : null}
      {layers.incidents ? (
        <span className="flex items-center gap-1 border-s border-line ps-2" title="Incidents placed by the institution that reported them">
          <span style={{ color: TONE.alert }} aria-hidden>◆</span>critical
          <span style={{ color: TONE.alert }} aria-hidden>▲</span>elevated
          <span style={{ color: TONE.warn }} aria-hidden>■</span>warning
          <span style={{ color: TONE.neutral }} aria-hidden>●</span>watch incident
        </span>
      ) : null}
      {layers.infra ? (
        <span className="flex items-center gap-1 border-s border-line ps-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] border-2" style={{ borderColor: TONE.ok }} aria-hidden />registered site{registered === 1 ? '' : 's'} ({registered})
          <span className="ms-2 inline-block h-0.5 w-4" style={{ backgroundColor: TONE.ok }} aria-hidden />recorded exchange
        </span>
      ) : null}
      {layers.infra ? (
        <span className="flex items-center gap-1 border-s border-line ps-2">
          {(['road', 'rail', 'grid', 'pipeline'] as const).map(k => <span key={k} className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: NET_TONE[k] }} aria-hidden />{k}</span>)}
          {(Object.entries(ASSET_GLYPH) as [keyof typeof ASSET_LABEL, string][]).map(([k, g]) => <span key={k} title={ASSET_LABEL[k]} aria-label={ASSET_LABEL[k]}>{g}</span>)}
          <span className="rounded-[2px] border border-dashed border-line px-1 text-[9px] uppercase tracking-[0.1em]">sample</span>
        </span>
      ) : null}
      {layers.environment !== false ? <span className="flex items-center gap-1 border-s border-line ps-2"><span className="h-1.5 w-1.5 rounded-full bg-ink-soft/60" aria-hidden />population <span className="rounded-[2px] border border-dashed border-line px-1 text-[9px] uppercase tracking-[0.1em]">sample</span></span> : null}
    </div>
  );
}
