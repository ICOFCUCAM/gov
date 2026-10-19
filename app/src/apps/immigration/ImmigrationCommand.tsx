'use client';

// Immigration & Borders — National Immigration and Border Management
// System. Dense border-command surface modelled on the benchmark: entry/
// exit KPI strip, border-crossings world map, crossings by border, entry
// purpose, visa & permit summary, overstay cases, watchlist alerts, recent
// refusals, document alerts, nationality breakdown and a live border feed.
// Pure & deterministic — engine + telemetry only.

import * as React from 'react';
import { immigrationOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';
import { nationCapital, nationIso3, nationTime, nationTimeZoneLabel } from '@/lib/nation/registry';
import { STATUS } from '@/lib/theme/tokens';
import { CommandMap, useFrontier, type CommandPalette } from '@/apps/police-command/CommandMap';
import { regionAt } from '@/apps/police-command/frontier';

const BG = '#070a10';
const PANEL = '#0c1119';
const PANEL2 = '#10151f';
const LINE = 'rgba(120,140,200,0.16)';
const RED = '#e0685f';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const CYAN = '#4fb3d9';
const EMER = '#3fae82';
const BLUE = '#5b8def';
const VIOLET = '#9b8cff';
const INK = '#d6dde6';
const SOFT = '#93a0ad';
const MUT = '#62707e';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';

function Donut({ segs, top, sub, size = 150 }: {
  segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 13, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#161c26" strokeWidth="13" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="13"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.15} fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>{top}</text>
        <text x="50%" y="59%" textAnchor="middle" fontSize={size * 0.062} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-12 text-right font-mono tabular-nums" style={{ color: MUT }}>({Math.round((s.v / sum) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Area({ pts, color = EMER, h = 130 }: { pts: number[]; color?: string; h?: number }) {
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 100, 90 - ((p - mn) / sp) * 78] as [number, number]);
  const line = xy.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: h }} aria-hidden>
      {[20, 40, 60, 80].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#161c26" strokeWidth="0.4" />)}
      <polygon points={`0,92 ${line} 100,92`} fill={color} opacity="0.14" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${color} 45%,transparent))` }} />
      {xy.filter((_, i) => i % 2 === 0).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" fill={color} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}

// Border crossings on the nation's real map: its land borders with each real
// neighbour (named around the nation), a border post in the region that
// touches each one, the main airport in the capital's region and a seaport
// on the coast (all samples until the service registers its border posts,
// airports and ports in the national facility register, which then replace
// them), traffic arriving from each neighbour and routes on to the capital.
// Zoom, whole nation, full screen and layers work.
const PALETTE: CommandPalette = { critical: RED, high: AMBER, medium: GOLD, low: EMER, monitor: CYAN, accent: CYAN, line: LINE, panel: PANEL, ink: INK, soft: SOFT, muted: MUT };
export interface BorderPoint { label: string; kind: 'land' | 'air' | 'sea'; region: string; neighbour?: string; at?: [number, number]; entries: number; exits: number; trend: number; closed: boolean }
const trafficColour = (b: BorderPoint, max: number) => (b.closed ? MUT : b.entries / max > 0.66 ? RED : b.entries / max > 0.42 ? AMBER : EMER);
const trafficWord = (b: BorderPoint, max: number) => (b.closed ? 'CLOSED' : b.entries / max > 0.66 ? 'HIGH TRAFFIC' : b.entries / max > 0.42 ? 'MEDIUM TRAFFIC' : 'LOW TRAFFIC');
const GLYPH = { land: '⛬', air: '✈', sea: '⚓' } as const;
const CATEGORY = { land: 'border-post', air: 'airport', sea: 'port' } as const;

function BorderWorld({ seedKey, points, selected, onSelect }: {
  seedKey: string;
  points: BorderPoint[];
  selected?: string;
  onSelect: (region: string | undefined) => void;
}) {
  const max = Math.max(1, ...points.map(b => b.entries));
  const byRegion = new Map<string, number>();
  for (const b of points) byRegion.set(b.region, (byRegion.get(b.region) ?? 0) + b.entries + b.exits);
  const busiest = [...points].filter(b => !b.closed).sort((a, b) => b.entries - a.entries);
  const anyClosed = points.some(b => b.closed);
  return (
    <CommandMap title="Border crossings by region" height={260} palette={PALETTE}
      values={[...byRegion].map(([key, value]) => ({ key, value }))} kind="sample"
      source="Crossings by border point (sample) until the border management system is connected" valueLabel="Crossings today" unit="people"
      emptyNote={points.length ? undefined : 'The nation has no land borders, airport or port recorded yet.'}
      categories={['border-post', 'airport', 'port']}
      samples={points.map(b => ({ region: b.region, label: b.label, tone: (b.closed ? 'neutral' : 'ok') as 'neutral' | 'ok', glyph: GLYPH[b.kind], category: CATEGORY[b.kind], layer: 'posts' }))}
      samplesSource="border posts at the regions bordering each neighbour, the main airport and seaport"
      flows={busiest.slice(0, 5).map(b => ({ from: b.region, to: 'capital', label: `${b.label} to the capital`, tone: (b.entries / max > 0.66 ? 'alert' : b.entries / max > 0.42 ? 'warn' : 'ok') as 'alert' | 'warn' | 'ok', weight: 1 + (b.entries / max) * 2, layer: 'routes' }))}
      hotspots={busiest.slice(0, 2).map(b => ({ region: b.region, intensity: Math.round(50 + (b.entries / max) * 40) }))}
      callouts={busiest.slice(0, 3).map(b => ({ region: b.region, line1: b.label, line2: `${b.entries.toLocaleString()} IN · ${trafficWord(b, max)}`, colour: trafficColour(b, max) }))}
      layers={[{ id: 'traffic', label: 'Traffic at border points', sample: true }, { id: 'posts', label: 'Border posts, airport, port', sample: true }, { id: 'routes', label: 'Routes to the capital', sample: true }]}
      legend={[
        { label: 'High Traffic', colour: RED, shape: 'glow', layer: 'traffic' }, { label: 'Medium Traffic', colour: AMBER, shape: 'glow', layer: 'traffic' },
        { label: 'Low Traffic', colour: EMER, shape: 'glow', layer: 'traffic' },
        ...(anyClosed ? [{ label: 'Closed', colour: MUT, shape: 'ring' as const, layer: 'traffic' }] : []),
        { label: 'Border post', colour: STATUS.ok, shape: 'glyph' as const, glyph: '⛬', layer: 'posts', sample: true },
        { label: 'Airport', colour: STATUS.ok, shape: 'glyph' as const, glyph: '✈', layer: 'posts', sample: true },
        ...(points.some(b => b.kind === 'sea') ? [{ label: 'Seaport', colour: STATUS.ok, shape: 'glyph' as const, glyph: '⚓', layer: 'posts', sample: true }] : []),
      ]}
      selected={selected} onSelect={onSelect} fullMapHref="/gov/situation-room"
      extra={(ctx, on) => {
        if (!on('traffic')) return null;
        const at = new Map(ctx.units.map(u => [u.name, u] as const));
        return (
          <g aria-hidden pointerEvents="none">
            {points.map((b, i) => {
              const u = at.get(b.region); if (!u) return null;
              const q = b.at ? ctx.project(b.at[0], b.at[1]) : null;
              const p = q ? { x: q[0], y: q[1] } : { x: u.x, y: u.y };
              const c = trafficColour(b, max);
              const r = 6 + (b.entries / max) * 10;
              // Traffic arriving from the neighbour: from beyond the border, along the line from the region's centre.
              const dx = p.x - u.x, dy = p.y - u.y, len = Math.hypot(dx, dy) || 1;
              const o = { x: p.x + (dx / len) * 46, y: p.y + (dy / len) * 46 };
              const d = `M${o.x.toFixed(1)},${o.y.toFixed(1)} Q${((o.x + p.x) / 2 + (dy / len) * 14).toFixed(1)},${((o.y + p.y) / 2 - (dx / len) * 14).toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              return (
                <g key={`b${i}`}>
                  {b.kind === 'land' && !b.closed ? <path d={d} fill="none" stroke={c} strokeWidth={1} strokeOpacity={0.65} strokeDasharray="3 3" className="motion-safe:animate-dash-flow" /> : null}
                  <circle cx={p.x} cy={p.y} r={r} fill={c} opacity={b.closed ? 0 : 0.2} />
                  {b.closed ? <circle cx={p.x} cy={p.y} r={5} fill="none" stroke={MUT} strokeWidth={1.2} /> : null}
                  <circle cx={p.x} cy={p.y} r={b.closed ? 1.8 : 2.8} fill={c} style={{ filter: `drop-shadow(0 0 4px ${c})` }}>
                    <title>{`${b.label}: ${b.entries.toLocaleString()} entries, ${b.exits.toLocaleString()} exits · ${trafficWord(b, max).toLowerCase()} (sample)`}</title>
                  </circle>
                </g>
              );
            })}
          </g>
        );
      }} />
  );
}

function Panel({ title, action, children, className }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-[4px] border ${className ?? ''}`} style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: LINE }}>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: INK }}>{title}</h3>
        {typeof action === 'string' ? <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: CYAN }}>{action}</span> : action ?? null}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

export function ImmigrationCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = immigrationOps(id, ts);
  const clock = new Date(now);
  const hh = nationTime(clock);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`ib:${k}:${id}`, ts, n, lo, hi);

  const entries = Math.round(wave(`ib:en:${id}`, ts, 20000, 30000));
  const exits = Math.round(entries * 0.9);
  const refusals = Math.round(wave(`ib:rf:${id}`, ts, 380, 640));
  const watchHits = o.flaggedEntries + 90;
  const overstay = Math.round(wave(`ib:ov:${id}`, ts, 2600, 3900));
  const docAlerts = Math.round(wave(`ib:da:${id}`, ts, 360, 520));

  const kpis: [string, string, string, string][] = [
    ['Total Entries (Today)', entries.toLocaleString(), '+8.7% vs yesterday', VIOLET],
    ['Total Exits (Today)', exits.toLocaleString(), '+6.2% vs yesterday', BLUE],
    ['Refusals (Today)', `${refusals}`, '+4.1% vs yesterday', AMBER],
    ['Watchlist Hits (Today)', `${watchHits}`, '+3.2% vs yesterday', RED],
    ['Overstay Cases (Active)', overstay.toLocaleString(), '-2.6% vs yesterday', GOLD],
    ['Document Alerts (Today)', `${docAlerts}`, '+5.3% vs yesterday', AMBER],
  ];

  // Border points are the nation's own: a land border with each real neighbour (at the region that
  // touches it), the main airport in the capital's region and a seaport on the coast. Figures are samples.
  const frontier = useFrontier();
  const [border, setBorder] = React.useState<string | undefined>(undefined);
  const points: BorderPoint[] = React.useMemo(() => {
    if (!frontier) return [];
    const capRegion = regionAt(frontier, nationCapital());
    const base: Omit<BorderPoint, 'entries' | 'exits' | 'trend' | 'closed'>[] = [
      ...frontier.neighbours.map(n => ({ label: `${n.name} land border`, kind: 'land' as const, region: n.region, neighbour: n.name, at: n.at })),
      ...(capRegion ? [{ label: `International airport (${capRegion})`, kind: 'air' as const, region: capRegion }] : []),
      ...(frontier.coastal[0] ? [{ label: `Seaport (${frontier.coastal[0].region})`, kind: 'sea' as const, region: frontier.coastal[0].region, at: frontier.coastal[0].at }] : []),
    ];
    const closedCount = Math.min(1, Math.max(0, o.bordersTotal - o.bordersOpen));
    const rows = base.map(b => {
      const entries = Math.round(1200 + seed(`ib:bx:${id}:${b.label}`) * 6400);
      return { ...b, entries, exits: Math.round(entries * (0.84 + seed(`ib:by:${id}:${b.label}`) * 0.12)), trend: Math.round((seed(`ib:bt:${id}:${b.label}`) - 0.25) * 110) / 10, closed: false };
    }).sort((a, b) => b.entries - a.entries);
    // The quietest land border is shown closed while the service reports borders closed.
    const quietLand = [...rows].reverse().find(r => r.kind === 'land');
    if (closedCount && quietLand && rows.filter(r => r.kind === 'land').length > 1) quietLand.closed = true;
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontier, id, o.bordersTotal - o.bordersOpen > 0]);
  const borders: [string, number, number, number][] = nationIso3()
    ? points.map(b => [b.label, b.closed ? 0 : b.entries, b.closed ? 0 : b.exits, b.trend])
    : [
      ['Northern Land Border', 6842, 6231, 8.2], ['Eastern Airport', 5421, 4932, 6.7],
      ['Coastal Seaport', 4218, 3856, 5.4], ['Western Land Border', 3105, 2789, 4.1],
      ['Southern Land Border', 2987, 2654, -1.2], ['Central Airport', 2278, 1855, 3.6],
    ];
  const label = (i: number, reference: string) => borders[i]?.[0] ?? reference;
  const shownBorders = border ? borders.filter(b => b[0] === border) : borders;
  const regionOfBorder = (l?: string) => points.find(b => b.label === l)?.region;
  const refusalsT: [string, string, string, string, string, string][] = [
    ['12:35', 'Ahmed Al Hassan', 'Syria', 'Invalid Documents', label(0, 'Northern Land Border'), 'J. Williams'],
    ['12:18', 'Li Wei', 'China', 'Purpose Not Clear', label(1, 'Eastern Airport'), 'M. Johnson'],
    ['11:57', 'Juan Carlos Silva', 'Brazil', 'Insufficient Funds', label(2, 'Coastal Seaport'), 'T. Brown'],
    ['11:42', 'Fatima Zahra', 'Morocco', 'Security Concern', label(3, 'Western Land Border'), 'A. Patel'],
    ['11:28', 'Sergey Ivanov', 'Russia', 'Visa Violation', label(4, 'Central Airport'), 'D. Kim'],
  ];
  const docTypes: [string, string, string][] = [
    ['Expired Document', '186', '+8'], ['Forged Document', '124', '+5'],
    ['Tampered Document', '78', '-2'], ['Invalid Visa', '48', '+3'],
  ];
  const nationalities: [string, number, number, number][] = [
    ['United States', 4521, 4102, 419], ['India', 3218, 2987, 231], ['China', 2845, 2654, 191],
    ['United Kingdom', 2145, 1987, 158], ['Germany', 1874, 1732, 142], ['Others', 10248, 8855, 1393],
  ];
  const watchAlerts: [string, number, string][] = [
    ['Identity Match', 64, '+2'], ['Travel History Match', 38, '+1'], ['Document Match', 16, '0'], ['Sanctions Match', 10, '0'],
  ];
  const feed: [string, string, string][] = [
    ['12:40', 'High footfall detected', label(0, 'Northern Land Border')],
    ['12:28', 'New visa rule applied', points.find(b => b.kind === 'air')?.label ?? 'Eastern Airport'],
    ['12:15', points.some(b => b.kind === 'sea') || !nationIso3() ? 'Seaport inspection completed' : 'Border post inspection completed', points.find(b => b.kind === 'sea')?.label ?? label(1, 'Coastal Seaport')],
    ['12:05', 'Watchlist hit review required', label(2, 'Central Airport')],
    ['11:52', 'Overstay alert · 3 new cases', ''],
    ['11:41', 'System sync completed', ''],
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0c1119,#11151f)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${VIOLET}`, color: VIOLET }} aria-hidden>⛬</span>
          <div>
            <div className="text-[17px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>Immigration &amp; Borders</div>
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: VIOLET }}>National Immigration and Border Management System</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> {nationTimeZoneLabel('GMT+1')}</span>
          <span className="flex items-center gap-1.5"><span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: RED }}>9</span></span><span className="uppercase tracking-[0.12em]">Alerts</span></span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: VIOLET, color: '#0e0a1a' }}>IB</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Director, Immigration &amp; Borders</span><span style={{ color: INK }}>National Immigration Service</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border md:grid-cols-3 xl:grid-cols-6"
        style={{ borderColor: LINE, background: LINE }}>
        {kpis.map(([l, v, s, c]) => (
          <div key={l} className="px-3 py-2.5 text-center" style={{ background: PANEL }}>
            <div className="text-[7.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUT }}>{l}</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums" style={{ color: c, fontFamily: SERIF }}>{v}</div>
            <div className="text-[7.5px]" style={{ color: s.startsWith('+') ? EMER : s.startsWith('-') ? AMBER : SOFT }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.6fr_1.1fr_1.1fr]">
        <Panel title="Border Crossings Overview" action={
          <select aria-label="Show one border point" value={border ?? ''} onChange={e => setBorder(e.currentTarget.value || undefined)}
            className="focus-ring max-w-[12rem] cursor-pointer rounded-[2px] border px-1 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]"
            style={{ borderColor: LINE, color: CYAN, background: PANEL }}>
            <option value="">All Borders</option>
            {borders.map(([b]) => <option key={b} value={b}>{b}</option>)}
          </select>
        }>
          <div className="min-h-[260px]"><BorderWorld seedKey={`ib:bw:${id}`} points={points} selected={regionOfBorder(border)}
            onSelect={r => setBorder(r ? points.find(b => b.region === r)?.label ?? undefined : undefined)} /></div>
        </Panel>
        <Panel title="Crossings by Border (Today)" action="View All">
          <div className="flex text-[7px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="flex-1">Border Point</span><span className="w-12 text-right">Entries</span><span className="w-12 text-right">Exits</span><span className="w-12 text-right">Trend</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {nationIso3() && !frontier ? <p className="text-[9px]" style={{ color: MUT }}>Finding the nation&rsquo;s borders on the map…</p> : null}
            {shownBorders.map(([b, en, ex, tr]) => (
              <div key={b} className="flex items-center text-[9px]">
                <button type="button" onClick={() => setBorder(border === b ? undefined : b)} title={`Show ${b} on the map`}
                  className="focus-ring min-w-0 flex-1 truncate text-start hover:underline" style={{ color: border === b ? CYAN : SOFT }}>{b}{points.find(p => p.label === b)?.closed ? ' · closed' : ''}</button>
                <span className="w-12 text-right font-mono" style={{ color: INK }}>{en.toLocaleString()}</span>
                <span className="w-12 text-right font-mono" style={{ color: SOFT }}>{ex.toLocaleString()}</span>
                <span className="w-12 text-right font-mono" style={{ color: tr >= 0 ? EMER : RED }}>{tr >= 0 ? '+' : ''}{tr}%</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Entry Purpose (Today)" action="View All">
          <Donut top={entries.toLocaleString()} sub="Total Entries" segs={[
            { label: 'Tourism', v: 43.6, n: '10,842', c: BLUE }, { label: 'Business', v: 26.2, n: '6,521', c: EMER },
            { label: 'Work', v: 17.0, n: '4,218', c: GOLD }, { label: 'Education', v: 8.6, n: '2,145', c: VIOLET },
            { label: 'Other', v: 4.6, n: '1,125', c: MUT },
          ]} />
        </Panel>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title="Visa & Permit Summary" action="View All">
          <Donut top="18,657" sub="Active" segs={[
            { label: 'Tourist Visa', v: 42.1, n: '7,842', c: BLUE }, { label: 'Work Permit', v: 28.1, n: '5,236', c: EMER },
            { label: 'Student Visa', v: 15.3, n: '2,845', c: GOLD }, { label: 'Business Visa', v: 10.2, n: '1,892', c: VIOLET },
            { label: 'Other Permits', v: 4.3, n: '842', c: MUT },
          ]} />
        </Panel>
        <Panel title="Overstay Cases" action="View Trend">
          <div className="mb-1 flex items-baseline gap-3">
            <div><div className="text-[7.5px] uppercase tracking-wider" style={{ color: MUT }}>Total Active</div><div className="font-mono text-[20px]" style={{ color: GOLD, fontFamily: SERIF }}>{overstay.toLocaleString()}</div></div>
            <span className="text-[10px]" style={{ color: EMER }}>-2.6% vs yesterday</span>
          </div>
          <Area pts={W('ov', 30, 90, 14).map(v => 100 - v)} color={EMER} h={120} />
          <div className="mt-1 flex justify-between text-[7px] font-mono" style={{ color: MUT }}><span>11 May</span><span>13 May</span><span>15 May</span><span>17 May</span></div>
        </Panel>
        <Panel title="Watchlist Alerts (Today)" action="View All">
          <div className="flex items-center gap-4">
            <Donut size={116} top="128" sub="Total Alerts" segs={[
              { label: 'High Risk', v: 40.6, n: '52', c: RED }, { label: 'Medium Risk', v: 40.6, n: '52', c: AMBER }, { label: 'Low Risk', v: 18.8, n: '24', c: GOLD },
            ]} />
          </div>
          <div className="mt-2 space-y-1.5 border-t pt-2" style={{ borderColor: LINE }}>
            {watchAlerts.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: RED }} aria-hidden>⚑</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-7 text-right font-mono tabular-nums" style={{ color: d === '0' ? MUT : EMER }}>{d}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.5fr_1fr_1.3fr]">
        <Panel title="Recent Refusals" action="View All">
          <div className="flex text-[7px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="w-9">Time</span><span className="flex-1">Name · Nationality</span><span className="w-28">Reason</span><span className="w-16 text-right">Officer</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {refusalsT.map(([tm, nm, nat, rs, , of]) => (
              <div key={nm} className="flex items-center text-[9px]">
                <span className="w-9 font-mono" style={{ color: SOFT }}>{tm}</span>
                <div className="min-w-0 flex-1"><span style={{ color: INK }}>{nm}</span> <span style={{ color: MUT }}>· {nat}</span></div>
                <span className="w-28 truncate" style={{ color: AMBER }}>{rs}</span>
                <span className="w-16 text-right font-mono text-[8px]" style={{ color: SOFT }}>{of}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Document Alerts (Today)" action="View All">
          <div className="space-y-2.5">
            {docTypes.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: AMBER }} aria-hidden>▤</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-7 text-right font-mono tabular-nums" style={{ color: d.startsWith('-') ? RED : EMER }}>{d}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1.5 text-[9px]" style={{ borderColor: LINE }}>
              <span style={{ color: MUT }}>Total Alerts</span><span className="font-mono" style={{ color: INK }}>{docAlerts} <span style={{ color: EMER }}>+5.3%</span></span>
            </div>
          </div>
        </Panel>
        <Panel title="Nationality Breakdown (Today)" action="View All">
          <div className="flex text-[7px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="flex-1">Nationality</span><span className="w-12 text-right">Entries</span><span className="w-12 text-right">Exits</span><span className="w-12 text-right">Net</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {nationalities.map(([n, en, ex, net]) => (
              <div key={n} className="flex items-center text-[9px]">
                <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{n}</span>
                <span className="w-12 text-right font-mono" style={{ color: INK }}>{en.toLocaleString()}</span>
                <span className="w-12 text-right font-mono" style={{ color: SOFT }}>{ex.toLocaleString()}</span>
                <span className="w-12 text-right font-mono" style={{ color: EMER }}>+{net.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Border feed ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[4px] border px-4 py-2.5" style={{ borderColor: LINE, background: PANEL }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: CYAN }}>Border Feed <span style={{ color: EMER }}>(Live)</span></span>
        {feed.map(([t, e, loc]) => (
          <span key={e} className="flex items-center gap-2 text-[9px]">
            <span className="font-mono" style={{ color: MUT }}>{t}</span>
            <span style={{ color: SOFT }}>{e}</span>
            {loc ? <span className="uppercase tracking-wider" style={{ color: MUT }}>{loc}</span> : null}
          </span>
        ))}
        <span className="ml-auto text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: CYAN }}>View All Updates →</span>
      </div>
    </div>
  );
}
