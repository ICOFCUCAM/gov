'use client';

// Municipal Systems — Municipal Operations Center (National Governance
// Platform). Dense dark smart-city console modelled on the benchmark:
// KPI strip with sparklines, city operations map, active incidents,
// live camera feeds, and traffic / water / waste / energy / weather
// service panels. Pure & deterministic — engine + telemetry only.

import * as React from 'react';
import { transportOps } from '@/lib/gov/transport-systems';
import { waveSeries } from '@/lib/telemetry';
import { CityMap, useCityGeo, type CityPalette } from '@/apps/_shared/CityDistrictMap';

const BG = '#070b12';
const PANEL = '#0d131c';
const PANEL2 = '#111927';
const LINE = 'rgba(80,170,200,0.15)';
const LINE2 = 'rgba(255,255,255,0.06)';
const CYAN = '#37c7d4';
const TEAL = '#2bb3a6';
const BLUE = '#4f8df0';
const GREEN = '#35c08a';
const PURPLE = '#8a6cf0';
const AMBER = '#e0a13a';
const ORANGE = '#e07a3a';
const RED = '#e0685f';
const INK = '#d8e0e8';
const SOFT = '#8c99a7';
const MUT = '#5d6a77';

const SEV: Record<string, string> = { High: RED, Medium: AMBER, Low: BLUE, Info: TEAL };

function Spark({ pts, c, h = 30 }: { pts: number[]; c: string; h?: number }) {
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 100, h - 3 - ((p - mn) / sp) * (h - 6)] as [number, number]);
  return (
    <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h }} aria-hidden>
      <defs><linearGradient id={`sg-${c.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c} stopOpacity="0.32" /><stop offset="100%" stopColor={c} stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={`0,${h} ${xy.map(([x, y]) => `${x},${y}`).join(' ')} 100,${h}`} fill={`url(#sg-${c.slice(1)})`} />
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={c} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ title, action, children, className }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-lg border ${className ?? ''}`} style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center justify-between border-b px-3.5 py-2.5" style={{ borderColor: LINE2 }}>
        <h3 className="text-[12px] font-semibold" style={{ color: INK }}>{title}</h3>
        {action ? <span className="text-[9.5px] font-medium" style={{ color: CYAN }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3.5">{children}</div>
    </section>
  );
}

// The City Operations Map is drawn on the nation's real geography: the
// capital's region opened to its districts (CityDistrictMap.tsx, map plan
// phase 5; was a fixed schematic with five invented district labels).
const CITY_P: CityPalette = { CYAN, TEAL, BLUE, GREEN, PURPLE, AMBER, RED, INK, SOFT, MUT, PANEL, LINE2, ground: 'radial-gradient(ellipse at 50% 40%,#0f1a28,#070b12)' };

function CamTile({ label }: { label: string }) {
  return (
    <div className="relative overflow-hidden rounded-md border" style={{ borderColor: LINE2, aspectRatio: '16/10', background: 'linear-gradient(160deg,#1a2533,#0c1119)' }}>
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
        <rect width="100" height="60" fill="#11202e" />
        <path d="M0 44 L40 26 L100 40 V60 H0 Z" fill="#16242f" />
        <path d="M30 60 L46 24 L54 24 L74 60 Z" fill="#1c2c38" />
        {[20, 50, 80].map((x, i) => <rect key={i} x={x} y={34 - i * 2} width="3" height="6" rx="1" fill="#5a7185" opacity="0.7" />)}
      </svg>
      <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[7.5px] font-bold text-white" style={{ background: 'rgba(224,104,95,0.85)' }}>● LIVE</span>
      <span className="absolute bottom-1 left-1.5 text-[8px] font-medium" style={{ color: INK }}>{label}</span>
    </div>
  );
}

export function MunicipalSystems({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = transportOps(id, ts);
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' });
  const hm = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const S = (k: string, lo: number, hi: number) => waveSeries(`mu:${k}:${id}`, ts, 22, lo, hi);
  const city = useCityGeo();
  const [district, setDistrict] = React.useState('');
  const [tilt, setTilt] = React.useState(false);
  const districtName = (i: number, ref: string) => (city?.districts ? city.geo.units[i % city.geo.units.length]?.name ?? ref : ref);

  const kpis: [string, string, string, string, boolean | null, string][] = [
    ['City Population', '4.28M', '+1.35% vs last month', '☷', false, BLUE],
    ['System Health', `${o.networkAvailabilityPct}%`, 'Excellent', '⛨', null, GREEN],
    ['Active Services', '312', '+8 vs yesterday', '▦', false, PURPLE],
    ['Service Requests', '1,248', '-5.2% vs yesterday', '◉', true, ORANGE],
    ['Work Orders', '342', '+12 vs yesterday', '▤', false, AMBER],
    ['Energy Consumption', '24.8 MW', '-4.1% vs yesterday', '⚡', true, GREEN],
  ];
  const sparkC = [BLUE, GREEN, PURPLE, ORANGE, AMBER, GREEN];

  const incidents: [string, string, string, string][] = [
    ['Traffic Accident', 'Main St & 5th Ave', 'High', '5 min ago'],
    ['Water Main Break', `Oak Street, ${districtName(3, 'District 4')}`, 'Medium', '12 min ago'],
    ['Street Light Outage', 'Park Avenue, Sector B', 'Low', '25 min ago'],
    ['Waste Collection Delay', `Route 12, ${districtName(0, 'North District')}`, 'Info', '45 min ago'],
  ];
  const cams = ['Main St & 5th Ave', 'Downtown Junction', 'Harbor Road', 'Central Park'];
  const forecast: [string, string, string][] = [
    ['SUN', '28°/18°', '☀'], ['MON', '27°/17°', '⛅'], ['TUE', '26°/18°', '🌧'], ['WED', '25°/17°', '⛅'], ['THU', '26°/18°', '☀'],
  ];

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: `linear-gradient(135deg,${CYAN},${BLUE})` }} aria-hidden>♛</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Governance Platform</div>
            <div className="text-[9px]" style={{ color: MUT }}>Municipal Operations Center</div>
          </div>
        </div>
        <div>
          <div className="text-[19px] font-bold leading-tight" style={{ color: INK }}>Municipal Systems</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>Real-time monitoring and management of urban infrastructure and city services.</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10.5px]">
          <label className="relative flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>
            <span aria-hidden>⌖</span><span className="sr-only">Show a district on the city map</span>
            <select value={district} onChange={e => setDistrict(e.currentTarget.value)} disabled={!city?.districts}
              className="focus-ring max-w-[10rem] cursor-pointer appearance-none truncate bg-transparent pe-3" style={{ color: SOFT }}>
              <option value="" style={{ background: PANEL }}>All Districts</option>
              {(city?.districts ? city.geo.units : []).map(u => <option key={u.code ?? u.name} value={u.name} style={{ background: PANEL }}>{u.name}</option>)}
            </select>
            <span className="pointer-events-none absolute end-3" aria-hidden>▾</span>
          </label>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}, {hm}</span>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⛁<span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[8px] font-bold text-white" style={{ background: RED }}>7</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: CYAN }}>OD</span>
            <span><span className="block font-medium" style={{ color: INK }}>City Operations Director</span><span style={{ color: MUT }}>Municipal Administration</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, d, ic, dn], i) => (
          <div key={l} className="rounded-lg border p-3.5" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg text-[13px]" style={{ background: `color-mix(in srgb,${sparkC[i]} 16%,${PANEL})`, color: sparkC[i] }} aria-hidden>{ic}</span>
              <span className="text-[10px]" style={{ color: MUT }}>{l}</span>
            </div>
            <div className="mt-1.5 text-[19px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
            <div className="text-[8.5px]" style={{ color: dn == null ? GREEN : dn ? RED : GREEN }}>{d}</div>
            <div className="mt-1.5"><Spark pts={S(`k${i}`, 20, 80)} c={sparkC[i] ?? CYAN} /></div>
          </div>
        ))}
      </div>

      {/* ── Map + right rail ───────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.85fr_1fr]">
        <Card title="City Operations Map" action={
          <button type="button" className="focus-ring rounded" aria-pressed={tilt} onClick={() => setTilt(t => !t)} title={tilt ? 'Back to the flat map' : 'Tilt the map'}>⬢ 3D View ▾</button>
        }>
          <CityMap id={id} ts={ts} city={city} P={CITY_P} district={district} onDistrict={setDistrict} tilt={tilt} onTilt={setTilt} />
        </Card>
        <div className="space-y-3">
          <Card title="Active Incidents" action="View All">
            <div className="space-y-2.5">
              {incidents.map(([t, loc, sv, ago]) => (
                <div key={t} className="flex items-center gap-2.5 text-[10px]">
                  <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px]" style={{ background: `color-mix(in srgb,${SEV[sv]} 18%,${PANEL})`, color: SEV[sv] }} aria-hidden>⚠</span>
                  <div className="min-w-0 flex-1"><div className="truncate" style={{ color: INK }}>{t}</div><div className="truncate text-[8.5px]" style={{ color: MUT }}>{loc}</div></div>
                  <span className="rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ color: SEV[sv], background: `color-mix(in srgb,${SEV[sv]} 16%,${PANEL})` }}>{sv}</span>
                  <span className="w-16 text-right text-[8.5px]" style={{ color: MUT }}>{ago}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Live Camera Feeds" action="View All">
            <div className="grid grid-cols-2 gap-2">{cams.map(c => <CamTile key={c} label={c} />)}</div>
          </Card>
        </div>
      </div>

      {/* ── Service panels ─────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-5">
        <Card title="Traffic Management">
          <div className="flex justify-between text-[9px]" style={{ color: MUT }}>
            <div><div>Average Speed</div><div className="text-[15px] font-bold" style={{ color: INK }}>42 km/h</div><div style={{ color: RED }}>-6% vs yesterday</div></div>
            <div className="text-right"><div>Traffic Flow</div><div className="text-[12px] font-bold" style={{ color: GREEN }}>● Good</div></div>
          </div>
          <div className="my-2 h-16 overflow-hidden rounded" style={{ background: 'radial-gradient(circle at 40% 50%,#162635,#0c1119)' }}>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
              <path d="M0 20 H100 M50 0 V40 M20 0 L80 40 M80 0 L20 40" stroke="rgba(55,199,212,0.3)" strokeWidth="1" fill="none" />
              <path d="M0 20 H40" stroke={RED} strokeWidth="2" /><path d="M40 20 H100" stroke={GREEN} strokeWidth="2" />
            </svg>
          </div>
          <div className="flex justify-between text-[9px]" style={{ color: MUT }}>
            <div><div>Active Signals</div><div className="text-[13px] font-bold" style={{ color: INK }}>1,287</div></div>
            <div className="text-right"><div>Congestions</div><div className="text-[13px] font-bold" style={{ color: AMBER }}>Moderate</div></div>
          </div>
        </Card>
        <Card title="Water &amp; Utilities">
          <div className="flex justify-between text-[9px]" style={{ color: MUT }}>
            <div><div>Water Supply</div><div className="text-[15px] font-bold" style={{ color: INK }}>98.2%</div></div>
            <div className="text-right"><div>System Pressure</div><div className="text-[12px] font-bold" style={{ color: GREEN }}>● Good</div></div>
          </div>
          <div className="my-2"><Spark pts={S('wt', 30, 90)} c={BLUE} h={56} /></div>
          <div className="flex justify-between text-[9px]" style={{ color: MUT }}>
            <div><div>Reservoir Level</div><div className="text-[13px] font-bold" style={{ color: INK }}>72%</div></div>
            <div className="text-right"><div>Active Alerts</div><div className="text-[13px] font-bold" style={{ color: RED }}>2</div></div>
          </div>
        </Card>
        <Card title="Waste Management">
          <div className="flex justify-between text-[9px]" style={{ color: MUT }}>
            <div><div>Collection Efficiency</div><div className="text-[15px] font-bold" style={{ color: INK }}>94.6%</div></div>
            <div className="text-right"><div>Today&apos;s Collection</div><div className="text-[12px] font-bold" style={{ color: INK }}>1,248 tons</div></div>
          </div>
          <div className="my-2 flex h-16 items-end gap-1">
            {S('ws', 30, 100).slice(0, 7).map((v, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${v}%`, background: BLUE, opacity: 0.55 + (i / 14) }} />
            ))}
          </div>
          <div className="flex justify-between text-[9px]" style={{ color: MUT }}>
            <div><div>Trucks Active</div><div className="text-[13px] font-bold" style={{ color: INK }}>48 / 52</div></div>
            <div className="text-right"><div>Missed Collections</div><div className="text-[13px] font-bold" style={{ color: RED }}>4</div></div>
          </div>
        </Card>
        <Card title="Energy &amp; Lighting">
          <div className="flex justify-between text-[9px]" style={{ color: MUT }}>
            <div><div>Energy Usage</div><div className="text-[15px] font-bold" style={{ color: INK }}>24.8 MW</div><div style={{ color: GREEN }}>-4.1% vs yesterday</div></div>
            <div className="text-right"><div>Lights Operational</div><div className="text-[13px] font-bold" style={{ color: INK }}>96.3%</div></div>
          </div>
          <div className="my-2"><Spark pts={S('en', 30, 80)} c={GREEN} h={56} /></div>
          <div className="flex justify-between text-[9px]" style={{ color: MUT }}>
            <div><div>Total Lights</div><div className="text-[13px] font-bold" style={{ color: INK }}>32,451</div></div>
            <div className="text-right"><div>Outages</div><div className="text-[13px] font-bold" style={{ color: AMBER }}>156</div></div>
          </div>
        </Card>
        <Card title="Weather &amp; Environment" action="View All">
          <div className="flex items-center gap-3">
            <span className="text-[26px]" aria-hidden>⛅</span>
            <div><div className="text-[20px] font-bold" style={{ color: INK }}>27°<span className="text-[11px]" style={{ color: MUT }}>C</span></div><div className="text-[8.5px]" style={{ color: MUT }}>Partly Cloudy · Feels 28°C</div></div>
            <div className="ml-auto grid grid-cols-3 gap-2 text-center text-[8px]" style={{ color: MUT }}>
              <div><div>AQI</div><div className="text-[12px] font-bold" style={{ color: GREEN }}>42</div><div>Good</div></div>
              <div><div>Parks</div><div className="text-[12px] font-bold" style={{ color: INK }}>48%</div><div>Open</div></div>
              <div><div>Wind</div><div className="text-[12px] font-bold" style={{ color: INK }}>12</div><div>NW</div></div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1 border-t pt-2 text-center text-[8px]" style={{ borderColor: LINE2, color: MUT }}>
            {forecast.map(([d, t, ic]) => (
              <div key={d}><div>{d}</div><div className="my-0.5 text-[13px]" aria-hidden>{ic}</div><div style={{ color: SOFT }}>{t}</div></div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[9.5px]" style={{ borderColor: LINE2, color: MUT }}>
        <span>Municipal Operations Center — Overall Operational</span>
        <span>System Uptime 99.92% · Active Alerts 12 · Service Requests 1,248 · Open Work Orders 342 · Network {o.networkAvailabilityPct}% · Updated {hm}</span>
      </div>
    </div>
  );
}
