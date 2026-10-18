'use client';

// Emergency Operations — National Emergency Response System. Dense crisis
// command surface modelled on the benchmark: readiness KPI strip, national
// incident map, active incidents, response resources & shelters, weather &
// hazard forecast, incident-response status, resource allocation, response
// timeline, communications status and public alerts. Pure & deterministic
// — engine + telemetry only.

import * as React from 'react';
import { emergencyOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries } from '@/lib/telemetry';
import { nationCapital, nationTime, nationTimeZoneLabel, regionName } from '@/lib/nation/registry';
import { STATUS } from '@/lib/theme/tokens';
import { CommandMap, useFrontier, type CommandPalette } from '@/apps/police-command/CommandMap';
import { regionAt } from '@/apps/police-command/frontier';

const BG = '#0a0608';
const PANEL = '#140d10';
const PANEL2 = '#1a1115';
const LINE = 'rgba(224,104,95,0.16)';
const RED = '#e0685f';
const RED_BR = '#f4877c';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const CYAN = '#4fb3d9';
const EMER = '#3fae82';
const INK = '#e3dad6';
const SOFT = '#a99a96';
const MUT = '#7a6c68';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';
const SEV_C: Record<string, string> = { CRITICAL: RED, HIGH: AMBER, MEDIUM: GOLD, LOW: EMER };

function Ring({ value, top, sub, color }: { value: number; top: string; sub: string; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 40, circ = 2 * Math.PI * r;
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden>
      <circle cx="52" cy="52" r={r} fill="none" stroke="#241a1d" strokeWidth="9" />
      <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)} transform="rotate(-90 52 52)"
        style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb,${color} 60%,transparent))` }} />
      <text x="52" y="50" textAnchor="middle" fontSize="21" fontWeight="700" fill={color} style={{ fontFamily: SERIF }}>{top}</text>
      <text x="52" y="66" textAnchor="middle" fontSize="7.5" fill={MUT} className="uppercase" style={{ letterSpacing: '0.12em' }}>{sub}</text>
    </svg>
  );
}

function Donut({ segs, top, sub, size = 104 }: {
  segs: { label: string; v: number; c: string }[]; top: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 9, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#241a1d" strokeWidth="9" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="9"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.19} fontWeight="700" fill={EMER} style={{ fontFamily: SERIF }}>{top}</text>
        <text x="50%" y="61%" textAnchor="middle" fontSize={size * 0.078} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{s.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiLine({ series, height = 130 }: { series: { name: string; c: string; pts: number[] }[]; height?: number }) {
  const all = series.flatMap(s => s.pts);
  const mn = Math.min(...all), sp = Math.max(...all) - mn || 1;
  const line = (pts: number[]) => pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${94 - ((p - mn) / sp) * 84}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      {[20, 40, 60, 80].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#241a1d" strokeWidth="0.4" />)}
      {series.map(s => (
        <polyline key={s.name} points={line(s.pts)} fill="none" stroke={s.c} strokeWidth="1" vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${s.c} 45%,transparent))` }} />
      ))}
    </svg>
  );
}

// National incident map on the nation's real regions: emergency pressure
// by region (sample until the national emergency system is connected),
// glowing incident clusters where it is highest, the weather system (sample)
// over the coast, fire and rescue stations and shelters (sample until they
// are registered in the national facility register), evacuation routes to
// the capital. Zoom, whole nation, full screen (also "View Full Map") and
// layers work.
const PALETTE: CommandPalette = { critical: RED, high: AMBER, medium: GOLD, low: EMER, monitor: CYAN, accent: RED, line: LINE, panel: PANEL, ink: INK, soft: SOFT, muted: MUT };
export interface RegionPressure { region: string; p: number; status: string }
const sevOf = (p: number) => (p > 78 ? 'CRITICAL' : p > 60 ? 'HIGH' : p > 45 ? 'MEDIUM' : 'LOW');
const sevColour = (p: number) => SEV_C[sevOf(p)]!;

function IncidentMap({ seedKey, pressure, storm, fullRef }: {
  seedKey: string;
  pressure: RegionPressure[];
  /** Where the weather system is (a coastal region, else the most pressed), with its name. */
  storm: { region: string; name: string; sea?: [number, number] } | null;
  fullRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const ranked = [...pressure].sort((a, b) => b.p - a.p);
  const clusters = ranked.slice(0, 9);
  const crisis = ranked.filter(r => r.status !== 'nominal');
  return (
    <CommandMap title="Emergency pressure by region" height={300} palette={PALETTE} fullRef={fullRef}
      values={pressure.map(r => ({ key: r.region, value: r.p }))} kind="sample"
      source="Emergency operations model by region (sample) until the national emergency system is connected" valueLabel="Emergency pressure" unit="index"
      categories={['fire-rescue', 'shelter']}
      samples={[
        ...ranked.slice(0, 3).map(r => ({ region: r.region, label: `Fire and rescue station · ${r.region}`, tone: 'warn' as const, glyph: '✹', category: 'fire-rescue', layer: 'resources' })),
        ...(crisis.length ? crisis : ranked.slice(0, 2)).slice(0, 4).map(r => ({ region: r.region, label: `Emergency shelter · ${r.region}`, tone: 'ok' as const, glyph: '⌂', category: 'shelter', layer: 'resources' })),
      ]}
      samplesSource="fire and rescue stations and shelters by region"
      flows={ranked.slice(0, 2).map(r => ({ from: r.region, to: 'capital', label: `Evacuation route · ${r.region} to the capital`, tone: 'warn' as const, weight: 2, layer: 'evac' }))}
      hotspots={ranked.slice(0, 3).map(r => ({ region: r.region, intensity: r.p }))}
      callouts={ranked.slice(0, 3).map(r => ({ region: r.region, line1: r.region, line2: `${r.p} · ${sevOf(r.p)} · ${r.status.toUpperCase()}`, colour: sevColour(r.p) }))}
      layers={[{ id: 'incidents', label: 'Incident clusters', sample: true }, { id: 'weather', label: 'Weather system', sample: true }, { id: 'resources', label: 'Stations and shelters', sample: true }, { id: 'evac', label: 'Evacuation routes', sample: true }]}
      legend={[
        // Only the levels a cluster is drawn at.
        ...(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).filter(l => clusters.some(c => sevOf(c.p) === l))
          .map(l => ({ label: l[0] + l.slice(1).toLowerCase(), colour: SEV_C[l]!, shape: 'glow' as const, layer: 'incidents' })),
        ...(storm ? [{ label: 'Monitoring', colour: CYAN, shape: 'ring' as const, layer: 'weather', sample: true }] : []),
        { label: 'Evacuation', colour: STATUS.warn, shape: 'dash', layer: 'evac', sample: true },
        { label: 'Fire & rescue', colour: STATUS.warn, shape: 'glyph', glyph: '✹', layer: 'resources', sample: true },
        { label: 'Shelters', colour: STATUS.ok, shape: 'glyph', glyph: '⌂', layer: 'resources', sample: true },
      ]}
      fullMapHref="/gov/situation-room"
      extra={(ctx, on) => {
        const at = new Map(ctx.units.map(u => [u.name, u] as const));
        const placed = clusters.flatMap(c => { const u = at.get(c.region); return u ? [{ ...c, x: u.x, y: u.y }] : []; });
        const spread = Math.max(7, Math.min(28, Math.sqrt((ctx.width * ctx.height) / Math.max(1, ctx.units.length)) * 0.42));
        const home = storm ? at.get(storm.region) : undefined;
        // The weather system sits off the coast (beyond the coastline from the region's centre), else over the region.
        const sea = storm?.sea ? ctx.project(storm.sea[0], storm.sea[1]) : null;
        const sw = home ? (sea ? { x: Math.max(20, Math.min(ctx.width - 20, sea[0] + (sea[0] - home.x) * 0.6)), y: Math.max(40, Math.min(ctx.height - 20, sea[1] + (sea[1] - home.y) * 0.6)) } : { x: home.x, y: home.y }) : null;
        const R = Math.max(10, spread * 0.9);
        return (
          <g aria-hidden pointerEvents="none">
            {on('weather') && sw ? (
              <g>
                <title>{`${storm!.name} near ${storm!.region} (sample)`}</title>
                <g>
                  {[0, 1, 2, 3].map(k => (
                    <circle key={k} cx={sw.x} cy={sw.y} r={R * (0.5 + k * 0.55)} fill="none" stroke={CYAN} strokeWidth={0.9} opacity={0.5 - k * 0.1} strokeDasharray="7 5" />
                  ))}
                  <path d={`M${sw.x},${sw.y} q${R},${-R * 0.4} ${R * 1.6},${R * 0.5} M${sw.x},${sw.y} q${-R},${R * 0.4} ${-R * 1.6},${-R * 0.5}`} fill="none" stroke={CYAN} strokeWidth={1.1} opacity={0.6} />
                  <animateTransform attributeName="transform" type="rotate" from={`360 ${sw.x} ${sw.y}`} to={`0 ${sw.x} ${sw.y}`} dur="9s" repeatCount="indefinite" />
                </g>
                <circle cx={sw.x} cy={sw.y} r={3.2} fill={CYAN} style={{ filter: `drop-shadow(0 0 4px ${CYAN})` }} />
                <text x={sw.x + 150 < ctx.width ? sw.x + 10 : sw.x - 10} y={sw.y - 8} textAnchor={sw.x + 150 < ctx.width ? 'start' : 'end'} fontSize="8" fontWeight="700" letterSpacing="1" fill={CYAN} stroke={PANEL} strokeWidth={2.4} paintOrder="stroke">{storm!.name.toUpperCase()}</text>
              </g>
            ) : null}
            {on('incidents') ? placed.map((c, i) => i < placed.length - 1 ? (
              <line key={`k${i}`} x1={c.x} y1={c.y} x2={placed[i + 1]!.x} y2={placed[i + 1]!.y} stroke={RED} strokeWidth={0.6} opacity={0.3} />
            ) : null) : null}
            {on('incidents') ? placed.map((c, i) => {
              const col = sevColour(c.p), r = spread * (0.45 + c.p / 140);
              return (
                <g key={`g${i}`}>
                  <circle cx={c.x} cy={c.y} r={r} fill={col} opacity={0.18} />
                  <circle cx={c.x} cy={c.y} r={Math.max(2.4, r * 0.36)} fill={c.p > 60 ? RED_BR : col} style={{ filter: `drop-shadow(0 0 4px ${col})` }}>
                    <title>{`${c.region}: ${sevOf(c.p).toLowerCase()} · pressure ${c.p} (sample)`}</title>
                  </circle>
                </g>
              );
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
        {typeof action === 'string' ? <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>{action}</span> : action ?? null}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

export function EmergencyCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = emergencyOps(id, ts);
  const clock = new Date(now);
  const hh = nationTime(clock);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`em:${k}:${id}`, ts, n, lo, hi);

  const affected = (o.populationAssisted / 1e6 + 0.4);
  const resDeployed = Math.round(wave(`em:rd:${id}`, ts, 140, 220));
  const readiness = o.resourceCoverPct;

  const kpis: [string, string, string, string][] = [
    ['Active Incidents', `${o.activeCrises}`, '+2 new', RED],
    ['Affected People', `${affected.toFixed(1)}M`, '+86K', AMBER],
    ['Response Units', `${o.responders}`, 'Deployed', INK],
    ['Resources Deployed', `${resDeployed}K`, '84%', INK],
    ['System Readiness', `${readiness}%`, 'Operational', readiness >= 60 ? EMER : AMBER],
  ];

  // Places are the nation's own regions: pressure by region (the engine's regional reading, as a figure),
  // the weather system on the coast (else the most pressed region), the outage in the capital's region.
  const pressure: RegionPressure[] = o.regional.map((r, i) => ({ region: r.region, p: Math.round(wave(`emg:rs:${id}:${i}`, ts, 0, 1) * 100), status: r.status }));
  const ranked = [...pressure].sort((a, b) => b.p - a.p);
  const frontier = useFrontier();
  const coast = frontier?.coastal.find(c => pressure.some(r => r.region === c.region));
  const top = (i: number, reference: string) => ranked[i]?.region ?? regionName(i, reference);
  const stormRegion = coast?.region ?? top(0, 'Western Coast Region');
  const others = ranked.map(r => r.region).filter(r => r !== stormRegion);
  const capitalRegion = regionAt(frontier, nationCapital()) ?? others[3] ?? regionName(0, 'Metro City Region');
  const storm = pressure.length ? { region: stormRegion, name: 'Tropical Cyclone Aurora', sea: coast?.at } : null;
  const fullMap = React.useRef<(() => void) | null>(null);
  const incidents: [string, string, string, string, string][] = [
    ['Tropical Cyclone Aurora', stormRegion, '12:35', 'CRITICAL', '320K'],
    ['Severe Flooding', others[0] ?? regionName(1, 'Central River Basin'), '11:58', 'HIGH', '18K'],
    ['Wildfire Outbreak', others[1] ?? regionName(2, 'Northern Highlands'), '11:42', 'HIGH', '42K'],
    ['Landslide Threat', others[2] ?? regionName(3, 'Eastern Mountain Zone'), '10:47', 'MEDIUM', '18K'],
    ['Urban Power Outage', capitalRegion, '09:32', 'MEDIUM', '210K'],
  ];
  const [, flood, fire, slide, outage] = incidents.map(x => x[1]);
  const resources: [string, number, number][] = [
    ['Personnel', 85642, 85], ['Vehicles', 24187, 72], ['Boats', 1248, 68], ['Helicopters', 324, 76],
    ['Drones', 872, 61], ['Medical Teams', 1245, 89], ['Shelters', o.sheltersOpen, 83],
  ];
  const shelters: [string, string, string][] = [
    ['Active Shelters', `${o.sheltersOpen}`, '+18'], ['Shelter Capacity', '186K', '74%'],
    ['Evacuated People', Math.round(o.populationAssisted / 9).toLocaleString(), '+12K'], ['Transport Deployed', '1,247', '+56'],
  ];
  const forecast: [string, string, string][] = [
    ['Today', 'Heavy Rain', 'High Wind'], ['Tomorrow', 'Heavy Rain', 'Flood Risk'],
    ['19 May', 'Strong Wind', 'Moderate'], ['20 May', 'Partly Cloudy', 'Low Risk'], ['21 May', 'Scattered Rain', 'Low Risk'],
  ];
  const irs: [string, number, string][] = [
    ['Assessment', 92, EMER], ['Mobilization', 85, EMER], ['Deployment', 78, GOLD], ['Operations', 72, GOLD], ['Recovery', 45, RED],
  ];
  const timeline: [string, string, boolean][] = [
    ['Incident Detected', '09:15', true], ['Alert Issued', '09:18', true], ['Response Activated', '09:22', true],
    ['Teams Deployed', '09:45', true], ['Operation Ongoing', 'In Progress', false], ['Situation Stable', '—', false],
  ];
  const comms = ['Emergency Network', 'Satellite Link', 'Radio Network', 'Public Alert System', 'Social Media Monitoring'];
  const publicAlerts: [string, string][] = [
    [`Heavy rain and strong winds expected in ${stormRegion}`, '12:35'],
    [`Evacuation advised for low-lying areas in ${flood}`, '11:58'],
    [`Wildfire nearby. Avoid ${fire} trails`, '11:42'],
    [`Road closures in ${slide} due to landslide risk`, '10:47'],
    [`Power outage in ${outage}. Use caution`, '09:32'],
  ];
  const feed: [string, string][] = [
    ['12:40', `Rescue team deployed to ${stormRegion}`],
    ['12:28', `Additional shelters opened in ${outage}`],
    ['12:15', `Flood barriers activated in ${flood}`],
    ['12:05', `Air support requested for ${fire}`],
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#140d10,#1c1216)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${RED}`, color: RED }} aria-hidden>◬</span>
          <div>
            <div className="text-[17px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>Emergency Operations</div>
            <div className="text-[8px] uppercase tracking-[0.22em]" style={{ color: RED }}>National Emergency Response System</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> {nationTimeZoneLabel('GMT+1')}</span>
          <span className="flex items-center gap-1.5"><span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: RED }}>9</span></span><span className="uppercase tracking-[0.12em]">Alerts</span></span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: RED, color: '#160a09' }}>EO</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Head of Emergency Ops</span><span style={{ color: INK }}>National Executive</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border md:grid-cols-3 xl:grid-cols-5"
        style={{ borderColor: LINE, background: LINE }}>
        {kpis.map(([l, v, s, c]) => (
          <div key={l} className="px-3 py-2.5 text-center" style={{ background: PANEL }}>
            <div className="text-[7.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUT }}>{l}</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums" style={{ color: c, fontFamily: SERIF }}>{v}</div>
            <div className="text-[8px]" style={{ color: s.startsWith('+') ? EMER : SOFT }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.7fr_1fr_1fr]">
        <Panel title="National Incident Map" action={
          <button type="button" onClick={() => fullMap.current?.()} className="focus-ring text-[8px] font-semibold uppercase tracking-[0.12em] hover:underline" style={{ color: RED }}>View Full Map</button>
        }>
          <div className="min-h-[300px]"><IncidentMap seedKey={`em:im:${id}`} pressure={pressure} storm={storm} fullRef={fullMap} /></div>
        </Panel>
        <Panel title="Active Incidents" action="View All">
          <div className="space-y-1.5">
            {incidents.map(([t, rg, tm, sv, ppl]) => (
              <div key={t} className="flex items-center gap-2 rounded-[3px] border px-2.5 py-2" style={{ borderColor: LINE, background: PANEL2 }}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px]" style={{ background: `color-mix(in srgb,${SEV_C[sv]} 16%,transparent)`, color: SEV_C[sv] }} aria-hidden>⚠</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10.5px] font-semibold" style={{ color: INK }}>{t}</div>
                  <div className="text-[8.5px]" style={{ color: MUT }}>{rg}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[8.5px]" style={{ color: SOFT }}>{tm}</div>
                  <div className="text-[7.5px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</div>
                  <div className="text-[7.5px]" style={{ color: MUT }}>{ppl} ppl</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="flex flex-col gap-2">
          <Panel title="Response Resources" action="View All">
            <div className="space-y-1.5">
              {resources.map(([l, n, p]) => (
                <div key={l} className="text-[9px]">
                  <div className="flex items-center justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{n.toLocaleString()} <span style={{ color: MUT }}>{p}%</span></span></div>
                  <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ background: '#241a1d' }}><span className="block h-full rounded-full" style={{ width: `${p}%`, background: p >= 80 ? EMER : p >= 65 ? GOLD : RED }} /></div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Shelters & Evacuations" action="View All">
            <div className="space-y-1.5">
              {shelters.map(([l, v, d]) => (
                <div key={l} className="flex items-center justify-between text-[9px]"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v} <span style={{ color: EMER }}>{d}</span></span></div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Panel title="Weather & Hazard Forecast" action="View Full Forecast">
          <div className="grid grid-cols-5 gap-1.5">
            {forecast.map(([d, w, r]) => (
              <div key={d} className="rounded-[3px] border px-1.5 py-2 text-center" style={{ borderColor: LINE, background: PANEL2 }}>
                <div className="text-[8px] font-semibold uppercase" style={{ color: MUT }}>{d}</div>
                <div className="my-1 text-[14px]" style={{ color: CYAN }} aria-hidden>☂</div>
                <div className="text-[8.5px]" style={{ color: INK }}>{w}</div>
                <div className="text-[7.5px]" style={{ color: r.includes('Low') ? EMER : AMBER }}>{r}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Hazard Risk Level (Next 72H)</div>
          <MultiLine height={110} series={[
            { name: 'Critical', c: RED, pts: W('hc', 30, 80, 13) },
            { name: 'High', c: AMBER, pts: W('hh', 24, 64, 13) },
            { name: 'Medium', c: GOLD, pts: W('hm', 18, 48, 13) },
            { name: 'Low', c: EMER, pts: W('hl', 10, 34, 13) },
          ]} />
        </Panel>
        <Panel title="Incident Response Status" action="View All">
          <div className="flex items-center gap-3">
            <Ring value={Math.round(wave(`em:or:${id}`, ts, 64, 88))} top={`${Math.round(wave(`em:or:${id}`, ts, 64, 88))}%`} sub="Overall" color={EMER} />
            <div className="flex-1 space-y-2">
              {irs.map(([l, p, c]) => (
                <div key={l} className="text-[9px]">
                  <div className="flex justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{p}%</span></div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: '#241a1d' }}><span className="block h-full rounded-full" style={{ width: `${p}%`, background: c }} /></div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Resource Allocation" action="View All">
          <Donut top="84%" sub="Allocated" segs={[
            { label: 'Personnel', v: 46, c: EMER }, { label: 'Equipment', v: 24, c: CYAN },
            { label: 'Logistics', v: 18, c: GOLD }, { label: 'Fuel & Supplies', v: 8, c: AMBER }, { label: 'Other', v: 4, c: RED },
          ]} />
        </Panel>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.3fr_1fr_1fr]">
        <Panel title="Response Timeline">
          <div className="flex items-stretch gap-1 pt-2">
            {timeline.map(([l, tm, done], i) => (
              <React.Fragment key={l}>
                <div className="flex flex-1 flex-col items-center text-center">
                  <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold"
                    style={{ color: done ? EMER : i === 4 ? AMBER : MUT, border: `1px solid ${done ? EMER : i === 4 ? AMBER : 'rgba(122,108,104,0.4)'}` }}>{done ? '✓' : i === 4 ? '◐' : '○'}</span>
                  <span className="mt-1 text-[8px] font-medium" style={{ color: SOFT }}>{l}</span>
                  <span className="text-[7.5px] font-mono" style={{ color: i === 4 ? AMBER : MUT }}>{tm}</span>
                </div>
                {i < timeline.length - 1 ? <span className="mt-3 h-px flex-1 self-start" style={{ background: timeline[i + 1]![2] || i === 3 ? EMER : 'rgba(122,108,104,0.3)' }} /> : null}
              </React.Fragment>
            ))}
          </div>
        </Panel>
        <Panel title="Communications Status" action="View All">
          <div className="space-y-1.5">
            {comms.map(c => (
              <div key={c} className="flex items-center justify-between text-[9px]"><span style={{ color: SOFT }}>{c}</span><span className="flex items-center gap-1" style={{ color: EMER }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: EMER }} />Operational</span></div>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t pt-2" style={{ borderColor: LINE }}>
              <span className="text-[24px]" style={{ color: CYAN }} aria-hidden>📡</span>
              <div>
                <div className="text-[7.5px] uppercase tracking-wider" style={{ color: MUT }}>Message Broadcast (24H)</div>
                <div className="font-mono text-[18px]" style={{ color: INK, fontFamily: SERIF }}>{Math.round(wave(`em:mb:${id}`, ts, 40, 80))}</div>
                <div className="text-[8px]" style={{ color: SOFT }}>Messages · Reach <span style={{ color: CYAN }}>3.2M</span></div>
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="Public Alerts" action="View All">
          <div className="space-y-2">
            {publicAlerts.map(([t, tm]) => (
              <div key={t} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px]" style={{ background: 'color-mix(in srgb,#e0a13a 16%,transparent)', color: AMBER }} aria-hidden>⚑</span>
                <span className="min-w-0 flex-1" style={{ color: INK }}>{t}</span>
                <span className="font-mono text-[8px]" style={{ color: SOFT }}>{tm}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Command feed ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[4px] border px-4 py-2.5" style={{ borderColor: LINE, background: PANEL }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: RED }}>Command Feed</span>
        {feed.map(([t, e]) => (
          <span key={e} className="flex items-center gap-2 text-[9px]"><span className="font-mono" style={{ color: MUT }}>{t}</span><span style={{ color: SOFT }}>{e}</span></span>
        ))}
        <span className="ml-auto text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>View All Updates →</span>
      </div>
    </div>
  );
}
