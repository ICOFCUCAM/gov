'use client';

// Immigration & Borders — National Immigration Intelligence System. Dense
// border-command surface modelled on the benchmark: posture KPI strip,
// border situation map, crossings & watchlist, entry-risk scoring,
// biometric verifications, smuggling-risk index & corridors, visa/permit
// overview, deportations, checkpoint status, recent alerts and a border
// intelligence feed. Pure & deterministic — engine + telemetry only.

import * as React from 'react';
import { immigrationOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#070b11';
const PANEL = '#0c1119';
const PANEL2 = '#10151f';
const LINE = 'rgba(224,104,95,0.15)';
const RED = '#e0685f';
const RED_BR = '#f4877c';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const CYAN = '#4fb3d9';
const EMER = '#3fae82';
const INK = '#d6dde6';
const SOFT = '#93a0ad';
const MUT = '#62707e';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';
const SEV_C: Record<string, string> = { CRITICAL: RED, HIGH: AMBER, MEDIUM: GOLD, LOW: EMER };

function Spark({ pts, color = EMER, w = 56, h = 16 }: { pts: number[]; color?: string; w?: number; h?: number }) {
  if (pts.length < 2) return null;
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - ((p - mn) / sp) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb,${color} 55%,transparent))` }} />
    </svg>
  );
}

function Donut({ segs, total, sub, size = 110 }: {
  segs: { label: string; v: number; c: string }[]; total: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 9, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1f29" strokeWidth="9" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="9"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.2} fontWeight="700" fill={RED} style={{ fontFamily: SERIF }}>{total}</text>
        <text x="50%" y="61%" textAnchor="middle" fontSize={size * 0.08} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-[1px]" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{s.v.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Area({ pts, color = RED, h = 84 }: { pts: number[]; color?: string; h?: number }) {
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const line = pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${94 - ((p - mn) / sp) * 84}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: h }} aria-hidden>
      {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#161c26" strokeWidth="0.4" />)}
      <polygon points={`0,94 ${line} 100,94`} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${color} 45%,transparent))` }} />
    </svg>
  );
}

function BorderMap({ seedKey }: { seedKey: string }) {
  const cols = 30, rows = 13;
  const nodes = Array.from({ length: 11 }).map((_, i) => ({
    x: 10 + seed(`${seedKey}:nx:${i}`) * 80, y: 14 + seed(`${seedKey}:ny:${i}`) * 66,
    st: seed(`${seedKey}:ns:${i}`),
  }));
  const col = (st: number) => (st > 0.82 ? RED : st > 0.62 ? AMBER : st > 0.4 ? CYAN : EMER);
  return (
    <div className="relative h-full overflow-hidden rounded-[3px]" style={{ background: 'radial-gradient(120% 90% at 50% 40%,#0d141d,#070b11)' }}>
      <div className="grid h-full gap-[3px] p-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} aria-hidden>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const v = seed(`${seedKey}:${i}`);
          const inland = (i % cols > 2 && i % cols < cols - 2 && Math.floor(i / cols) > 0 && Math.floor(i / cols) < rows - 1);
          return <span key={i} className="aspect-square rounded-full" style={{ background: inland ? (v > 0.9 ? CYAN : '#1c2730') : 'transparent', opacity: inland ? (v > 0.9 ? 0.7 : 0.35) : 0 }} />;
        })}
      </div>
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {nodes.map((n, i) => i < nodes.length - 1 ? (
          <line key={i} x1={n.x} y1={n.y} x2={nodes[i + 1]!.x} y2={nodes[i + 1]!.y} stroke={CYAN} strokeWidth="0.25" opacity="0.3" />
        ) : null)}
        {nodes.map((n, i) => (
          <g key={`n${i}`}>
            <circle cx={n.x} cy={n.y} r="2.6" fill={col(n.st)} opacity="0.22" />
            <circle cx={n.x} cy={n.y} r="1.1" fill={col(n.st)} style={{ filter: `drop-shadow(0 0 3px ${col(n.st)})` }} />
          </g>
        ))}
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {['⛶', '⛃', '☰'].map(s => (
          <span key={s} className="grid h-6 w-6 place-items-center rounded-[2px] border text-[10px]" style={{ borderColor: LINE, background: PANEL, color: SOFT }} aria-hidden>{s}</span>
        ))}
      </div>
      <div className="absolute bottom-2 left-2 flex flex-col gap-0.5 rounded-[2px] border px-2 py-1.5" style={{ borderColor: LINE, background: 'rgba(8,11,17,0.7)' }}>
        {[['Open', EMER], ['Monitoring', CYAN], ['Restricted', AMBER], ['Closed', RED], ['Unknown', MUT]].map(([l, c]) => (
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

export function ImmigrationCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = immigrationOps(id, ts);
  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`im:${k}:${id}`, ts, n, lo, hi);

  const crossings = o.crossingsToday;
  const watchHits = Math.round(wave(`im:wh:${id}`, ts, 800, 1900));
  const highRisk = o.flaggedEntries + 240;
  const deport = Math.round(wave(`im:dp:${id}`, ts, 50, 130));
  const sysHealth = Math.round(wave(`im:sh:${id}`, ts, 96, 99.6) * 10) / 10;
  const sri = Math.round(wave(`im:sri:${id}`, ts, 45, 82));
  const postureLvl = sri >= 75 ? ['SEVERE', 4, RED] : sri >= 58 ? ['HIGH', 3, RED] : sri >= 42 ? ['ELEVATED', 2, AMBER] : ['GUARDED', 1, GOLD];

  const kpis: [string, string, string, string][] = [
    ['Border Posture', `${postureLvl[0]}`, `Level ${postureLvl[1]}`, postureLvl[2] as string],
    ['Total Crossings (24H)', crossings.toLocaleString(), '+8.2%', INK],
    ['Watchlist Hits (24H)', watchHits.toLocaleString(), '+5.1%', AMBER],
    ['High-Risk Travelers (24H)', `${highRisk}`, '+11.3%', RED],
    ['Deportations (24H)', `${deport}`, '+2.4%', INK],
    ['System Health', `${sysHealth}%`, 'Optimal', EMER],
  ];

  const entry = Math.round(crossings * 0.52);
  const exit = crossings - entry;
  const official = Math.round(crossings * 0.9);
  const unofficial = crossings - official;
  const cleared = Math.round(wave(`im:cl:${id}`, ts, 110000, 135000));

  const corridors: [string, string, number][] = [
    ['Northern Mountain Route', 'HIGH', 72], ['Coastal Passage East', 'HIGH', 61],
    ['Desert Crossing Sector 7', 'MEDIUM', 48], ['Riverine Route Delta', 'MEDIUM', 36],
    ['Urban Transit Corridor', 'LOW', 22],
  ];
  const visaTypes: [string, number, number][] = [
    ['Tourist', 4125, 50.2], ['Business', 2143, 26.1], ['Student', 1256, 15.3], ['Work', 512, 6.2], ['Transit', 178, 2.2],
  ];
  const checkpoints: [string, string, number, number][] = [
    ['North Gate Alpha', 'Open', 12842, 15], ['East Gate Bravo', 'Monitoring', 9214, 25],
    ['South Gate Charlie', 'Restricted', 4125, 45], ['West Gate Delta', 'Open', 8642, 12],
    ['Coastal Port Echo', 'Monitoring', 6891, 20], ['Airport Terminal Foxtrot', 'Open', 24752, 10],
  ];
  const cpC: Record<string, string> = { Open: EMER, Monitoring: CYAN, Restricted: AMBER, Closed: RED };
  const alerts: [string, string, string][] = [
    ['High-risk traveler detected at North Gate Alpha', '12:35', 'CRITICAL'],
    ['Multiple watchlist matches at East Gate Bravo', '11:58', 'HIGH'],
    ['Document fraud detected at Airport Terminal', '11:42', 'HIGH'],
    ['Smuggling attempt detected — Coastal Sector', '10:47', 'MEDIUM'],
    ['Fake passport detected at South Gate Charlie', '10:12', 'MEDIUM'],
  ];
  const feed: [string, string, string, string][] = [
    ['12:40', 'Increase in forged documents from Region X', 'Northern Region', 'HIGH'],
    ['12:28', 'New smuggling route identified in Desert Sector', 'Eastern Border', 'MEDIUM'],
    ['12:15', 'Terror watchlist update distributed', 'All Borders', 'HIGH'],
    ['12:05', 'Human trafficking ring dismantled', 'Southern Region', 'HIGH'],
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0c0f15,#12161e)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${RED}`, color: RED }} aria-hidden>⛬</span>
          <div>
            <div className="text-[17px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>Immigration &amp; Borders</div>
            <div className="text-[8px] uppercase tracking-[0.22em]" style={{ color: RED }}>National Immigration Intelligence System</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> GMT+1</span>
          <span className="flex items-center gap-1.5"><span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: RED }}>9</span></span><span className="uppercase tracking-[0.12em]">Alerts</span></span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: RED, color: '#160a09' }}>HI</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Head of Immigration</span><span style={{ color: INK }}>National Executive</span></span>
          </span>
        </div>
      </div>

      {/* ── Posture KPI strip ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border md:grid-cols-3 xl:grid-cols-6"
        style={{ borderColor: LINE, background: LINE }}>
        {kpis.map(([l, v, s, c]) => (
          <div key={l} className="px-3 py-2.5 text-center" style={{ background: PANEL }}>
            <div className="text-[7.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUT }}>{l}</div>
            <div className="mt-1 text-[17px] font-bold tabular-nums" style={{ color: c, fontFamily: SERIF }}>{v}</div>
            <div className="text-[8px]" style={{ color: s.startsWith('+') ? EMER : SOFT }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.7fr_1fr_1fr]">
        <Panel title="Border Situation Map">
          <div className="h-[280px]"><BorderMap seedKey={`im:bm:${id}`} /></div>
        </Panel>
        <Panel title="Border Crossings (24H)" action="View All">
          <div className="space-y-2">
            {([['Total Crossings', crossings, '+8.2%'], ['Entry', entry, '+9.1%'], ['Exit', exit, '+7.3%'], ['Official Crossings', official, '+8.4%'], ['Unofficial Crossings', unofficial, '+5.7%']] as [string, number, string][]).map(([l, v, d], i) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="grid h-6 w-6 place-items-center rounded text-[10px]" style={{ background: PANEL2, color: CYAN }} aria-hidden>⛗</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <Spark pts={W(`bc${i}`, 40, 90, 8)} color={EMER} />
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v.toLocaleString()}</span>
                <span className="w-10 text-right font-mono tabular-nums" style={{ color: EMER }}>{d}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Watchlist & Risk" action="View All">
          <Donut size={104} total={`${highRisk}`} sub="high risk" segs={[
            { label: 'High Risk', v: highRisk, c: RED }, { label: 'Medium Risk', v: watchHits, c: AMBER },
            { label: 'Low Risk', v: 4896, c: GOLD }, { label: 'Cleared', v: cleared, c: EMER },
          ]} />
          <div className="mt-2 border-t pt-2" style={{ borderColor: LINE }}>
            <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Top Watchlist Categories</div>
            {([['Terrorism', 98, RED], ['Organized Crime', 76, RED], ['Trafficking', 64, AMBER], ['Cyber Threat', 41, AMBER], ['Financial Crime', 33, GOLD]] as [string, number, string][]).map(([l, v, c]) => (
              <div key={l} className="flex items-center gap-2 text-[9px]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} /><span className="flex-1" style={{ color: SOFT }}>{l}</span><span className="font-mono" style={{ color: INK }}>{v}</span></div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Entry Risk Scoring (24H)" action="View All">
          <Donut size={96} total={`${highRisk}`} sub="high risk" segs={[
            { label: 'High', v: highRisk, c: RED }, { label: 'Medium', v: 1892, c: AMBER }, { label: 'Low', v: 2523, c: EMER },
          ]} />
          <div className="mt-2 flex justify-between border-t pt-2 text-[9px]" style={{ borderColor: LINE }}>
            <span style={{ color: MUT }}>Total Assessed</span><span className="font-mono" style={{ color: INK }}>4,856</span>
          </div>
        </Panel>
        <Panel title="Biometric Verifications (24H)">
          <div className="flex items-center gap-3">
            <span className="text-[40px] leading-none" style={{ color: CYAN }} aria-hidden>☝</span>
            <div className="flex-1 space-y-2 text-[10px]">
              {([['Total Verifications', Math.round(wave(`im:tv:${id}`, ts, 80000, 120000)).toLocaleString(), '+12.6%', EMER], ['Success Rate', `${(99 + seed(`im:srt:${id}`)).toFixed(1)}%`, '+0.8%', EMER], ['Failures', `${Math.round(wave(`im:fl:${id}`, ts, 600, 1200))}`, '-5.4%', AMBER]] as [string, string, string, string][]).map(([l, v, d, c]) => (
                <div key={l}>
                  <div className="flex items-center justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span></div>
                  <div className="text-right text-[8px] font-mono" style={{ color: c }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Smuggling Risk Index (24H)" action="View Trend">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[24px]" style={{ color: RED, fontFamily: SERIF }}>{sri}</span>
            <span className="text-[10px]" style={{ color: MUT }}>/100</span>
            <span className="text-[10px] font-bold uppercase" style={{ color: RED }}>High Risk</span>
          </div>
          <Area pts={W('sri', 30, 90, 18)} color={RED} h={92} />
        </Panel>
        <Panel title="Top Smuggling Corridors">
          <div className="space-y-2">
            {corridors.map(([l, sv, v]) => (
              <div key={l} className="flex items-center gap-2 text-[9.5px]">
                <span style={{ color: SEV_C[sv] }} aria-hidden>▸</span>
                <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{l}</span>
                <span className="w-12 text-right text-[8px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</span>
                <span className="w-6 text-right font-mono" style={{ color: INK }}>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Visa & Permit Overview" action="View All">
          <div className="grid grid-cols-2 gap-1.5">
            {([['Total Applications', '8,221', GOLD], ['Approved', '6,521', EMER], ['Rejected', '1,248', RED], ['Pending', '445', AMBER]] as [string, string, string][]).map(([l, v, c]) => (
              <div key={l} className="rounded-[3px] border px-2 py-1.5" style={{ borderColor: LINE, background: PANEL2 }}>
                <div className="text-[7.5px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div>
                <div className="font-mono text-[13px]" style={{ color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1.5">
            {visaTypes.map(([l, n, p]) => (
              <div key={l} className="text-[9px]">
                <div className="flex justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono" style={{ color: INK }}>{n.toLocaleString()} · {p}%</span></div>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ background: '#1a1f29' }}><span className="block h-full rounded-full" style={{ width: `${p}%`, background: EMER }} /></div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Deportations & Removals (24H)" action="View All">
          {([['Total Removals', `${deport}`, '+2.4%'], ['Voluntary Departure', '34', '39.5%'], ['Involuntary Removal', '52', '60.5%']] as [string, string, string][]).map(([l, v, p]) => (
            <div key={l} className="flex items-center justify-between border-b py-1.5 text-[10px]" style={{ borderColor: LINE }}>
              <span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v} <span style={{ color: MUT }}>{p}</span></span>
            </div>
          ))}
          <div className="mt-2 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Top Nationalities</div>
          {(['Country A', 'Country B', 'Country C', 'Country D', 'Country E']).map((c, i) => (
            <div key={c} className="flex justify-between text-[9px]"><span style={{ color: SOFT }}>{c}</span><span className="font-mono" style={{ color: INK }}>{[18, 15, 12, 9, 7][i]}</span></div>
          ))}
        </Panel>
        <Panel title="Border Checkpoint Status" action="View All">
          <div className="space-y-1.5">
            {checkpoints.map(([cp, st, cr, wt]) => (
              <div key={cp} className="flex items-center gap-2 text-[9px]">
                <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{cp}</span>
                <span className="flex items-center gap-1 text-[8px] uppercase tracking-wider" style={{ color: cpC[st] }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: cpC[st] }} />{st}</span>
                <span className="w-12 text-right font-mono" style={{ color: INK }}>{cr.toLocaleString()}</span>
                <span className="w-9 text-right font-mono" style={{ color: MUT }}>{wt}m</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Recent Alerts" action="View All">
          <div className="space-y-2">
            {alerts.map(([t, tm, sv]) => (
              <div key={t} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px]" style={{ background: `color-mix(in srgb,${SEV_C[sv]} 16%,transparent)`, color: SEV_C[sv] }} aria-hidden>⚑</span>
                <span className="min-w-0 flex-1" style={{ color: INK }}>{t}</span>
                <span className="font-mono text-[8px]" style={{ color: SOFT }}>{tm}</span>
                <span className="w-12 text-right text-[7.5px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Border intelligence feed ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[4px] border px-4 py-2.5" style={{ borderColor: LINE, background: PANEL }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: RED }}>Border Intelligence Feed</span>
        {feed.map(([t, e, rg, sv]) => (
          <span key={e} className="flex items-center gap-2 text-[9px]">
            <span className="font-mono" style={{ color: MUT }}>{t}</span>
            <span style={{ color: SOFT }}>{e}</span>
            <span className="uppercase tracking-wider" style={{ color: MUT }}>{rg}</span>
            <span className="text-[7.5px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</span>
          </span>
        ))}
        <span className="ml-auto text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>View All →</span>
      </div>
    </div>
  );
}
