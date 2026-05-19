'use client';

// Emergency Operations — National Emergency Response System. Dense crisis
// command surface modelled on the benchmark: readiness KPI strip, national
// incident map, active incidents, response resources & shelters, weather &
// hazard forecast, incident-response status, resource allocation, response
// timeline, communications status and public alerts. Pure & deterministic
// — engine + telemetry only.

import * as React from 'react';
import { emergencyOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

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

// National incident map: cyclone swirl + glowing incident clusters.
function IncidentMap({ seedKey }: { seedKey: string }) {
  const cols = 30, rows = 13;
  const clusters = Array.from({ length: 9 }).map((_, i) => ({
    x: 12 + seed(`${seedKey}:cx:${i}`) * 76, y: 16 + seed(`${seedKey}:cy:${i}`) * 64,
    r: 3 + seed(`${seedKey}:cr:${i}`) * 8, hot: seed(`${seedKey}:ch:${i}`),
  }));
  const col = (h: number) => (h > 0.78 ? RED : h > 0.55 ? AMBER : h > 0.35 ? GOLD : CYAN);
  return (
    <div className="relative h-full overflow-hidden rounded-[3px]" style={{ background: 'radial-gradient(120% 90% at 38% 62%,#0e1c1f,#0a0608)' }}>
      <div className="grid h-full gap-[3px] p-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} aria-hidden>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const v = seed(`${seedKey}:${i}`);
          const inland = (i % cols > 2 && i % cols < cols - 2 && Math.floor(i / cols) > 0 && Math.floor(i / cols) < rows - 1);
          return <span key={i} className="aspect-square rounded-full" style={{ background: inland ? (v > 0.9 ? RED : '#2a1c1f') : 'transparent', opacity: inland ? (v > 0.9 ? 0.85 : 0.35) : 0 }} />;
        })}
      </div>
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {/* cyclone swirl */}
        {[0, 1, 2, 3].map(k => (
          <circle key={k} cx="22" cy="56" r={4 + k * 4} fill="none" stroke={CYAN} strokeWidth="0.5"
            opacity={0.4 - k * 0.08} strokeDasharray="6 4" />
        ))}
        <circle cx="22" cy="56" r="2.4" fill={CYAN} style={{ filter: `drop-shadow(0 0 4px ${CYAN})` }} />
        {clusters.map((c, i) => i < clusters.length - 1 ? (
          <line key={i} x1={c.x} y1={c.y} x2={clusters[i + 1]!.x} y2={clusters[i + 1]!.y} stroke={RED} strokeWidth="0.25" opacity="0.3" />
        ) : null)}
        {clusters.map((c, i) => (
          <g key={`g${i}`}>
            <circle cx={c.x} cy={c.y} r={c.r} fill={col(c.hot)} opacity="0.18" />
            <circle cx={c.x} cy={c.y} r={c.r * 0.38} fill={col(c.hot) === CYAN ? CYAN : RED_BR}
              style={{ filter: `drop-shadow(0 0 4px ${col(c.hot)})` }} />
          </g>
        ))}
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {['⛶', '☰', '⌖'].map(s => (
          <span key={s} className="grid h-6 w-6 place-items-center rounded-[2px] border text-[10px]" style={{ borderColor: LINE, background: PANEL, color: SOFT }} aria-hidden>{s}</span>
        ))}
      </div>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-3 rounded-[2px] border px-3 py-1" style={{ borderColor: LINE, background: 'rgba(10,6,8,0.75)' }}>
        {[['Critical', RED], ['High', AMBER], ['Medium', GOLD], ['Low', EMER], ['Monitoring', CYAN]].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-wider" style={{ color: SOFT }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, action, children, className }: {
  title: string; action?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-[4px] border ${className ?? ''}`} style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: LINE }}>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: INK }}>{title}</h3>
        {action ? <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

export function EmergencyCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = emergencyOps(id, ts);
  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
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

  const incidents: [string, string, string, string, string][] = [
    ['Tropical Cyclone Aurora', 'Western Coast Region', '12:35', 'CRITICAL', '320K'],
    ['Severe Flooding', 'Central River Basin', '11:58', 'HIGH', '18K'],
    ['Wildfire Outbreak', 'Northern Highlands', '11:42', 'HIGH', '42K'],
    ['Landslide Threat', 'Eastern Mountain Zone', '10:47', 'MEDIUM', '18K'],
    ['Urban Power Outage', 'Metro City Region', '09:32', 'MEDIUM', '210K'],
  ];
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
    ['Heavy rain and strong winds expected in Western Coast', '12:35'],
    ['Evacuation advised for low-lying areas in River Basin', '11:58'],
    ['Wildfire nearby. Avoid Northern Highlands trails', '11:42'],
    ['Road closures in Mountain Zone due to landslide risk', '10:47'],
    ['Power outage in Metro City. Use caution', '09:32'],
  ];
  const feed: [string, string][] = [
    ['12:40', 'Rescue team deployed to Coastal Region'],
    ['12:28', 'Additional shelters opened in Central District'],
    ['12:15', 'Flood barriers activated in Delta Zone'],
    ['12:05', 'Air support requested for Northern Highlands'],
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
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> GMT+1</span>
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
        <Panel title="National Incident Map" action="View Full Map">
          <div className="h-[300px]"><IncidentMap seedKey={`em:im:${id}`} /></div>
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
