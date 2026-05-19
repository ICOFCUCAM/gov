'use client';

// Prisons & Corrections — National Justice Authority. Light, modern
// correctional-management surface modelled on the benchmark: inmate &
// capacity KPI strip, population by security level, 12-month population
// trend, offence-category mix, facilities overview, rehabilitation
// programmes, parole & release, demographics, incidents and risk
// assessment. Pure & deterministic — engine + telemetry only.

import * as React from 'react';
import { justiceOps } from '@/lib/gov/justice-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#f5f6fb';
const CARD = '#ffffff';
const LINE = '#e7e9f1';
const INK = '#1d2333';
const SOFT = '#56607a';
const MUT = '#8b94a8';
const PURPLE = '#7c5cf0';
const BLUE = '#4f7df0';
const GREEN = '#2bb673';
const TEAL = '#27b3a6';
const AMBER = '#e0a13a';
const RED = '#e0685f';

function Card({ title, sub, action, children, className }: {
  title: string; sub?: string; action?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-xl border ${className ?? ''}`}
      style={{ borderColor: LINE, background: CARD, boxShadow: '0 1px 3px rgba(20,30,60,0.04)' }}>
      <div className="flex items-center justify-between px-4 pt-3">
        <div>
          <h3 className="text-[13px] font-semibold" style={{ color: INK }}>{title}</h3>
          {sub ? <div className="text-[9.5px]" style={{ color: MUT }}>{sub}</div> : null}
        </div>
        {action ? <span className="text-[10px] font-medium" style={{ color: PURPLE }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-4 pt-3">{children}</div>
    </section>
  );
}

function Kpi({ label, value, delta, dn, flat, icon, c, bar }: {
  label: string; value: string; delta?: string; dn?: boolean; flat?: boolean; icon: string; c: string; bar?: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border px-4 py-3" style={{ borderColor: LINE, background: CARD, boxShadow: '0 1px 3px rgba(20,30,60,0.04)' }}>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[13px]" style={{ background: `color-mix(in srgb,${c} 14%,#fff)`, color: c }} aria-hidden>{icon}</span>
        <span className="text-[11px]" style={{ color: MUT }}>{label}</span>
      </div>
      <div className="text-[20px] font-bold tabular-nums" style={{ color: INK }}>{value}</div>
      {bar != null ? (
        <>
          <div className="text-[9px]" style={{ color: MUT }}>Utilization Rate</div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: '#eef0f6' }}>
            <span className="block h-full rounded-full" style={{ width: `${bar}%`, background: c }} />
          </div>
        </>
      ) : (
        <div className="text-[9.5px]" style={{ color: flat ? MUT : dn ? RED : GREEN }}>
          {flat ? '—' : dn ? '↓' : '↑'} {delta} <span style={{ color: MUT }}>vs last month</span>
        </div>
      )}
    </div>
  );
}

function Donut({ segs, top, label = 'Total', size = 150 }: { segs: { label: string; v: number; n: string; c: string }[]; top: string; label?: string; size?: number }) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 13, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f6" strokeWidth="14" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="14"
            strokeLinecap="round" strokeDasharray={`${Math.max(0, fr * circ - 3)} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.073} fill={MUT}>{label}</text>
        <text x="50%" y="58%" textAnchor="middle" fontSize={size * 0.118} fontWeight="700" fill={INK}>{top}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-semibold tabular-nums" style={{ color: INK }}>{Math.round((s.v / sum) * 1000) / 10}%</span>
            <span className="w-16 text-right tabular-nums" style={{ color: MUT }}>({s.n})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Area({ pts, labels, c = BLUE, fmt, height = 168 }: { pts: number[]; labels: string[]; c?: string; fmt: (v: number) => string; height?: number }) {
  const mn = Math.min(...pts) * 0.96, sp = Math.max(...pts) - mn || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 100, 90 - ((p - mn) / sp) * 78] as [number, number]);
  const path = xy.map(([x, y]) => `${x},${y}`).join(' ');
  const ticks = [Math.max(...pts), (Math.max(...pts) + mn) / 2, mn];
  return (
    <div className="flex">
      <div className="mr-1 flex flex-col justify-between py-1 text-[8px] tabular-nums" style={{ color: MUT, height }}>
        {ticks.map((t, i) => <span key={i}>{fmt(t)}</span>)}
      </div>
      <div className="flex-1">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
          <defs><linearGradient id={`ar-${c.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.28" /><stop offset="100%" stopColor={c} stopOpacity="0.02" />
          </linearGradient></defs>
          {[18, 36, 54, 72].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#eef0f6" strokeWidth="0.5" />)}
          <polygon points={`0,100 ${path} 100,100`} fill={`url(#ar-${c.slice(1)})`} />
          <polyline points={path} fill="none" stroke={c} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" fill={c} vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className="mt-1 flex justify-between text-[8px]" style={{ color: MUT }}>{labels.map(m => <span key={m}>{m}</span>)}</div>
      </div>
    </div>
  );
}

function Spark({ pts, c, height = 56 }: { pts: number[]; c: string; height?: number }) {
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 100, 88 - ((p - mn) / sp) * 74] as [number, number]);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={c} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill={c} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}

export function PrisonsCorrections({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const jo = justiceOps(id, ts);
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' });

  const pop = jo.corrections.population;
  const cap = jo.corrections.capacity;
  const fac = jo.corrections.facilities;
  const util = Math.min(99, Math.round((pop / cap) * 100));
  const staff = 22_000 + Math.round(seed(`pc:st:${id}`) * 6000);
  const incidents = Math.round(wave(`pc:in:${id}`, ts, 240, 420));
  const releases = Math.round(wave(`pc:rl:${id}`, ts, 1500, 2300));
  const n = (x: number) => x.toLocaleString();

  const kpis = [
    <Kpi key="ti" label="Total Inmates" value={n(pop)} delta="2.1%" icon="◉" c={PURPLE} />,
    <Kpi key="fc" label="Facilities" value={String(fac)} flat icon="▤" c={BLUE} />,
    <Kpi key="cp" label="Capacity" value={n(cap)} icon="▦" c={TEAL} bar={util} />,
    <Kpi key="sf" label="Staff" value={n(staff)} delta="1.8%" icon="☗" c={GREEN} />,
    <Kpi key="ic" label="Incidents (30 Days)" value={n(incidents)} delta="12.4%" dn icon="⚠" c={AMBER} />,
    <Kpi key="rl" label="Releases (30 Days)" value={n(releases)} delta="3.7%" icon="⏿" c={BLUE} />,
  ];

  const secLvl = [
    { label: 'Maximum Security', v: 27.3, n: '62,382', c: PURPLE },
    { label: 'High Security', v: 33.6, n: '76,742', c: BLUE },
    { label: 'Medium Security', v: 25.4, n: '58,091', c: TEAL },
    { label: 'Minimum Security', v: 11.2, n: '25,613', c: GREEN },
    { label: 'Other / Protective Custody', v: 2.5, n: '5,633', c: '#c4cbd9' },
  ];
  const offence = [
    { label: 'Violent Offenses', v: 38.7, n: '88,541', c: RED },
    { label: 'Property Offenses', v: 24.6, n: '56,225', c: AMBER },
    { label: 'Drug Offenses', v: 18.5, n: '42,198', c: PURPLE },
    { label: 'Public Order Offenses', v: 9.6, n: '21,903', c: BLUE },
    { label: 'Other Offenses', v: 8.6, n: '19,594', c: '#c4cbd9' },
  ];
  const demo = [
    { label: '18 - 25 years', v: 12.6, n: '28,756', c: BLUE },
    { label: '26 - 35 years', v: 28.9, n: '65,950', c: PURPLE },
    { label: '36 - 45 years', v: 26.3, n: '60,070', c: TEAL },
    { label: '46 - 55 years', v: 20.1, n: '45,903', c: GREEN },
    { label: '56+ years', v: 12.1, n: '27,782', c: AMBER },
  ];
  const risk = [
    { label: 'High Risk', v: 18.3, n: '41,734', c: RED },
    { label: 'Medium Risk', v: 44.7, n: '102,008', c: AMBER },
    { label: 'Low Risk', v: 37.0, n: '84,306', c: GREEN },
  ];

  const trend = waveSeries(`pc:pt:${id}`, ts, 12, 178000, 232000).map((v, i) => Math.round(v + i * 1400));
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

  const facilities: [string, string, string, string, string][] = [
    ['Central Correctional Complex', 'North Region', '12,500', '11,842', '94.7%'],
    ['Riverside Prison', 'East Region', '8,200', '6,884', '84.6%'],
    ['Greenfield Institution', 'South Region', '6,000', '3,874', '64.6%'],
    ['Highland Correctional Centre', 'West Region', '5,500', '4,932', '89.7%'],
    ['Coastal Rehabilitation Center', 'Coastal Region', '2,800', '2,104', '75.1%'],
  ];
  const programs: [string, string, string][] = [
    ['Education Programs', '16,842', BLUE], ['Vocational Training', '14,532', PURPLE],
    ['Substance Abuse Treatment', '9,621', TEAL], ['Behavioral Programs', '7,843', GREEN],
    ['Life Skills Development', '5,126', AMBER],
  ];
  const parole: [string, string, string, boolean][] = [
    ['Parole Hearings', '2,156', '5.6%', false], ['Parole Granted', '842', '4.2%', false],
    ['Parole Denied', '1,038', '2.1%', true], ['Successful Completions', '1,274', '6.8%', false],
  ];
  const incCat: [string, string, string][] = [
    ['Total Incidents', n(incidents), '-12.4%'], ['Violence', '84', '-15.5%'],
    ['Contraband', '112', '-8.3%'], ['Disturbances', '56', '-18.5%'], ['Other', '60', '-9.1%'],
  ];

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: PURPLE }} aria-hidden>⚖</span>
          <div>
            <div className="text-[13px] font-bold leading-tight" style={{ color: INK }}>National Justice Authority</div>
            <div className="text-[9.5px]" style={{ color: MUT }}>One Nation. Safe. Just. Reformed.</div>
          </div>
        </div>
        <div>
          <div className="text-[20px] font-bold leading-tight" style={{ color: INK }}>Prisons &amp; Corrections</div>
          <div className="text-[11px]" style={{ color: MUT }}>Integrated management of correctional facilities, inmates, rehabilitation and reintegration.</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: SOFT }}>⛃ Filters</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: PURPLE }}>CO</span>
            <span><span className="block font-medium" style={{ color: INK }}>Chief Corrections Officer</span><span style={{ color: MUT }}>Ministry of Justice</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{kpis}</div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Inmate Population by Security Level" sub={`As of ${dd}`}>
          <Donut top={n(pop)} segs={secLvl} />
        </Card>
        <Card title="Inmate Population Trend" sub="Last 12 Months">
          <Area pts={trend} labels={months} c={BLUE} fmt={v => `${Math.round(v / 1000)}K`} />
        </Card>
        <Card title="Population by Offense Category" sub={`As of ${dd}`}>
          <Donut top={n(pop)} segs={offence} />
        </Card>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Facilities Overview" action="View All Facilities →">
          <div className="mb-3 grid grid-cols-4 gap-2 text-center">
            {[['Total', String(fac), INK], ['Operating', '72', GREEN], ['Maintenance', '4', AMBER], ['Planned', '2', BLUE]].map(([l, v, c]) => (
              <div key={l} className="rounded-lg py-1.5" style={{ background: '#f7f8fc' }}>
                <div className="text-[15px] font-bold tabular-nums" style={{ color: c }}>{v}</div>
                <div className="text-[8.5px]" style={{ color: MUT }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="flex text-[8px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="flex-1">Facility · Location</span><span className="w-14 text-right">Cap.</span><span className="w-14 text-right">Pop.</span><span className="w-12 text-right">Util.</span>
          </div>
          <div className="mt-1.5 space-y-1.5">
            {facilities.map(([nm, loc, c, p, u]) => (
              <div key={nm} className="flex items-center text-[9.5px]">
                <div className="min-w-0 flex-1 truncate"><span style={{ color: INK }}>{nm}</span> <span style={{ color: MUT }}>· {loc}</span></div>
                <span className="w-14 text-right tabular-nums" style={{ color: SOFT }}>{c}</span>
                <span className="w-14 text-right tabular-nums" style={{ color: SOFT }}>{p}</span>
                <span className="w-12 text-right font-semibold tabular-nums" style={{ color: GREEN }}>{u}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Rehabilitation &amp; Programs" action="View All Programs →">
          <div className="text-[10px]" style={{ color: SOFT }}>Participation Rate</div>
          <div className="flex items-center gap-3">
            <div className="text-[22px] font-bold tabular-nums" style={{ color: INK }}>62.4%</div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#eef0f6' }}>
              <span className="block h-full rounded-full" style={{ width: '62.4%', background: BLUE }} />
            </div>
            <span className="text-[9.5px] font-semibold" style={{ color: GREEN }}>↑ 4.3%</span>
          </div>
          <div className="mt-3 mb-1 flex justify-between text-[8.5px] uppercase tracking-wider" style={{ color: MUT }}>
            <span>Active Programs</span><span>Participants</span>
          </div>
          <div className="space-y-2">
            {programs.map(([l, v, c]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-semibold tabular-nums" style={{ color: INK }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Parole &amp; Release Overview" sub="30 Days" action="View Parole Board →">
          <div className="grid grid-cols-2 gap-2">
            {parole.map(([l, v, d, dn]) => (
              <div key={l} className="rounded-lg p-2" style={{ background: '#f7f8fc' }}>
                <div className="text-[9px]" style={{ color: MUT }}>{l}</div>
                <div className="text-[16px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
                <div className="text-[8.5px]" style={{ color: dn ? RED : GREEN }}>{dn ? '↓' : '↑'} {d}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <div><div style={{ color: MUT }}>Recidivism Rate (12M)</div><div className="text-[15px] font-bold" style={{ color: INK }}>22.6% <span className="text-[9px] font-semibold" style={{ color: GREEN }}>↓1.8pp</span></div></div>
            <div className="w-1/2"><Spark pts={waveSeries(`pc:rec:${id}`, ts, 12, 21, 25)} c={BLUE} /></div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-lg p-2" style={{ background: '#f7f8fc' }}><div style={{ color: MUT }}>Avg. Time Served</div><div className="text-[14px] font-bold" style={{ color: INK }}>3.7 years</div></div>
            <div className="rounded-lg p-2" style={{ background: '#f7f8fc' }}><div style={{ color: MUT }}>Rate / 1,000 Released</div><div className="text-[14px] font-bold" style={{ color: INK }}>226</div></div>
          </div>
        </Card>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Inmate Demographics" sub={`As of ${dd}`}>
          <Donut top={n(pop)} segs={demo} />
        </Card>
        <Card title="Incidents Overview" sub="30 Days" action="View Incident Reports →">
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {incCat.map(([l, v, d]) => (
              <div key={l} className="rounded-lg py-1.5" style={{ background: '#f7f8fc' }}>
                <div className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
                <div className="text-[7.5px] leading-tight" style={{ color: MUT }}>{l}</div>
                <div className="text-[7.5px] font-semibold" style={{ color: GREEN }}>{d}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[9.5px]" style={{ color: SOFT }}>Incident Trend</div>
          <Spark pts={waveSeries(`pc:inc:${id}`, ts, 16, 18, 64)} c={BLUE} height={92} />
        </Card>
        <Card title="Risk Assessment Overview" sub={`As of ${dd}`} action="View Risk Dashboard →">
          <Donut top={n(pop)} label="Total Inmates" segs={risk} />
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[10px]" style={{ borderColor: LINE, color: MUT }}>
        <span>National Justice Authority — One Nation. Safe. Just. Reformed.</span>
        <span>All Systems Operational 98% · Uptime 99.8% (30d) · Access-to-Justice Index {jo.accessToJusticeIndex}</span>
      </div>
    </div>
  );
}
