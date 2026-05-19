'use client';

// Regional Administration — National Governance Platform. Light, modern
// territorial-governance surface modelled on the benchmark: KPI strip,
// regional choropleth map, region performance ranking, province-health
// radar, regional operations & alerts rail, province-health indicator
// table, budget allocation by region and top regional projects. Pure &
// deterministic — engine + telemetry only.

import * as React from 'react';
import { interiorOps } from '@/lib/gov/interior-systems';
import { wave, seed } from '@/lib/telemetry';

const BG = '#f5f6fb';
const CARD = '#ffffff';
const LINE = '#e7e9f1';
const INK = '#1d2333';
const SOFT = '#56607a';
const MUT = '#8b94a8';
const NAVY = '#1e2a52';
const PURPLE = '#7c5cf0';
const BLUE = '#4f7df0';
const GREEN = '#2bb673';
const TEAL = '#27b3a6';
const AMBER = '#e0a13a';
const ORANGE = '#e07a3a';
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

function Kpi({ label, value, delta, dn, flat, sub, icon, c }: {
  label: string; value: string; delta?: string; dn?: boolean; flat?: boolean; sub?: string; icon: string; c: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: LINE, background: CARD, boxShadow: '0 1px 3px rgba(20,30,60,0.04)' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[15px]" style={{ background: `color-mix(in srgb,${c} 14%,#fff)`, color: c }} aria-hidden>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px]" style={{ color: MUT }}>{label}</div>
        <div className="text-[19px] font-bold tabular-nums" style={{ color: INK }}>{value}</div>
        <div className="text-[9px]" style={{ color: flat ? GREEN : dn ? RED : GREEN }}>
          {sub ? sub : <>{dn ? '↓' : '↑'} {delta} <span style={{ color: MUT }}>vs last month</span></>}
        </div>
      </div>
    </div>
  );
}

function RegionMap({ id, ts }: { id: string; ts: number }) {
  // Deterministic hex-cell choropleth of 24 regions.
  const tiers = [GREEN, TEAL, BLUE, AMBER, RED];
  const cells = Array.from({ length: 30 }).map((_, i) => {
    const v = wave(`ra:rm:${id}:${i}`, ts, 0, 1);
    const ti = v > 0.78 ? 0 : v > 0.55 ? 1 : v > 0.36 ? 2 : v > 0.18 ? 3 : 4;
    const val = 20 + Math.round(seed(`ra:rv:${id}:${i}`) * 79);
    return { c: tiers[ti], val };
  });
  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(6,1fr)' }} aria-hidden>
        {cells.map((cell, i) => (
          <span key={i} className="grid place-items-center text-[8px] font-semibold"
            style={{ aspectRatio: '1', color: '#fff', background: cell.c, opacity: 0.5 + (i % 5) * 0.1,
              clipPath: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)' }}>{cell.val}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px]" style={{ color: SOFT }}>
        {[['Excellent', GREEN], ['Good', TEAL], ['Moderate', BLUE], ['Needs Attention', AMBER], ['Critical', RED]].map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </div>
  );
}

function Radar({ a, b }: { a: number[]; b: number[] }) {
  const labels = ['Governance', 'Infrastructure', 'Economy', 'Public Services', 'Security', 'Environment'];
  const cx = 110, cy = 100, R = 74, N = 6;
  const pt = (i: number, v: number) => {
    const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [cx + Math.cos(ang) * R * (v / 100), cy + Math.sin(ang) * R * (v / 100)] as [number, number];
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  return (
    <div>
      <svg viewBox="0 0 220 200" style={{ width: '100%', height: 196 }} aria-hidden>
        {[25, 50, 75, 100].map(r => (
          <polygon key={r} points={labels.map((_, i) => pt(i, r).join(',')).join(' ')} fill="none" stroke="#eef0f6" strokeWidth="1" />
        ))}
        {labels.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#eef0f6" strokeWidth="1" />; })}
        <polygon points={poly(b)} fill="none" stroke={MUT} strokeWidth="1.2" strokeDasharray="3 2" />
        <polygon points={poly(a)} fill={`color-mix(in srgb,${TEAL} 18%,transparent)`} stroke={TEAL} strokeWidth="1.5" />
        {labels.map((l, i) => { const [x, y] = pt(i, 122); return <text key={l} x={x} y={y} textAnchor="middle" fontSize="7.5" fill={MUT}>{l}</text>; })}
      </svg>
      <div className="mt-1 flex justify-center gap-4 text-[9px]" style={{ color: SOFT }}>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: TEAL }} />Top Performing Region</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: MUT }} />National Average</span>
      </div>
    </div>
  );
}

export function RegionalAdministration({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const io = interiorOps(id, ts);
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const order = io.coordination.publicOrderIndex;
  const alerts = Math.round(wave(`ra:al:${id}`, ts, 60, 110));
  const programs = 1200 + Math.round(wave(`ra:pg:${id}`, ts, 0, 120));

  const kpis = [
    <Kpi key="tr" label="Total Regions" value="24" sub="100% Operational" icon="◈" c={BLUE} />,
    <Kpi key="tp" label="Total Population" value="84.27M" delta="1.35%" icon="☷" c={TEAL} />,
    <Kpi key="ap" label="Active Programs" value={programs.toLocaleString()} delta="6.2%" icon="▦" c={PURPLE} />,
    <Kpi key="ba" label="Budget Allocated" value="$12.48B" delta="6.2%" icon="◉" c={AMBER} />,
    <Kpi key="pp" label="Projects in Progress" value="2,341" delta="8.7%" icon="▤" c={GREEN} />,
    <Kpi key="ai" label="Alerts & Issues" value={String(alerts)} delta="12.5%" dn icon="⚠" c={RED} />,
  ];

  const ranking: [number, string, number, number][] = [
    [1, 'North Province', 87.4, 3], [2, 'Central Province', 82.1, 1], [3, 'East Province', 79.8, 2],
    [4, 'West Province', 74.6, -1], [5, 'South Province', 72.3, 1],
  ];
  const rankTail: [number, string, number, number][] = [
    [23, 'Frontier Province', 52.6, -1], [24, 'Highland Province', 48.3, 0],
  ];

  const indicators: [string, number, number, number, number, number, number, number, number][] = [
    ['North Province', 85, 88, 84, 86, 90, 82, 87.4, 3],
    ['Central Province', 82, 83, 81, 85, 88, 74, 82.1, 1],
    ['East Province', 78, 76, 81, 80, 82, 81, 79.8, 2],
    ['West Province', 75, 70, 76, 77, 79, 71, 74.6, -1],
    ['South Province', 73, 69, 74, 76, 78, 70, 72.3, 1],
  ];
  const dotColor = (v: number) => v >= 85 ? GREEN : v >= 78 ? TEAL : v >= 72 ? BLUE : v >= 65 ? AMBER : RED;

  const budget: [string, string, number, string][] = [
    ['North Province', '$2.48B', 19.9, GREEN], ['Central Province', '$2.12B', 17.0, BLUE],
    ['East Province', '$1.98B', 15.9, PURPLE], ['West Province', '$1.76B', 14.1, '#b07cf0'],
    ['South Province', '$1.42B', 11.4, ORANGE], ['Other Regions', '$2.72B', 21.7, '#9aa3b5'],
  ];
  const projects: [string, string, number, string][] = [
    ['North Highway Expansion', 'North Province', 78, 'On Track'],
    ['Central Water Initiative', 'Central Province', 84, 'On Track'],
    ['Eastern Port Development', 'East Province', 54, 'At Risk'],
    ['Western Industrial Corridor', 'West Province', 62, 'On Track'],
    ['Southern Renewable Park', 'South Province', 71, 'On Track'],
  ];
  const alertsList: [string, string, string][] = [
    ['Flood advisory in East Province', '25 min ago', RED],
    ['Infrastructure delay in Region 14', '1 hr ago', AMBER],
    ['Security incident in Region 23', '2 hr ago', ORANGE],
    ['Resource request from Region 07', '3 hr ago', BLUE],
  ];

  const Rank = ({ r, nm, v, d }: { r: number; nm: string; v: number; d: number }) => (
    <div className="flex items-center gap-2.5 text-[10.5px]">
      <span className="grid h-5 w-5 place-items-center rounded-md text-[9px] font-bold" style={{ background: r <= 3 ? `color-mix(in srgb,${GREEN} 16%,#fff)` : '#f0f2f8', color: r <= 3 ? GREEN : MUT }}>{r}</span>
      <span className="min-w-0 flex-1 truncate" style={{ color: INK }}>{nm}</span>
      <span className="font-semibold tabular-nums" style={{ color: INK }}>{v}</span>
      <span className="w-7 text-right text-[9px] font-semibold" style={{ color: d > 0 ? GREEN : d < 0 ? RED : MUT }}>{d > 0 ? `↑ ${d}` : d < 0 ? `↓ ${-d}` : '—'}</span>
    </div>
  );

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: NAVY }} aria-hidden>♛</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Governance Platform</div>
            <div className="text-[9.5px]" style={{ color: MUT }}>One Nation. One System.</div>
          </div>
        </div>
        <div>
          <div className="text-[20px] font-bold leading-tight" style={{ color: INK }}>Regional Administration</div>
          <div className="text-[11px]" style={{ color: MUT }}>Territorial governance, provincial coordination and regional performance.</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> ▾</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: SOFT }}>⇄ Compare</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: SOFT }}>⛃ Filters</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: NAVY }}>CA</span>
            <span><span className="block font-medium" style={{ color: INK }}>Chief Administrator</span><span style={{ color: MUT }}>National Government</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{kpis}</div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_0.9fr]">
        <Card title="Regional Map" sub="Operational status and key indicators by region" action="All Regions ▾">
          <RegionMap id={id} ts={ts} />
        </Card>
        <Card title="Region Performance Ranking" sub="By Overall Index" action="View All Regions →">
          <div className="space-y-2">
            {ranking.map(([r, nm, v, d]) => <Rank key={r} r={r} nm={nm} v={v} d={d} />)}
            <div className="text-center text-[10px]" style={{ color: MUT }}>···</div>
            {rankTail.map(([r, nm, v, d]) => <Rank key={r} r={r} nm={nm} v={v} d={d} />)}
          </div>
        </Card>
        <Card title="Province Health Overview" sub="Composite index across key domains">
          <Radar a={[88, 80, 78, 84, 86, 74]} b={[72, 70, 68, 71, 73, 66]} />
        </Card>
        <div className="space-y-3">
          <Card title="Regional Operations">
            <div className="space-y-1.5 text-[10px]">
              {[['⇄', 'Inter-Regional Coordination'], ['◫', 'Resource Requests'], ['⚠', 'Emergency Management'], ['▤', 'Field Reports']].map(([ic, l]) => (
                <div key={l} className="flex items-center gap-2 rounded-lg border px-2.5 py-2" style={{ borderColor: LINE }}>
                  <span className="grid h-6 w-6 place-items-center rounded-md text-[10px]" style={{ background: '#f0f2f8', color: PURPLE }} aria-hidden>{ic}</span>
                  <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{l}</span>
                  <span style={{ color: MUT }}>›</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Recent Alerts" action="View All">
            <div className="space-y-2">
              {alertsList.map(([l, t, c]) => (
                <div key={l} className="flex items-start gap-2 text-[9.5px]">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: c }} />
                  <div className="min-w-0 flex-1"><div className="truncate" style={{ color: SOFT }}>{l}</div><div className="text-[8.5px]" style={{ color: MUT }}>{t}</div></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr]">
        <Card title="Province Health Indicators" action="View All Regions & Indicators →">
          <div className="flex border-b pb-1.5 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE }}>
            <span className="flex-1">Region</span>
            {['Gov', 'Infra', 'Econ', 'Svc', 'Sec', 'Env'].map(h => <span key={h} className="w-11 text-center">{h}</span>)}
            <span className="w-12 text-right">Index</span><span className="w-8 text-right">Trend</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {indicators.map(([nm, g, inf, ec, sv, se, en, ov, tr]) => (
              <div key={nm} className="flex items-center text-[9.5px]">
                <span className="min-w-0 flex-1 truncate" style={{ color: INK }}>{nm}</span>
                {[g, inf, ec, sv, se, en].map((x, i) => (
                  <span key={i} className="flex w-11 items-center justify-center gap-1 tabular-nums" style={{ color: SOFT }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor(x) }} />{x}
                  </span>
                ))}
                <span className="w-12 text-right font-semibold tabular-nums" style={{ color: INK }}>{ov}</span>
                <span className="w-8 text-right text-[9px] font-semibold" style={{ color: tr > 0 ? GREEN : tr < 0 ? RED : MUT }}>{tr > 0 ? `↑${tr}` : tr < 0 ? `↓${-tr}` : '—'}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Budget Allocation by Region" sub="FY 2025" action="Total: $12.48B">
          <div className="space-y-2.5">
            {budget.map(([nm, amt, pct, c]) => (
              <div key={nm} className="text-[9.5px]">
                <div className="flex items-center justify-between">
                  <span style={{ color: SOFT }}>{nm}</span>
                  <span className="tabular-nums" style={{ color: INK }}>{amt} <span style={{ color: MUT }}>{pct}%</span></span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: '#eef0f6' }}>
                  <span className="block h-full rounded-full" style={{ width: `${pct * 4}%`, background: c }} />
                </div>
              </div>
            ))}
            <div className="pt-1 text-[10px] font-medium" style={{ color: PURPLE }}>View Detailed Allocation →</div>
          </div>
        </Card>
        <Card title="Top Regional Projects" sub="By Progress" action="View All Projects →">
          <div className="space-y-2.5">
            {projects.map(([nm, rg, pr, st]) => (
              <div key={nm} className="text-[9.5px]">
                <div className="flex items-center justify-between">
                  <div className="min-w-0"><div className="truncate" style={{ color: INK }}>{nm}</div><div className="text-[8.5px]" style={{ color: MUT }}>{rg}</div></div>
                  <span className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ color: st === 'On Track' ? GREEN : AMBER, background: `color-mix(in srgb,${st === 'On Track' ? GREEN : AMBER} 14%,#fff)` }}>{st}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#eef0f6' }}>
                    <span className="block h-full rounded-full" style={{ width: `${pr}%`, background: st === 'On Track' ? GREEN : AMBER }} />
                  </div>
                  <span className="tabular-nums" style={{ color: SOFT }}>{pr}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[10px]" style={{ borderColor: LINE, color: MUT }}>
        <span>National Governance Platform — One Nation. One System.</span>
        <span>All Regions Operational · Public-Order Index {order} · Active Cells {io.coordination.cellsActive} · Data Last Updated {dd}, 10:30 AM</span>
      </div>
    </div>
  );
}
