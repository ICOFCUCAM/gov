'use client';

// Strategic Dashboard — National Governance Platform strategic-intelligence
// surface. Dense dark decision-support console modelled on the benchmark:
// KPI strip with sparklines, strategic risk heat map, strategic-objectives
// progress, early-warning alerts, performance trends, resource allocation,
// scenario analysis, top strategic initiatives and national benchmarking.
// Pure & deterministic — telemetry only. Self-contained (own chrome).

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
const ORANGE = '#e07a3a';
const RED = '#e0685f';
const INK = '#d8e0e8';
const SOFT = '#8c99a7';
const MUT = '#5d6a77';

const ID = 'std';

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

function Donut({ segs, top, sub, size = 132 }: { segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string; size?: number }) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1, r = size / 2 - 11, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a212c" strokeWidth="11" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="11"
            strokeDasharray={`${Math.max(0, fr * circ - 2)} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize="17" fontWeight="700" fill={INK}>{top}</text>
        <text x="50%" y="58%" textAnchor="middle" fontSize="7" fill={MUT}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[9.5px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-12 text-right tabular-nums" style={{ color: MUT }}>({Math.round((s.v / sum) * 1000) / 10}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskMap() {
  const badges: [number, number, number][] = [
    [32, 30, 32], [50, 24, 56], [40, 42, 48], [60, 44, 71], [76, 50, 43], [30, 56, 37], [50, 64, 65], [66, 70, 28],
  ];
  const col = (v: number) => v >= 70 ? RED : v >= 50 ? ORANGE : v >= 30 ? AMBER : v >= 10 ? '#9bbf3a' : GREEN;
  const cells = Array.from({ length: 48 }).map((_, i) => {
    const v = seed(`sd:rm:${ID}:${i}`) * 100;
    return col(v);
  });
  return (
    <div className="flex gap-4">
      <div className="relative min-w-0 flex-1">
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(8,1fr)' }} aria-hidden>
          {cells.map((c, i) => (
            <span key={i} style={{ aspectRatio: '1', background: c, opacity: 0.42 + (i % 5) * 0.1,
              clipPath: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)' }} />
          ))}
        </div>
        {badges.map(([x, y, v], i) => (
          <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full border text-[10px] font-bold tabular-nums"
            style={{ left: `${x}%`, top: `${y}%`, borderColor: col(v), background: 'rgba(13,19,28,0.85)', color: col(v) }}>{v}</div>
        ))}
      </div>
      <div className="w-28 shrink-0 text-[8.5px]">
        <div className="mb-1 font-semibold" style={{ color: INK }}>Risk Level</div>
        {[['Very High (70-100)', RED], ['High (50-69)', ORANGE], ['Medium (30-49)', AMBER], ['Low (10-29)', '#9bbf3a'], ['Very Low (0-9)', GREEN]].map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5 py-0.5" style={{ color: SOFT }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</div>
        ))}
      </div>
    </div>
  );
}

export function StrategicDashboard() {
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
  const nri = (73 + wave(`sd:ri:${ID}`, ts, 0, 3)).toFixed(1);

  const kpis: [string, string, string, string][] = [
    ['National Resilience Index', nri, '↑ 4.2 vs last month', GREEN],
    ['Economic Health Score', '68.3', '↑ 3.1 vs last month', BLUE],
    ['Social Progress Index', '72.8', '↑ 2.7 vs last month', PURPLE],
    ['Environmental Index', '65.4', '↑ 1.8 vs last month', TEAL],
    ['Governance Effectiveness', '78.9', '↑ 3.6 vs last month', AMBER],
    ['Overall Strategic Score', '72.0', '↑ 3.1 vs last month', CYAN],
  ];

  const objectives = [
    { label: 'On Track', v: 41.7, n: '10', c: GREEN }, { label: 'At Risk', v: 25.0, n: '6', c: AMBER },
    { label: 'Behind', v: 20.8, n: '5', c: RED }, { label: 'Not Started', v: 12.5, n: '3', c: MUT },
  ];
  const topObj: [string, number, string][] = [
    ['Digital Transformation', 78, GREEN], ['Sustainable Infrastructure', 65, BLUE],
    ['Education Excellence', 58, AMBER], ['Healthcare Access', 42, ORANGE], ['Economic Diversification', 35, RED],
  ];
  const warnings: [string, string, string, string, string][] = [
    ['High inflation risk detected', 'Economic Stability', '10:21 AM', 'High', RED],
    ['Cyber threat level elevated', 'National Security', '09:48 AM', 'High', RED],
    ['Drought conditions worsening', 'Environmental Risk', '09:15 AM', 'Medium', AMBER],
    ['Supply chain disruption possible', 'Operational Risk', '08:42 AM', 'Medium', AMBER],
    ['Public sentiment declining', 'Social Stability', '08:10 AM', 'Low', BLUE],
  ];
  const trends: [string, string][] = [
    ['Economic Health', BLUE], ['Social Progress', PURPLE], ['Environmental Index', TEAL], ['Governance Effectiveness', AMBER],
  ];
  const months = ['Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025'];
  const resAlloc = [
    { label: 'Infrastructure', v: 43.1, n: '$18.4B', c: BLUE }, { label: 'Education', v: 20.4, n: '$8.7B', c: PURPLE },
    { label: 'Healthcare', v: 16.2, n: '$6.9B', c: CYAN }, { label: 'Social Services', v: 9.8, n: '$4.2B', c: GREEN },
    { label: 'Others', v: 10.5, n: '$4.5B', c: AMBER },
  ];
  const scenario: [string, string, string, string][] = [
    ['GDP Growth', '-1.2%', '-2.8%', '-4.6%'], ['Employment Rate', '-0.8%', '-1.9%', '-3.1%'],
    ['Government Revenue', '-3.2%', '-6.5%', '-9.8%'], ['Social Stability Index', '-1.5%', '-3.6%', '-6.2%'],
    ['Overall Risk Level', 'Medium', 'High', 'Very High'],
  ];
  const initiatives: [string, string, number, string, string, string, string, string][] = [
    ['National Digital Infrastructure', 'Ministry of IT', 78, 'On Track', '$6.2B', '$4.1B', '18.7%', '30 Sep 2025'],
    ['Green Energy Transition', 'Ministry of Energy', 65, 'On Track', '$5.8B', '$3.8B', '15.3%', '31 Dec 2025'],
    ['Smart Education Program', 'Ministry of Education', 58, 'At Risk', '$3.9B', '$2.1B', '12.1%', '30 Nov 2025'],
    ['Universal Healthcare Access', 'Ministry of Health', 42, 'Behind', '$7.1B', '$2.9B', '8.6%', '31 Mar 2026'],
    ['Rural Connectivity Initiative', 'Ministry of Rural Dev.', 35, 'Behind', '$2.8B', '$1.0B', '6.2%', '30 Jun 2026'],
  ];
  const stC: Record<string, string> = { 'On Track': GREEN, 'At Risk': AMBER, Behind: RED };
  const bench: [string, string, string, string, string][] = [
    ['Economic Competitiveness', '68.3', '82.1', '56.4', '72nd'],
    ['Innovation Index', '71.2', '88.7', '48.9', '68th'],
    ['Human Development', '72.8', '85.3', '60.1', '71st'],
    ['Environmental Performance', '65.4', '83.6', '49.2', '62nd'],
    ['Governance Quality', '78.9', '91.4', '63.7', '74th'],
  ];

  return (
    <div className="min-h-screen space-y-3 p-3" style={{ background: BG, color: INK }}>
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
          <div className="text-[20px] font-bold leading-tight" style={{ color: INK }}>Strategic Dashboard</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>Real-time intelligence for strategic decision making</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10.5px]">
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⌖ All Jurisdictions ▾</span>
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}</span>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⛁<span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[8px] font-bold text-white" style={{ background: RED }}>7</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: CYAN }}>AM</span>
            <span><span className="block font-medium" style={{ color: INK }}>Dr. Arjun Mehta</span><span style={{ color: MUT }}>Chief Strategy Officer</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, n, c], i) => (
          <div key={l} className="relative overflow-hidden rounded-lg border p-3.5" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg text-[12px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>◈</span>
              <span className="text-[9.5px]" style={{ color: MUT }}>{l}</span>
            </div>
            <div className="mt-1.5 text-[19px] font-bold tabular-nums" style={{ color: INK }}>{v}<span className="text-[9px]" style={{ color: MUT }}> /100</span></div>
            <div className="text-[8.5px]" style={{ color: GREEN }}>{n}</div>
            <svg viewBox="0 0 100 18" preserveAspectRatio="none" className="mt-1 h-4 w-full" aria-hidden>
              <polyline points={waveSeries(`sd:k${i}:${ID}`, ts, 20, 3, 15).map((p, j) => `${(j / 19) * 100},${16 - p}`).join(' ')}
                fill="none" stroke={c} strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.7" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Card title="Strategic Risk Heat Map" sub="Current risk exposure by region">
          <RiskMap />
          <div className="mt-2 border-t pt-2 text-right text-[8px]" style={{ borderColor: LINE2, color: MUT }}>Data refreshed {tm}</div>
        </Card>
        <Card title="Strategic Objectives Progress" action="View All">
          <Donut top="24" sub="Total Objectives" segs={objectives} />
          <div className="mt-3 border-t pt-2" style={{ borderColor: LINE2 }}>
            <div className="mb-1.5 text-[8.5px] uppercase tracking-wider" style={{ color: MUT }}>Top Objectives</div>
            <div className="space-y-1.5">
              {topObj.map(([nm, pr, c]) => (
                <div key={nm} className="text-[9px]">
                  <div className="flex justify-between"><span style={{ color: SOFT }}>{nm}</span><span className="tabular-nums" style={{ color: INK }}>{pr}%</span></div>
                  <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ background: '#1a212c' }}><span className="block h-full rounded-full" style={{ width: `${pr}%`, background: c }} /></div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="Early Warning Alerts" action="View All">
          <div className="space-y-2">
            {warnings.map(([t, ctx, ago, sv, c]) => (
              <div key={t} className="flex items-start gap-2.5 text-[9.5px]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>⚠</span>
                <div className="min-w-0 flex-1"><div className="truncate" style={{ color: INK }}>{t}</div><div className="text-[8px]" style={{ color: MUT }}>{ctx}</div></div>
                <div className="shrink-0 text-right"><div className="text-[8px] font-semibold" style={{ color: c }}>{sv}</div><div className="text-[7.5px]" style={{ color: MUT }}>{ago}</div></div>
              </div>
            ))}
            <div className="text-[9px] font-medium" style={{ color: CYAN }}>View All Alerts →</div>
          </div>
        </Card>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Performance Trends" sub="Key dimension trend" action="6 Months ▾">
          <svg viewBox="0 0 100 52" preserveAspectRatio="none" style={{ width: '100%', height: 168 }} aria-hidden>
            {[10, 22, 34, 46].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={LINE2} strokeWidth="0.4" />)}
            {trends.map(([nm, c], si) => {
              const pts = waveSeries(`sd:t${si}:${ID}`, ts, 6, 30 + si * 6, 72 + si * 4).map((v, i) => v + i * 2);
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
            {trends.map(([nm, c]) => <span key={nm} className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full" style={{ background: c }} />{nm}</span>)}
          </div>
        </Card>
        <Card title="Resource Allocation" sub="FY 2025" action="View Report">
          <Donut top="$42.7B" sub="Total Allocation" segs={resAlloc} />
          <div className="mt-3 border-t pt-2" style={{ borderColor: LINE2 }}>
            <div className="flex justify-between text-[9px]"><span style={{ color: MUT }}>Budget Utilization</span><span className="font-semibold" style={{ color: INK }}>68.3%</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: '#1a212c' }}><span className="block h-full rounded-full" style={{ width: '68.3%', background: GREEN }} /></div>
            <div className="mt-1 text-right text-[8px]" style={{ color: MUT }}>$29.1B / $42.7B</div>
          </div>
        </Card>
        <Card title="Scenario Analysis" action="View All">
          <div className="mb-2 flex items-center gap-2 text-[9px]"><span style={{ color: MUT }}>Select Scenario</span><span className="rounded border px-2 py-1" style={{ borderColor: LINE2, background: PANEL2, color: INK }}>Economic Downturn ▾</span></div>
          <div className="flex border-b pb-1 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE2 }}>
            <span className="flex-1">Impact Area</span><span className="w-16 text-right">Low</span><span className="w-16 text-right">Moderate</span><span className="w-16 text-right">High</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {scenario.map(([area, lo, mo, hi]) => {
              const isLvl = area === 'Overall Risk Level';
              const pill = (v: string, c: string) => isLvl ? <span className="rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ color: c, background: `color-mix(in srgb,${c} 16%,${PANEL})` }}>{v}</span> : <span className="tabular-nums" style={{ color: c }}>{v}</span>;
              return (
                <div key={area} className="flex items-center text-[9px]">
                  <span className="flex-1" style={{ color: SOFT }}>{area}</span>
                  <span className="w-16 text-right">{pill(lo, isLvl ? AMBER : SOFT)}</span>
                  <span className="w-16 text-right">{pill(mo, isLvl ? ORANGE : AMBER)}</span>
                  <span className="w-16 text-right">{pill(hi, isLvl ? RED : RED)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 grid place-items-center rounded-lg border py-1.5 text-[9px] font-medium" style={{ borderColor: LINE2, color: CYAN }}>⚙ Run Custom Scenario</div>
        </Card>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.25fr_1fr]">
        <Card title="Top Strategic Initiatives" action="View All">
          <div className="flex border-b pb-1.5 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE2 }}>
            <span className="flex-1">Initiative · Owner</span><span className="w-24 px-2">Progress</span><span className="w-14">Status</span>
            <span className="w-12 text-right">Budget</span><span className="w-12 text-right">Spent</span><span className="w-12 text-right">ROI</span><span className="w-20 text-right">Target</span>
          </div>
          <div className="mt-1.5 space-y-2">
            {initiatives.map(([nm, own, pr, st, bud, spent, roi, tgt]) => (
              <div key={nm} className="flex items-center text-[9px]">
                <div className="min-w-0 flex-1"><div className="truncate" style={{ color: INK }}>{nm}</div><div className="text-[7.5px]" style={{ color: MUT }}>{own}</div></div>
                <span className="flex w-24 items-center gap-1 px-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#1a212c' }}><span className="block h-full rounded-full" style={{ width: `${pr}%`, background: stC[st] }} /></span>
                  <span className="tabular-nums" style={{ color: SOFT }}>{pr}%</span>
                </span>
                <span className="w-14 text-[8px] font-semibold" style={{ color: stC[st] }}>● {st}</span>
                <span className="w-12 text-right tabular-nums" style={{ color: SOFT }}>{bud}</span>
                <span className="w-12 text-right tabular-nums" style={{ color: SOFT }}>{spent}</span>
                <span className="w-12 text-right tabular-nums" style={{ color: GREEN }}>{roi}</span>
                <span className="w-20 text-right tabular-nums" style={{ color: MUT }}>{tgt}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="National Benchmarking" action="View Full Benchmark">
          <div className="flex border-b pb-1.5 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE2 }}>
            <span className="flex-1">Indicator</span><span className="w-16 text-right">Our Nation</span><span className="w-16 text-right">Top Perf.</span>
            <span className="w-16 text-right">Global Avg</span><span className="w-14 text-right">Percentile</span>
          </div>
          <div className="mt-1.5 space-y-2.5">
            {bench.map(([ind, our, top, avg, pct]) => (
              <div key={ind} className="flex items-center text-[9px]">
                <span className="min-w-0 flex-1 truncate" style={{ color: INK }}>{ind}</span>
                <span className="w-16 text-right font-semibold tabular-nums" style={{ color: BLUE }}>{our}</span>
                <span className="w-16 text-right tabular-nums" style={{ color: GREEN }}>{top}</span>
                <span className="w-16 text-right tabular-nums" style={{ color: SOFT }}>{avg}</span>
                <span className="w-14 text-right tabular-nums" style={{ color: AMBER }}>{pct}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[9.5px]" style={{ borderColor: LINE2, color: MUT }}>
        <span><span style={{ color: GREEN }}>●</span> All Systems Operational</span>
        <span>Platform Uptime 99.97% · Resilience {nri} · Strategic Score 72.0 · Last Updated {tm}</span>
      </div>
    </div>
  );
}
