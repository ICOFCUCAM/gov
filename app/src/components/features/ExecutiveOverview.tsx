'use client';

// Executive Overview — National Governance Platform apex executive
// surface. Dense dark data-driven-governance console modelled on the
// benchmark: KPI strip with sparklines, national performance map,
// strategic alerts, latest announcements, budget & project donuts,
// performance trend, top strategic initiatives and my-tasks. Pure &
// deterministic — telemetry only. Self-contained (no platform shell).

import * as React from 'react';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#070b12';
const PANEL = '#0d131c';
const PANEL2 = '#111927';
const LINE = 'rgba(90,150,210,0.16)';
const LINE2 = 'rgba(255,255,255,0.06)';
const CYAN = '#37c7d4';
const BLUE = '#4f8df0';
const GREEN = '#35c08a';
const TEAL = '#2bb3a6';
const PURPLE = '#8a6cf0';
const AMBER = '#e0a13a';
const RED = '#e0685f';
const INK = '#d8e0e8';
const SOFT = '#8c99a7';
const MUT = '#5d6a77';

const ID = 'exo';

function Card({ title, sub, action, children, className }: {
  title: string; sub?: string; action?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-lg border ${className ?? ''}`} style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center justify-between border-b px-3.5 py-2.5" style={{ borderColor: LINE2 }}>
        <div>
          <h3 className="text-[12px] font-semibold" style={{ color: INK }}>{title}</h3>
          {sub ? <div className="text-[9px]" style={{ color: MUT }}>{sub}</div> : null}
        </div>
        {action ? <span className="text-[9.5px] font-medium" style={{ color: CYAN }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3.5">{children}</div>
    </section>
  );
}

function Donut({ segs, top, sub }: { segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string }) {
  const size = 142, sum = segs.reduce((s, x) => s + x.v, 0) || 1, r = size / 2 - 12, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a212c" strokeWidth="13" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="13"
            strokeDasharray={`${Math.max(0, fr * circ - 2)} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize="15" fontWeight="700" fill={INK}>{top}</text>
        <text x="50%" y="58%" textAnchor="middle" fontSize="7.5" fill={MUT}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9.5px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-10 text-right tabular-nums" style={{ color: MUT }}>{Math.round((s.v / sum) * 1000) / 10}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerfMap() {
  const regions: [number, number, number][] = [
    [38, 30, 81.1], [62, 33, 76.4], [22, 50, 72.3], [46, 56, 79.8], [78, 46, 68.1], [60, 64, 74.6], [44, 80, 63.5],
  ];
  const col = (v: number) => v >= 80 ? GREEN : v >= 70 ? TEAL : v >= 60 ? AMBER : RED;
  return (
    <div className="relative overflow-hidden rounded-lg" style={{ background: 'radial-gradient(ellipse at 50% 45%,#0c1626,#070b12)', minHeight: 330 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs><pattern id={`pg-${ID}`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke={LINE2} strokeWidth="0.3" /></pattern></defs>
        <rect width="100" height="100" fill={`url(#pg-${ID})`} />
        {regions.map(([x, y, v], i) => (
          <circle key={i} cx={x} cy={y} r="13" fill={`color-mix(in srgb,${col(v)} 22%,transparent)`} stroke={col(v)} strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {regions.map(([x, y, v], i) => (
        <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full border text-[10px] font-bold tabular-nums"
          style={{ left: `${x}%`, top: `${y}%`, borderColor: col(v), background: 'rgba(13,19,28,0.85)', color: col(v) }}>{v}</div>
      ))}
      <div className="absolute left-3 top-3 flex flex-col gap-1">
        {['⛃', '⛁', '+', '−'].map(s => <span key={s} className="grid h-6 w-6 place-items-center rounded-md border text-[10px]" style={{ borderColor: LINE2, background: 'rgba(13,19,28,0.85)', color: SOFT }}>{s}</span>)}
      </div>
      <div className="absolute bottom-3 right-3 rounded-md border p-2 text-[8px]" style={{ borderColor: LINE2, background: 'rgba(13,19,28,0.88)', color: SOFT }}>
        <div className="mb-1 font-semibold" style={{ color: INK }}>Performance Index</div>
        {[['80 and above', GREEN], ['70 – 79.9', TEAL], ['60 – 69.9', AMBER], ['Below 60', RED], ['No data', MUT]].map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</div>
        ))}
      </div>
    </div>
  );
}

export function ExecutiveOverview() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' });
  const tm = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const opi = (77 + wave(`eo:pi:${ID}`, ts, 0, 3)).toFixed(1);

  const kpis: [string, string, string, string][] = [
    ['Overall Performance Index', opi, '↑ 4.3 vs last month', GREEN],
    ['Projects In Progress', '1,248', '↑ 8.7%', BLUE],
    ['Budget Utilization', '68.4%', '↑ 5.2%', PURPLE],
    ['Citizen Satisfaction', '82.1%', '↑ 3.6%', AMBER],
    ['Service Delivery Score', '74.3', '↑ 2.8', CYAN],
    ['Risk Exposure', 'Medium', '▼ Improved', GREEN],
  ];

  const alerts: [string, string, string, string, string][] = [
    ['High', 'Budget overrun in 3 major projects', 'Finance · 10:21 AM', 'Action Required', RED],
    ['Medium', 'Service delivery delay in 2 regions', 'Operations · 09:47 AM', 'Monitor', AMBER],
    ['Low', 'New policy requires review', 'Policy · 09:15 AM', 'For Review', BLUE],
    ['Info', 'Quarterly performance report available', 'Strategy · 08:30 AM', 'For Information', CYAN],
  ];
  const announcements: [string, string, string][] = [
    ['National Infrastructure Plan 2025–2030 Launched', 'Aiming to build a resilient and sustainable future.', 'May 17, 2025'],
    ['Digital Governance Summit Highlights', 'Key takeaways and next steps from the summit.', 'May 16, 2025'],
    ['New Citizen Service Portal Now Live', 'Enhanced features and easier access for all citizens.', 'May 15, 2025'],
  ];
  const budget = [
    { label: 'Infrastructure', v: 34.4, n: '$8.45B', c: PURPLE }, { label: 'Education', v: 18.8, n: '$4.62B', c: BLUE },
    { label: 'Health', v: 15.4, n: '$3.78B', c: CYAN }, { label: 'Social Services', v: 11.8, n: '$2.91B', c: TEAL },
    { label: 'Public Safety', v: 10.1, n: '$2.48B', c: AMBER }, { label: 'Other', v: 9.5, n: '$2.34B', c: '#5d6a77' },
  ];
  const projects = [
    { label: 'Completed', v: 33.9, n: '423', c: GREEN }, { label: 'In Progress', v: 41.0, n: '512', c: BLUE },
    { label: 'At Risk', v: 16.5, n: '206', c: AMBER }, { label: 'Not Started', v: 8.6, n: '107', c: MUT },
  ];
  const initiatives: [string, string, number, string, string][] = [
    ['National Digital Transformation', 'CIO Office', 78, 'On Track', '30 Jun 2025'],
    ['Sustainable Infrastructure Program', 'Ministry of Works', 65, 'On Track', '31 Aug 2025'],
    ['Healthcare Access for All', 'Ministry of Health', 52, 'At Risk', '30 Sep 2025'],
    ['Education Modernization', 'Ministry of Education', 80, 'On Track', '31 Jul 2025'],
    ['Green Economy Initiative', 'Ministry of Environment', 45, 'At Risk', '31 Oct 2025'],
  ];
  const tasks: [string, string, string, string, string][] = [
    ['Review Q2 Budget Reallocation Proposal', 'Finance Department', 'Due: 19 May 2025', 'High', RED],
    ['Approve Infrastructure Project Milestone', 'Ministry of Works', 'Due: 20 May 2025', 'Medium', AMBER],
    ['Policy Update: Data Protection Act', 'Legal Affairs', 'Due: 22 May 2025', 'Medium', AMBER],
    ['Review Monthly Performance Report', 'Strategy & Planning', 'Due: 23 May 2025', 'Low', BLUE],
  ];
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const trA = waveSeries(`eo:ta:${ID}`, ts, 6, 55, 92).map((v, i) => Math.round(v + i * 2));
  const trB = waveSeries(`eo:tb:${ID}`, ts, 6, 40, 70).map((v, i) => Math.round(v + i * 1.5));

  return (
    <div className="min-h-screen space-y-3 p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: `linear-gradient(135deg,${CYAN},${PURPLE})` }} aria-hidden>♛</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Governance Platform</div>
            <div className="text-[9px]" style={{ color: MUT }}>One Nation. One Data. Better Outcomes.</div>
          </div>
        </div>
        <div>
          <div className="text-[20px] font-bold leading-tight" style={{ color: INK }}>Executive Overview</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>Real-time insights for data-driven governance and decision making.</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10.5px]">
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⌖ All Jurisdictions ▾</span>
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}</span>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⛁<span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[8px] font-bold text-white" style={{ background: RED }}>8</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: CYAN }}>SG</span>
            <span><span className="block font-medium" style={{ color: INK }}>Secretary General</span><span style={{ color: MUT }}>Office of the Executive</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, n, c], i) => (
          <div key={l} className="relative overflow-hidden rounded-lg border p-3.5" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg text-[12px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>◈</span>
              <span className="text-[10px]" style={{ color: MUT }}>{l}</span>
            </div>
            <div className="mt-1.5 text-[20px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
            <div className="text-[8.5px]" style={{ color: c }}>{n}</div>
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="mt-1 h-4 w-full" aria-hidden>
              <polyline points={waveSeries(`eo:k${i}:${ID}`, ts, 20, 4, 16).map((p, j) => `${(j / 19) * 100},${18 - p}`).join(' ')}
                fill="none" stroke={c} strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.7" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── Row 1: map + rail ──────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <Card title="National Performance Map" sub="Performance index by region" action="View by: Performance Index ▾">
          <PerfMap />
        </Card>
        <div className="space-y-3">
          <Card title="Strategic Alerts" action="View All">
            <div className="space-y-2.5">
              {alerts.map(([sv, t, ctx, tag, c]) => (
                <div key={t} className="flex items-start gap-2.5 text-[10px]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>⚠</span>
                  <div className="min-w-0 flex-1"><div className="truncate" style={{ color: INK }}>{t}</div><div className="text-[8.5px]" style={{ color: MUT }}>{ctx}</div></div>
                  <span className="shrink-0 text-[8.5px] font-semibold" style={{ color: c }}>{tag}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Latest Announcements" action="View All">
            <div className="space-y-2.5">
              {announcements.map(([t, d, dt]) => (
                <div key={t} className="flex gap-2.5">
                  <span className="grid h-9 w-12 shrink-0 place-items-center rounded-md text-[12px]" style={{ background: PANEL2, color: CYAN }} aria-hidden>▤</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-semibold" style={{ color: INK }}>{t}</span><span className="shrink-0 text-[8px]" style={{ color: MUT }}>{dt}</span></div>
                    <div className="text-[8.5px]" style={{ color: MUT }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Row 2: budget / projects / trend ───────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Budget Overview" sub="FY 2025" action="View Details">
          <Donut top="$24.58B" sub="Total Budget" segs={budget} />
          <div className="mt-3 flex justify-between border-t pt-2 text-[9px]" style={{ borderColor: LINE2 }}>
            <span style={{ color: MUT }}>Utilized <span style={{ color: GREEN }}>$16.81B (68.4%)</span></span>
            <span style={{ color: MUT }}>Remaining <span style={{ color: BLUE }}>$7.77B (31.6%)</span></span>
          </div>
        </Card>
        <Card title="Project Status" action="View All">
          <Donut top="1,248" sub="Total Projects" segs={projects} />
        </Card>
        <Card title="Performance Trend" action="View Full Report">
          <svg viewBox="0 0 100 56" preserveAspectRatio="none" style={{ width: '100%', height: 168 }} aria-hidden>
            {[14, 28, 42].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={LINE2} strokeWidth="0.4" />)}
            {[trA, trB].map((s, si) => {
              const xy = s.map((p, i) => [(i / (s.length - 1)) * 100, 52 - (p / 100) * 46] as [number, number]);
              return (
                <React.Fragment key={si}>
                  <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={si === 0 ? GREEN : BLUE}
                    strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeDasharray={si === 1 ? '3 2' : undefined} strokeLinejoin="round" />
                  {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" fill={si === 0 ? GREEN : BLUE} vectorEffect="non-scaling-stroke" />)}
                </React.Fragment>
              );
            })}
          </svg>
          <div className="mt-1 flex justify-between text-[8px]" style={{ color: MUT }}>{months.map(m => <span key={m}>{m}</span>)}</div>
          <div className="mt-1.5 flex gap-4 text-[8.5px]" style={{ color: SOFT }}>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: GREEN }} />Overall Performance Index</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: BLUE }} />Service Delivery Score</span>
          </div>
        </Card>
      </div>

      {/* ── Row 3: initiatives / tasks ─────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Top Strategic Initiatives" action="View All">
          <div className="flex border-b pb-1.5 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE2 }}>
            <span className="flex-1">Initiative</span><span className="w-36">Owner</span><span className="w-28 px-2">Progress</span>
            <span className="w-16">Status</span><span className="w-20 text-right">Target Date</span>
          </div>
          <div className="mt-1.5 space-y-2">
            {initiatives.map(([nm, own, pr, st, dt]) => {
              const c = st === 'On Track' ? GREEN : AMBER;
              return (
                <div key={nm} className="flex items-center text-[9.5px]">
                  <span className="min-w-0 flex-1 truncate" style={{ color: INK }}>{nm}</span>
                  <span className="w-36 truncate" style={{ color: SOFT }}>{own}</span>
                  <span className="flex w-28 items-center gap-1.5 px-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#1a212c' }}><span className="block h-full rounded-full" style={{ width: `${pr}%`, background: c }} /></span>
                    <span className="tabular-nums" style={{ color: SOFT }}>{pr}%</span>
                  </span>
                  <span className="w-16 text-[8.5px] font-semibold" style={{ color: c }}>● {st}</span>
                  <span className="w-20 text-right tabular-nums" style={{ color: MUT }}>{dt}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="My Tasks" action="View All">
          <div className="space-y-2">
            {tasks.map(([t, dep, due, pr, c]) => (
              <div key={t} className="flex items-center gap-2.5 rounded-lg border px-3 py-2" style={{ borderColor: LINE2, background: PANEL2 }}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px]" style={{ background: `color-mix(in srgb,${c} 16%,${PANEL})`, color: c }} aria-hidden>▤</span>
                <div className="min-w-0 flex-1"><div className="truncate text-[10px]" style={{ color: INK }}>{t}</div><div className="text-[8.5px]" style={{ color: MUT }}>{dep} · {due}</div></div>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ color: c, background: `color-mix(in srgb,${c} 16%,${PANEL})` }}>{pr}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[9.5px]" style={{ borderColor: LINE2, color: MUT }}>
        <span><span style={{ color: GREEN }}>●</span> All Systems Operational</span>
        <span>Performance Index {opi} · Uptime 99.97% · Citizen Satisfaction 82.1% · Last Updated {tm}</span>
      </div>
    </div>
  );
}
