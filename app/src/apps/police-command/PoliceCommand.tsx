'use client';

// Police Operations — Law Enforcement Command System. Dense policing
// command surface modelled on the benchmark: operational-status KPI strip,
// live crime heatmap, top crime types, active incidents, patrol-unit
// status, response-time trend, arrests overview, police stations, vehicle
// fleet, public-safety index and community reports. Pure & deterministic.

import * as React from 'react';
import { policeOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';
import { nationTime, nationTimeZoneLabel } from '@/lib/nation/registry';
import { STATUS } from '@/lib/theme/tokens';
import { CommandMap, type CommandPalette } from './CommandMap';

const BG = '#04080f';
const PANEL = '#0a1018';
const PANEL2 = '#0e141d';
const LINE = 'rgba(95,168,255,0.16)';
const BLUE = '#5fa8ff';
const CYAN = '#4fb3d9';
const RED = '#e0685f';
const RED_BR = '#f4877c';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const EMER = '#3fae82';
const INK = '#d6dde6';
const SOFT = '#93a0ad';
const MUT = '#62707e';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';
const SEV_C: Record<string, string> = { CRITICAL: RED, HIGH: AMBER, MEDIUM: GOLD, LOW: EMER };

function Donut({ segs, top, sub, size = 110 }: {
  segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 9, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#161c26" strokeWidth="9" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="9"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.2} fontWeight="700" fill={BLUE} style={{ fontFamily: SERIF }}>{top}</text>
        <text x="50%" y="61%" textAnchor="middle" fontSize={size * 0.078} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-8 text-right font-mono tabular-nums" style={{ color: MUT }}>{Math.round((s.v / sum) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Gauge({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 52, circ = Math.PI * r;
  const stops = `${RED} 0%, ${AMBER} 35%, ${GOLD} 55%, ${EMER} 100%`;
  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="96" viewBox="0 0 160 96" aria-hidden>
        <defs><linearGradient id="psg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={RED} /><stop offset="0.4" stopColor={AMBER} /><stop offset="0.7" stopColor={GOLD} /><stop offset="1" stopColor={EMER} /></linearGradient></defs>
        <path d="M14 86 A66 66 0 0 1 146 86" fill="none" stroke="#161c26" strokeWidth="11" strokeLinecap="round" />
        <path d="M14 86 A66 66 0 0 1 146 86" fill="none" stroke="url(#psg)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * (Math.PI * 66)} ${Math.PI * 66}`} />
        <text x="80" y="74" textAnchor="middle" fontSize="26" fontWeight="700" fill={EMER} style={{ fontFamily: SERIF }}>{v.toFixed(1)}%</text>
        <text x="80" y="88" textAnchor="middle" fontSize="9" fill={MUT} className="uppercase" style={{ letterSpacing: '0.14em' }}>{label}</text>
      </svg>
    </div>
  );
}

function LineTrend({ pts, height = 130 }: { pts: number[]; height?: number }) {
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 100, 90 - ((p - mn) / sp) * 78] as [number, number]);
  const line = xy.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      {[18, 36, 54, 72].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#161c26" strokeWidth="0.4" />)}
      <polyline points={line} fill="none" stroke={BLUE} strokeWidth="1" vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${BLUE} 50%,transparent))` }} />
      {xy.filter((_, i) => i % 2 === 0).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" fill={BLUE} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}

// Live crime heatmap on the nation's real map: regions shaded by crime
// pressure from the operations model, glowing where it is high, police
// stations (sample until the force registers its stations in the national
// facility register) and patrol units by region, with callouts on the most
// pressed regions. Zoom, whole nation, full screen and layers work.
const PALETTE: CommandPalette = { critical: RED, high: AMBER, medium: GOLD, low: EMER, monitor: CYAN, accent: BLUE, line: LINE, panel: PANEL, ink: INK, soft: SOFT, muted: MUT };
const levelOf = (load: number) => (load >= 70 ? 'HIGH' : load >= 45 ? 'MEDIUM' : 'LOW');
const crimeColour = (load: number) => (load >= 70 ? RED : load >= 45 ? AMBER : EMER);

function CrimeHeatmap({ seedKey, regional, patrols, stations, selected, onSelect }: {
  seedKey: string;
  regional: { region: string; load: number }[];
  patrols: { id: string; region: string; status: string }[];
  stations: string[];
  selected?: string;
  onSelect: (r: string | undefined) => void;
}) {
  const ranked = [...regional].sort((a, b) => b.load - a.load);
  const top = ranked.slice(0, 3);
  return (
    <CommandMap title="Crime pressure by region" height={290} palette={PALETTE}
      values={regional.map(r => ({ key: r.region, value: r.load }))} kind="sample"
      source="Police operations model by region (sample) until the force connects its incident system" valueLabel="Crime pressure" unit="index"
      categories={['police']}
      samples={stations.map(r => ({ region: r, label: `Police station · ${r}`, tone: 'ok' as const, glyph: '⛨', category: 'police', layer: 'stations' }))}
      samplesSource="police stations by region"
      flows={patrols.filter(p => p.status === 'responding').map(p => ({ from: 'capital', to: p.region, label: `${p.id} responding · ${p.region}`, tone: 'alert' as const, weight: 2, layer: 'patrols' }))}
      hotspots={top.map(r => ({ region: r.region, intensity: r.load, label: r.region }))}
      callouts={top.map(r => ({ region: r.region, line1: r.region, line2: `${r.load} · ${levelOf(r.load)} CRIME`, colour: crimeColour(r.load) }))}
      layers={[{ id: 'crime', label: 'Crime level by region' }, { id: 'stations', label: 'Police stations', sample: true }, { id: 'patrols', label: 'Patrol units', sample: true }]}
      legend={[
        // Only what is drawn: the crime levels present, patrol units, responding routes when a unit responds.
        ...([['High crime', RED, 'HIGH'], ['Medium', AMBER, 'MEDIUM'], ['Low', EMER, 'LOW']] as const)
          .filter(([, , w]) => regional.some(r => levelOf(r.load) === w)).map(([label, colour]) => ({ label, colour, shape: 'glow' as const, layer: 'crime' })),
        ...(patrols.length ? [{ label: 'Patrol units', colour: CYAN, shape: 'tile' as const, layer: 'patrols', sample: true }] : []),
        ...(patrols.some(p => p.status === 'responding') ? [{ label: 'Responding', colour: STATUS.alert, shape: 'dash' as const, layer: 'patrols', sample: true }] : []),
        { label: 'Stations', colour: STATUS.ok, shape: 'glyph', glyph: '⛨', layer: 'stations', sample: true },
      ]}
      selected={selected} onSelect={onSelect} fullMapHref="/gov/situation-room"
      extra={(ctx, on) => {
        const at = new Map(ctx.units.map(u => [u.name, u] as const));
        const spread = Math.max(6, Math.min(26, Math.sqrt((ctx.width * ctx.height) / Math.max(1, ctx.units.length)) * 0.36));
        return (
          <g aria-hidden pointerEvents="none">
            {on('crime') ? regional.map(r => {
              const u = at.get(r.region); if (!u) return null;
              const c = crimeColour(r.load);
              return (
                <g key={`c${r.region}`}>
                  <circle cx={u.x} cy={u.y} r={spread * (0.45 + r.load / 160)} fill={c} opacity={0.14} />
                  <circle cx={u.x} cy={u.y} r={Math.max(1.6, spread * 0.16)} fill={c} style={{ filter: `drop-shadow(0 0 3px ${c})` }} />
                </g>
              );
            }) : null}
            {on('patrols') ? patrols.flatMap((p, i) => {
              const u = at.get(p.region); if (!u) return [];
              return [0, 1, 2].map(k => {
                const a = (seed(`${seedKey}:pa:${i}:${k}`) * Math.PI * 2), d = spread * (0.5 + seed(`${seedKey}:pd:${i}:${k}`) * 0.6);
                const x = u.x + Math.cos(a) * d, y = u.y + Math.sin(a) * d;
                return (
                  <g key={`p${i}-${k}`}>
                    {p.status === 'responding' && k === 0 ? <circle cx={x} cy={y} r={6} fill="none" stroke={CYAN} strokeWidth={0.8} className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} /> : null}
                    <rect x={x - 2.2} y={y - 2.2} width={4.4} height={4.4} rx={0.8} fill={p.status === 'responding' ? CYAN : BLUE} style={{ filter: `drop-shadow(0 0 2px ${CYAN})` }}>
                      <title>{`${p.id} · ${p.status} · ${p.region} (sample)`}</title>
                    </rect>
                  </g>
                );
              });
            }) : null}
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
        {typeof action === 'string' ? <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: BLUE }}>{action}</span> : action ?? null}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

export function PoliceCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = policeOps(id, ts);
  const clock = new Date(now);
  const hh = nationTime(clock);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`pl:${k}:${id}`, ts, n, lo, hi);

  const patrols = o.unitsDeployed;
  const arrests = Math.round(wave(`pl:ar:${id}`, ts, 320, 540));
  const respMin = o.meanResponseMin;
  const respStr = `${String(Math.floor(respMin)).padStart(2, '0')}:${String(Math.round((respMin % 1) * 60)).padStart(2, '0')}`;
  const safety = Math.round((o.clearanceRatePct + 24) * 10) / 10;

  const kpis: [string, string, string, string][] = [
    ['Active Patrols', patrols.toLocaleString(), '+8%', INK],
    ['Crime Incidents (24H)', o.activeIncidents.toLocaleString(), '-5%', AMBER],
    ['Arrests (24H)', `${arrests}`, '+12%', EMER],
    ['Response Time (avg)', respStr, '-8%', INK],
    ['Case Clearance Rate', `${o.clearanceRatePct}%`, '+5%', EMER],
    ['Public Safety Score', `${safety}%`, 'Good', safety >= 75 ? EMER : AMBER],
  ];

  const crimeTypes: [string, number, number][] = [
    ['Theft', 342, -6], ['Assault', 231, 8], ['Burglary', 184, -3], ['Robbery', 126, 12],
    ['Vehicle Theft', 98, -9], ['Vandalism', 67, -2], ['Drug Offenses', 45, 5], ['Other Offenses', 73, -4],
  ];
  // Places are the nation's own regions: incidents where crime pressure is highest, stations by region.
  const ranked = [...o.regional].sort((a, b) => b.load - a.load);
  const at = (i: number) => ranked.length ? ranked[i % ranked.length]!.region : '—';
  const incidents: [string, string, string, string][] = [
    ['Armed Robbery in Progress', at(0), '12:35', 'CRITICAL'],
    ['Shots Fired Reported', at(1), '12:18', 'HIGH'],
    ['Domestic Violence', at(2), '11:57', 'HIGH'],
    ['Vehicle Pursuit', at(3), '11:42', 'MEDIUM'],
    ['Suspicious Package', at(4), '11:28', 'MEDIUM'],
    ['Traffic Accident', at(5), '10:47', 'LOW'],
  ];
  const stationRegions = o.regional.slice(0, 6).map(r => r.region);
  const stations: [string, number, number, number][] = ([
    [128, 56, 24], [112, 48, 18], [98, 42, 22], [105, 45, 16], [97, 40, 14], [85, 38, 12],
  ] as const).slice(0, stationRegions.length).map(([of, un, inc], i) => [`${stationRegions[i]} Station`, of, un, inc]);
  const stationRegion = new Map(stations.map(([st], i) => [st, stationRegions[i]!] as const));
  const [district, setDistrict] = React.useState<string | undefined>(undefined);
  const inDistrict = (region: string) => !district || region === district;
  const community: [string, number, number][] = [
    ['Noise Complaint', 128, -5], ['Suspicious Activity', 95, 11], ['Traffic Violation', 86, -3],
    ['Abandoned Vehicle', 64, 6], ['Other Reports', 42, -2],
  ];
  const feed: [string, string, string][] = [
    ['12:40', 'SWAT team deployed to hostage situation', at(0)],
    ['12:28', 'Multiple units respond to shots-fired call', at(1)],
    ['12:15', 'Traffic checkpoint completed', at(3)],
    ['12:05', 'Missing person located and reunited', at(2)],
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0a1018,#0e1620)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${BLUE}`, color: BLUE }} aria-hidden>★</span>
          <div>
            <div className="text-[17px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>Police Operations</div>
            <div className="text-[8px] uppercase tracking-[0.22em]" style={{ color: BLUE }}>Law Enforcement Command System</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> {nationTimeZoneLabel('GMT+1')}</span>
          <span className="flex items-center gap-1.5"><span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: RED }}>9</span></span><span className="uppercase tracking-[0.12em]">Alerts</span></span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: BLUE, color: '#06121f' }}>PO</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Director of Police Ops</span><span style={{ color: INK }}>National Police Service</span></span>
          </span>
        </div>
      </div>

      {/* ── Operational status KPI strip ───────────────────────── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border md:grid-cols-3 xl:grid-cols-6"
        style={{ borderColor: LINE, background: LINE }}>
        {kpis.map(([l, v, s, c]) => (
          <div key={l} className="px-3 py-2.5 text-center" style={{ background: PANEL }}>
            <div className="text-[7.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUT }}>{l}</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums" style={{ color: c, fontFamily: SERIF }}>{v}</div>
            <div className="text-[8px]" style={{ color: s.startsWith('+') ? EMER : s.startsWith('-') ? AMBER : SOFT }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.7fr_1fr_1fr]">
        <Panel title="Live Crime Heatmap" action={
          <select aria-label="Show one district" value={district ?? ''} onChange={e => setDistrict(e.currentTarget.value || undefined)}
            className="focus-ring max-w-[11rem] cursor-pointer rounded-[2px] border bg-transparent px-1 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]"
            style={{ borderColor: LINE, color: BLUE, background: PANEL }}>
            <option value="">All Districts</option>
            {o.regional.map(r => <option key={r.region} value={r.region}>{r.region}</option>)}
          </select>
        }>
          <div className="min-h-[290px]"><CrimeHeatmap seedKey={`pl:hm:${id}`} regional={o.regional} patrols={o.patrols} stations={stationRegions}
            selected={district} onSelect={setDistrict} /></div>
        </Panel>
        <Panel title="Top Crime Types (24H)" action="View All">
          <div className="space-y-2">
            {crimeTypes.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: AMBER }} aria-hidden>⚖</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-9 text-right font-mono tabular-nums" style={{ color: d >= 0 ? RED : EMER }}>{d >= 0 ? '+' : ''}{d}%</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Active Incidents" action="View All">
          <div className="space-y-1.5">
            {district && !incidents.some(([, rg]) => rg === district) ? <p className="text-[9px]" style={{ color: MUT }}>No active incidents listed in {district}.</p> : null}
            {incidents.filter(([, rg]) => inDistrict(rg)).map(([t, rg, tm, sv]) => (
              <div key={t} className="flex items-center gap-2 text-[9px]">
                <span className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider"
                  style={{ color: SEV_C[sv], background: `color-mix(in srgb,${SEV_C[sv]} 16%,transparent)` }}>{sv}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ color: INK }}>{t}</div>
                  <div className="text-[8px]" style={{ color: MUT }}>{rg}</div>
                </div>
                <span className="font-mono text-[8px]" style={{ color: SOFT }}>{tm}</span>
                <button type="button" onClick={() => setDistrict(rg)} title={`Show ${rg} on the map`} aria-label={`Show ${rg} on the map`} className="focus-ring hover:brightness-150" style={{ color: district === rg ? BLUE : MUT }}>⌖</button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-3">
        <Panel title="Patrol Units Status" action="View All">
          <Donut top="78%" sub="On Duty" segs={[
            { label: 'On Patrol', v: 78, n: '5,082', c: BLUE }, { label: 'At Station', v: 17, n: '1,102', c: CYAN },
            { label: 'In Transit', v: 5, n: '337', c: GOLD }, { label: 'Unavailable', v: 2, n: '156', c: RED },
          ]} />
          <div className="mt-2 flex justify-between border-t pt-2 text-[9px]" style={{ borderColor: LINE }}>
            <span style={{ color: MUT }}>Total Units</span><span className="font-mono" style={{ color: INK }}>6,677</span>
          </div>
        </Panel>
        <Panel title="Response Time Trend (avg)" action="View Trend">
          <div className="mb-1 text-[8px] uppercase tracking-[0.14em]" style={{ color: MUT }}>Minutes · 00:00 → 24:00</div>
          <LineTrend pts={W('rt', 4, 12, 16)} />
          <div className="mt-1 text-center text-[9px]"><span className="font-mono text-[13px]" style={{ color: BLUE }}>{respStr}</span> <span style={{ color: MUT }}>Average</span></div>
        </Panel>
        <Panel title="Arrests Overview (24H)" action="View All">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="font-mono text-[22px]" style={{ color: BLUE, fontFamily: SERIF }}>{arrests}</span>
            <span className="text-[9px]" style={{ color: EMER }}>+12% vs yesterday</span>
          </div>
          <Donut size={96} top={`${arrests}`} sub="arrests" segs={[
            { label: 'Felony Arrests', v: 43, n: '182', c: RED }, { label: 'Misdemeanor', v: 37, n: '156', c: AMBER },
            { label: 'Violations', v: 15, n: '65', c: GOLD }, { label: 'Warrants', v: 5, n: '20', c: EMER },
          ]} />
        </Panel>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Police Stations" action="View All">
          <div className="space-y-1">
            <div className="flex text-[7.5px] uppercase tracking-wider" style={{ color: MUT }}>
              <span className="flex-1">Station</span><span className="w-12 text-right">Officers</span><span className="w-10 text-right">Units</span><span className="w-9 text-right">Inc.</span>
            </div>
            {district && !stations.some(([st]) => stationRegion.get(st) === district) ? <p className="text-[9px]" style={{ color: MUT }}>No station listed in {district}.</p> : null}
            {stations.filter(([st]) => inDistrict(stationRegion.get(st) ?? '')).map(([st, of, un, inc]) => (
              <div key={st} className="flex items-center text-[9px]">
                <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}><span className="mr-1" style={{ color: EMER }}>●</span>{st}</span>
                <span className="w-12 text-right font-mono" style={{ color: INK }}>{of}</span>
                <span className="w-10 text-right font-mono" style={{ color: INK }}>{un}</span>
                <span className="w-9 text-right font-mono" style={{ color: AMBER }}>{inc}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Vehicle Fleet Status" action="View All">
          <Donut size={104} top="72%" sub="Operational" segs={[
            { label: 'Operational', v: 72, n: '1,248', c: BLUE }, { label: 'Maintenance', v: 18, n: '312', c: CYAN },
            { label: 'Out of Service', v: 8, n: '136', c: AMBER }, { label: 'Unknown', v: 2, n: '41', c: RED },
          ]} />
          <div className="mt-2 flex justify-between border-t pt-2 text-[9px]" style={{ borderColor: LINE }}>
            <span style={{ color: MUT }}>Total Vehicles</span><span className="font-mono" style={{ color: INK }}>1,737</span>
          </div>
        </Panel>
        <Panel title="Public Safety Index" action="View Trend">
          <Gauge value={safety} label="Good" />
          <div className="mt-1 flex justify-around border-t pt-2 text-[9px]" style={{ borderColor: LINE }}>
            <span style={{ color: MUT }}>vs yesterday <span style={{ color: EMER }}>+5.2%</span></span>
            <span style={{ color: MUT }}>vs last week <span style={{ color: EMER }}>+8.1%</span></span>
          </div>
        </Panel>
        <Panel title="Community Reports (24H)" action="View All">
          <div className="space-y-2">
            {community.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: CYAN }} aria-hidden>✎</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-9 text-right font-mono tabular-nums" style={{ color: d >= 0 ? AMBER : EMER }}>{d >= 0 ? '+' : ''}{d}%</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1.5 text-[9px]" style={{ borderColor: LINE }}>
              <span style={{ color: MUT }}>Total Reports</span><span className="font-mono" style={{ color: INK }}>415 <span style={{ color: EMER }}>+2%</span></span>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Command feed ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[4px] border px-4 py-2.5" style={{ borderColor: LINE, background: PANEL }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: BLUE }}>Command Feed</span>
        {feed.map(([t, e, rg]) => (
          <span key={e} className="flex items-center gap-2 text-[9px]">
            <span className="font-mono" style={{ color: MUT }}>{t}</span>
            <span style={{ color: SOFT }}>{e}</span>
            <span className="uppercase tracking-wider" style={{ color: MUT }}>{rg}</span>
          </span>
        ))}
        <span className="ml-auto text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: BLUE }}>View All Updates →</span>
      </div>
    </div>
  );
}
