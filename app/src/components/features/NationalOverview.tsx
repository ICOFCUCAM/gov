'use client';

// National Overview — National Governance Platform apex unified-insights
// surface. Dense dark whole-of-nation console modelled on the benchmark:
// KPI strip with sparklines, performance-over-time multi-line trend,
// initiative-coverage region map, critical alerts, budget & project
// donuts, risk heat map, top initiatives, citizen feedback, recent
// activities, upcoming deadlines and a month calendar. Pure &
// deterministic — telemetry only. Self-contained (rendered in shell).

import * as React from 'react';
import { wave, waveSeries, seed } from '@/lib/telemetry';

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
const ORANGE = '#e07a3a';
const RED = '#e0685f';
const INK = '#d8e0e8';
const SOFT = '#8c99a7';
const MUT = '#5d6a77';

const ID = 'nov';

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

function Donut({ segs, top, sub, size = 138 }: { segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string; size?: number }) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1, r = size / 2 - 12, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a212c" strokeWidth="12" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="12"
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

function CoverageMap() {
  const cells = Array.from({ length: 36 }).map((_, i) => {
    const v = seed(`no:cv:${ID}:${i}`);
    return v > 0.78 ? GREEN : v > 0.5 ? BLUE : v > 0.28 ? PURPLE : '#3a4a6a';
  });
  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(6,1fr)' }} aria-hidden>
        {cells.map((c, i) => (
          <span key={i} style={{ aspectRatio: '1', background: c, opacity: 0.55 + (i % 4) * 0.12,
            clipPath: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)' }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1 text-[8.5px]" style={{ color: SOFT }}>
        {[['Excellent (90%+)', GREEN], ['Good (70 - 89%)', BLUE], ['Average (50 - 69%)', PURPLE], ['Below Average (<50%)', '#3a4a6a']].map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </div>
  );
}

export function NationalOverview() {
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
  const gdp = (4.5 + wave(`no:gd:${ID}`, ts, 0, 0.6)).toFixed(1);

  const kpis: [string, string, string, string][] = [
    ['GDP Growth (Q1 2025)', `${gdp}%`, '↑ 0.6 pp vs Q4 2024', CYAN],
    ['Budget Utilization', '68.3%', '↑ 5.2% vs last month', GREEN],
    ['Active Policies', '1,247', '↑ 32 new this month', PURPLE],
    ['Citizen Satisfaction', '82.1%', '↑ 3.4% vs last month', AMBER],
    ['Service Delivery Index', '91.7%', '↑ 4.1% vs last month', CYAN],
    ['National Risk Level', 'Low', '◉ Stable', GREEN],
  ];

  const series: [string, string][] = [
    ['Service Delivery Index', BLUE], ['Citizen Satisfaction', GREEN], ['Budget Utilization', PURPLE],
    ['Policy Compliance', AMBER], ['Risk Score (inverted)', CYAN],
  ];
  const months = ['Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025'];

  const alerts: [string, string, string, string][] = [
    ['Budget overrun in Infrastructure Program', 'Finance · Region 3', '10:21 AM', RED],
    ['High risk identified in Data Security', 'IT Security · National', '09:47 AM', AMBER],
    ['Policy compliance below threshold', 'Health Department · Region 7', '08:35 AM', AMBER],
    ['System maintenance scheduled', '18 May 2025, 02:00 AM', 'Info', BLUE],
  ].map(a => a as [string, string, string, string]);
  const budget = [
    { label: 'Allocated', v: 100, n: '$42.7B', c: PURPLE }, { label: 'Utilized', v: 68.3, n: '$29.1B', c: GREEN },
    { label: 'Committed', v: 20.4, n: '$8.7B', c: BLUE }, { label: 'Remaining', v: 11.3, n: '$4.9B', c: CYAN },
  ];
  const projects = [
    { label: 'Completed', v: 36, n: '248', c: GREEN }, { label: 'In Progress', v: 36, n: '247', c: BLUE },
    { label: 'At Risk', v: 17, n: '118', c: AMBER }, { label: 'Not Started', v: 11, n: '76', c: MUT },
  ];
  const heat = [
    [2, 4, 7, 10, 6], [1, 3, 6, 9, 5], [1, 2, 5, 4, 2], [0, 1, 3, 4, 2], [0, 0, 1, 2, 1],
  ];
  const heatC = (v: number) => v >= 8 ? RED : v >= 5 ? ORANGE : v >= 3 ? AMBER : v >= 1 ? '#3f7a5a' : '#1f3a4a';
  const initiatives: [string, number, string][] = [
    ['Digital Government Expansion', 78, BLUE], ['Healthcare Accessibility', 65, GREEN],
    ['Education Excellence Program', 54, PURPLE], ['Sustainable Infrastructure', 60, TEAL], ['Cybersecurity Enhancement', 72, CYAN],
  ];
  const feedback: [string, number][] = [['5 Stars', 57], ['4 Stars', 28], ['3 Stars', 10], ['2 Stars', 3], ['1 Star', 2]];
  const activities: [string, string][] = [
    ["New policy 'Data Protection Act' published", '17 May 2025, 09:15 AM'],
    ['Infrastructure Project Phase 2 completed', '16 May 2025, 04:30 PM'],
    ['Budget reallocation approved', '16 May 2025, 11:20 AM'],
    ['Public consultation on Education Policy', '15 May 2025, 02:45 PM'],
    ['System security update completed', '15 May 2025, 01:10 AM'],
  ];
  const deadlines: [string, string, string, string, string][] = [
    ['MAY 20', 'Quarterly Performance Report', 'Due in 3 days', 'High', RED],
    ['MAY 25', 'Budget Review Meeting', 'Due in 8 days', 'Medium', AMBER],
    ['MAY 31', 'Policy Compliance Audit', 'Due in 14 days', 'High', RED],
    ['JUN 05', 'Annual Strategic Review', 'Due in 19 days', 'Medium', AMBER],
  ];
  const calCells = Array.from({ length: 35 }).map((_, i) => { const d = i - 3; return d >= 1 && d <= 31 ? d : null; });

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: '#070b12', color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: `linear-gradient(135deg,${CYAN},${PURPLE})` }} aria-hidden>♛</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Governance Platform</div>
            <div className="text-[9px]" style={{ color: MUT }}>One Nation. One Platform. One Future.</div>
          </div>
        </div>
        <div>
          <div className="text-[20px] font-bold leading-tight" style={{ color: INK }}>National Overview</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>Unified insights for a stronger nation</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10.5px]">
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}</span>
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: MUT }}>⌕ Search across platform…</span>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⛁<span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[8px] font-bold text-white" style={{ background: RED }}>6</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: CYAN }}>AK</span>
            <span><span className="block font-medium" style={{ color: INK }}>Ayesha Khan</span><span style={{ color: MUT }}>National Administrator</span></span>
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
              <polyline points={waveSeries(`no:k${i}:${ID}`, ts, 20, 4, 16).map((p, j) => `${(j / 19) * 100},${18 - p}`).join(' ')}
                fill="none" stroke={c} strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.7" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr]">
        <Card title="Performance Over Time" sub="Key performance indicators trend" action="6 Months ▾">
          <svg viewBox="0 0 100 52" preserveAspectRatio="none" style={{ width: '100%', height: 184 }} aria-hidden>
            {[10, 22, 34, 46].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={LINE2} strokeWidth="0.4" />)}
            {series.map(([nm, c], si) => {
              const pts = waveSeries(`no:s${si}:${ID}`, ts, 6, 28 + si * 6, 78 + si * 4).map((v, i) => v + i * 2);
              const xy = pts.map((p, i) => [(i / 5) * 100, 50 - (p / 100) * 46] as [number, number]);
              return (
                <React.Fragment key={nm}>
                  <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={c} strokeWidth="1.3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                  {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill={c} vectorEffect="non-scaling-stroke" />)}
                </React.Fragment>
              );
            })}
          </svg>
          <div className="mt-1 flex justify-between text-[8px]" style={{ color: MUT }}>{months.map(m => <span key={m}>{m}</span>)}</div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[8px]" style={{ color: SOFT }}>
            {series.map(([nm, c]) => <span key={nm} className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full" style={{ background: c }} />{nm}</span>)}
          </div>
        </Card>
        <Card title="Initiative Coverage" sub="Coverage across regions" action="View Map">
          <CoverageMap />
        </Card>
        <Card title="Critical Alerts" action="View All">
          <div className="space-y-2.5">
            {alerts.map(([t, ctx, ago, c]) => (
              <div key={t} className="flex items-start gap-2.5 text-[10px]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>⚠</span>
                <div className="min-w-0 flex-1"><div className="truncate" style={{ color: INK }}>{t}</div><div className="text-[8.5px]" style={{ color: MUT }}>{ctx}</div></div>
                <span className="shrink-0 text-[8px]" style={{ color: MUT }}>{ago}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-4">
        <Card title="Budget Overview" sub="FY 2025" action="View Details">
          <Donut top="$42.7B" sub="Total Budget" segs={budget} />
          <div className="mt-2 border-t pt-2 text-[8px]" style={{ borderColor: LINE2, color: MUT }}>Last Updated: {dd} {tm}</div>
        </Card>
        <Card title="Project Status" action="View All">
          <Donut top="689" sub="Total Projects" segs={projects} />
        </Card>
        <Card title="Risk Heat Map" action="View All">
          <div className="flex gap-1">
            <div className="flex flex-col justify-between py-1 text-[7px]" style={{ color: MUT }}>
              {['High', '', 'Medium', '', 'Low'].map((l, i) => <span key={i} className="h-5">{l}</span>)}
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-1">
                {heat.flat().map((v, i) => (
                  <span key={i} className="grid h-5 place-items-center rounded text-[8px] font-bold" style={{ background: heatC(v), color: '#fff' }}>{v}</span>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[7px]" style={{ color: MUT }}>
                {['1 Low', '2', 'Medium', '4', '5 High'].map(l => <span key={l}>{l}</span>)}
              </div>
              <div className="mt-0.5 text-center text-[7px]" style={{ color: MUT }}>Likelihood</div>
            </div>
          </div>
          <div className="mt-1 text-center text-[7px]" style={{ color: MUT }}>← Impact</div>
        </Card>
        <Card title="Top Initiatives" action="View All">
          <div className="space-y-2">
            {initiatives.map(([nm, pr, c]) => (
              <div key={nm} className="text-[9px]">
                <div className="flex justify-between"><span style={{ color: SOFT }}>{nm}</span><span className="tabular-nums" style={{ color: INK }}>{pr}%</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: '#1a212c' }}><span className="block h-full rounded-full" style={{ width: `${pr}%`, background: c }} /></div>
              </div>
            ))}
            <div className="text-[9px] font-medium" style={{ color: CYAN }}>See all initiatives →</div>
          </div>
        </Card>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-4">
        <Card title="Citizen Feedback" action="View All">
          <div className="flex items-center gap-3">
            <div className="text-center"><div className="text-[24px] font-bold" style={{ color: INK }}>4.6</div><div className="text-[11px]" style={{ color: AMBER }}>★★★★★</div><div className="text-[8px]" style={{ color: MUT }}>Average Rating</div></div>
            <div className="min-w-0 flex-1 space-y-1">
              {feedback.map(([l, p]) => (
                <div key={l} className="flex items-center gap-2 text-[8.5px]">
                  <span className="w-12 shrink-0" style={{ color: MUT }}>{l}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#1a212c' }}><span className="block h-full rounded-full" style={{ width: `${p}%`, background: AMBER }} /></span>
                  <span className="w-8 text-right tabular-nums" style={{ color: SOFT }}>{p}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 text-[8.5px]" style={{ borderColor: LINE2, color: MUT }}>
            <span>Total Responses</span><span style={{ color: INK }}>12,458 <span style={{ color: GREEN }}>↑ 8.2%</span></span>
          </div>
        </Card>
        <Card title="Recent Activities" action="View All">
          <div className="space-y-2">
            {activities.map(([t, dt]) => (
              <div key={t} className="flex items-start gap-2 text-[9px]">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: CYAN }} />
                <div className="min-w-0 flex-1"><div className="truncate" style={{ color: SOFT }}>{t}</div><div className="text-[7.5px]" style={{ color: MUT }}>{dt}</div></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Upcoming Deadlines">
          <div className="space-y-2">
            {deadlines.map(([dt, t, due, pr, c]) => (
              <div key={t} className="flex items-center gap-2.5 text-[9.5px]">
                <div className="grid w-12 shrink-0 place-items-center rounded-md py-1 text-center" style={{ background: PANEL2 }}>
                  <span className="text-[7px]" style={{ color: MUT }}>{dt.split(' ')[0]}</span>
                  <span className="text-[13px] font-bold leading-none" style={{ color: INK }}>{dt.split(' ')[1]}</span>
                </div>
                <div className="min-w-0 flex-1"><div className="truncate" style={{ color: INK }}>{t}</div><div className="text-[8px]" style={{ color: MUT }}>{due}</div></div>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ color: c, background: `color-mix(in srgb,${c} 16%,${PANEL})` }}>{pr}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="May 2025">
          <div className="grid grid-cols-7 gap-1 text-center text-[8px]" style={{ color: MUT }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d}>{d}</span>)}
            {calCells.map((d, i) => (
              <span key={i} className="grid h-6 place-items-center rounded"
                style={{ color: d === 17 ? '#fff' : d ? SOFT : 'transparent', background: d === 17 ? BLUE : 'transparent' }}>{d ?? '·'}</span>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[9.5px]" style={{ borderColor: LINE2, color: MUT }}>
        <span>© 2025 National Governance Platform. All rights reserved.</span>
        <span>System Health Healthy · Uptime 99.98% · GDP {gdp}% · Privacy · Terms · Accessibility · Updated {tm}</span>
      </div>
    </div>
  );
}
