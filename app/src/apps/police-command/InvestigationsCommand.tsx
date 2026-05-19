'use client';

// Investigations — National Investigation & Case Management System. Dense
// case-command surface modelled on the benchmark: case KPI strip,
// investigation node map, active investigations, investigation status,
// case priority breakdown, investigation types, evidence collection,
// warrants overview, most wanted, case timeline, resource utilisation,
// cases by district and recent updates. Pure & deterministic.

import * as React from 'react';
import { policeOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#06080d';
const PANEL = '#0b0e15';
const PANEL2 = '#0f131b';
const LINE = 'rgba(224,104,95,0.16)';
const RED = '#e0685f';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const CYAN = '#4fb3d9';
const EMER = '#3fae82';
const VIOLET = '#9b8cff';
const INK = '#d6dde6';
const SOFT = '#93a0ad';
const MUT = '#62707e';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';
const SEV_C: Record<string, string> = { CRITICAL: RED, HIGH: AMBER, MEDIUM: GOLD, LOW: EMER };

function Donut({ segs, top, sub, size = 132 }: {
  segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 11, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#161c26" strokeWidth="11" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="11"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.17} fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>{top}</text>
        <text x="50%" y="60%" textAnchor="middle" fontSize={size * 0.07} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-[1px]" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-9 text-right font-mono tabular-nums" style={{ color: MUT }}>{Math.round((s.v / sum) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiLine({ series, height = 130 }: { series: { name: string; c: string; pts: number[] }[]; height?: number }) {
  const all = series.flatMap(s => s.pts);
  const mn = Math.min(...all), sp = Math.max(...all) - mn || 1;
  const line = (pts: number[]) => pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${92 - ((p - mn) / sp) * 80}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      {[22, 44, 66, 88].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#161c26" strokeWidth="0.4" />)}
      {series.map(s => (
        <polyline key={s.name} points={line(s.pts)} fill="none" stroke={s.c} strokeWidth="1" vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${s.c} 45%,transparent))` }} />
      ))}
    </svg>
  );
}

function Bars({ rows }: { rows: { l: string; v: string; pct: number; c: string }[] }) {
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.l} className="text-[9px]">
          <div className="flex items-center justify-between"><span style={{ color: SOFT }}>{r.l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{r.v}</span></div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: '#161c26' }}>
            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, r.pct)}%`, background: r.c }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Investigation node map: numbered case clusters wired by priority.
function CaseMap({ seedKey }: { seedKey: string }) {
  const n = 13;
  const nodes = Array.from({ length: n }).map((_, i) => {
    const a = (i / n) * Math.PI * 2 + seed(`${seedKey}:a:${i}`) * 0.4;
    const rad = 20 + seed(`${seedKey}:r:${i}`) * 24;
    return {
      x: 50 + Math.cos(a) * rad, y: 40 + Math.sin(a) * (rad * 0.78),
      lvl: seed(`${seedKey}:l:${i}`), num: 2 + Math.round(seed(`${seedKey}:n:${i}`) * 22),
    };
  });
  const col = (l: number) => (l > 0.72 ? RED : l > 0.48 ? AMBER : l > 0.28 ? EMER : CYAN);
  return (
    <div className="relative h-full overflow-hidden rounded-[3px]" style={{ background: 'radial-gradient(120% 100% at 50% 50%,#10131c,#06080d)' }}>
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
        {nodes.map((p, i) => <line key={i} x1="50" y1="40" x2={p.x} y2={p.y} stroke={col(p.lvl)} strokeWidth="0.3" opacity="0.3" />)}
        {nodes.map((p, i) => i < n - 1 ? <line key={`e${i}`} x1={p.x} y1={p.y} x2={nodes[i + 1]!.x} y2={nodes[i + 1]!.y} stroke={MUT} strokeWidth="0.22" opacity="0.25" /> : null)}
        <circle cx="50" cy="40" r="6" fill="none" stroke={RED} strokeWidth="0.5" opacity="0.5" />
        <circle cx="50" cy="40" r="4.4" fill={RED} style={{ filter: `drop-shadow(0 0 5px ${RED})` }} />
        <text x="50" y="42" textAnchor="middle" fontSize="3.6" fill="#1a0c0c" fontWeight="700">22</text>
        {nodes.map((p, i) => (
          <g key={`n${i}`}>
            <circle cx={p.x} cy={p.y} r={2.6 + p.lvl * 1.6} fill={col(p.lvl)} opacity="0.85" />
            <text x={p.x} y={p.y + 1.3} textAnchor="middle" fontSize="2.8" fill="#0a0d12" fontWeight="700">{p.num}</text>
          </g>
        ))}
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {['+', '−', '⌖'].map(s => <span key={s} className="grid h-6 w-6 place-items-center rounded-[2px] border text-[11px]" style={{ borderColor: LINE, background: PANEL, color: SOFT }} aria-hidden>{s}</span>)}
      </div>
      <div className="absolute bottom-2 left-2 flex gap-3 rounded-[2px] border px-3 py-1" style={{ borderColor: LINE, background: 'rgba(6,8,13,0.78)' }}>
        {[['High Priority', RED], ['Medium Priority', AMBER], ['Low Priority', EMER], ['Undercover', CYAN]].map(([l, c]) => (
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

export function InvestigationsCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = policeOps(id, ts);
  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`iv:${k}:${id}`, ts, n, lo, hi);

  const activeCases = 2400 + Math.round(seed(`iv:ac:${id}`) * 800);
  const openInv = Math.round(activeCases * 0.69);
  const solved = Math.round(wave(`iv:sv:${id}`, ts, 100, 170));
  const arrests = Math.round(wave(`iv:ar:${id}`, ts, 60, 110));
  const warrants = Math.round(wave(`iv:wr:${id}`, ts, 55, 95));
  const clearance = Math.round((o.clearanceRatePct + 12) * 10) / 10;

  const kpis: [string, string, string, string][] = [
    ['Active Cases', activeCases.toLocaleString(), '+8.3% vs yesterday', INK],
    ['Open Investigations', openInv.toLocaleString(), '+6.1% vs yesterday', INK],
    ['Cases Solved (24H)', `${solved}`, '+12.4% vs yesterday', EMER],
    ['Arrests (24H)', `${arrests}`, '+9.0% vs yesterday', EMER],
    ['Warrants Issued (24H)', `${warrants}`, '+5.8% vs yesterday', INK],
    ['Case Clearance Rate', `${clearance}%`, '+4.2% vs last 7 days', EMER],
  ];

  const active: [string, string, string, string, string][] = [
    ['INV-2025-1847', 'Organized Crime', 'Central District', 'CRITICAL', '12:35'],
    ['INV-2025-1732', 'Financial Fraud', 'Eastern District', 'HIGH', '12:18'],
    ['INV-2025-1689', 'Drug Trafficking', 'Harbor District', 'HIGH', '11:57'],
    ['INV-2025-1542', 'Cyber Fraud', 'North District', 'MEDIUM', '11:42'],
    ['INV-2025-1498', 'Human Trafficking', 'South District', 'LOW', '11:28'],
  ];
  const invTypes: [string, number, number, string][] = [
    ['Financial Crime', 876, 31, RED], ['Violent Crime', 652, 23, AMBER], ['Cyber Crime', 498, 18, GOLD],
    ['Drug Related', 376, 13, CYAN], ['Public Corruption', 245, 9, VIOLET], ['Other', 200, 6, MUT],
  ];
  const evidence: [string, string, string][] = [
    ['Documents Collected', '342', '+12%'], ['Digital Evidence (GB)', '1,256', '+8%'],
    ['Forensic Images', '198', '+15%'], ['Witness Statements', '124', '+6%'], ['Surveillance Files (hrs)', '48', '+9%'],
  ];
  const warrantsList: [string, number, string][] = [
    ['Search Warrants', 31, '+10%'], ['Arrest Warrants', 27, '+8%'], ['Wiretap Warrants', 9, '+29%'], ['Freeze Orders', 6, '+5%'],
  ];
  const wanted: [string, string, string][] = [
    ['Marcus Bellamy', 'Armed Robbery', 'CRITICAL'], ['Diego Ramirez', 'Drug Trafficking', 'HIGH'],
    ['Aisha Khan', 'Human Trafficking', 'HIGH'], ['Victor Okafor', 'Financial Fraud', 'MEDIUM'],
    ['Sergio Mendes', 'Organized Crime', 'LOW'],
  ];
  const resource: [string, number][] = [
    ['Investigators', 78], ['Forensic Analysts', 65], ['Surveillance Teams', 82], ['Digital Forensics Lab', 71], ['Legal Officers', 69],
  ];
  const districts: [string, number][] = [
    ['Central District', 632], ['Eastern District', 548], ['North District', 487], ['South District', 456], ['Harbor District', 401], ['West District', 323],
  ];
  const dMax = Math.max(...districts.map(d => d[1]));
  const updates: [string, string, string][] = [
    ['INV-2025-1847', 'Suspect apprehended in Central District', '12:35'],
    ['INV-2025-1732', 'Bank records seized as evidence', '11:58'],
    ['INV-2025-1689', 'Undercover operation initiated', '11:42'],
    ['INV-2025-1542', 'Digital devices recovered', '10:47'],
    ['INV-2025-1498', 'Victim located and secured', '09:32'],
  ];
  const feed: [string, string, string][] = [
    ['12:40', 'New lead added to INV-2025-1847 · Central District', 'CRITICAL'],
    ['12:28', 'Evidence uploaded to case INV-2025-1732', 'HIGH'],
    ['12:15', 'Witness statement recorded INV-2025-1689', 'HIGH'],
    ['12:05', 'Forensic report completed INV-2025-1542', 'MEDIUM'],
    ['11:52', 'Case file updated INV-2025-1498', 'LOW'],
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0b0e15,#11141d)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${RED}`, color: RED }} aria-hidden>⌕</span>
          <div>
            <div className="text-[17px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>Investigations</div>
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: RED }}>National Investigation &amp; Case Management System</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> GMT+1</span>
          <span className="flex items-center gap-1.5"><span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: RED }}>9</span></span><span className="uppercase tracking-[0.12em]">Alerts</span></span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: RED, color: '#160a09' }}>DI</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Director of Investigations</span><span style={{ color: INK }}>National Investigation Bureau</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border md:grid-cols-3 xl:grid-cols-6"
        style={{ borderColor: LINE, background: LINE }}>
        {kpis.map(([l, v, s, c]) => (
          <div key={l} className="px-3 py-2.5 text-center" style={{ background: PANEL }}>
            <div className="text-[7.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUT }}>{l}</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums" style={{ color: c, fontFamily: SERIF }}>{v}</div>
            <div className="text-[7.5px]" style={{ color: EMER }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.5fr_1.1fr_1.1fr]">
        <Panel title="Investigation Map" action="All Districts ▾">
          <div className="h-[270px]"><CaseMap seedKey={`iv:cm:${id}`} /></div>
        </Panel>
        <Panel title="Active Investigations" action="View All">
          <div className="space-y-1.5">
            {active.map(([cid, ty, dist, sv, tm]) => (
              <div key={cid} className="flex items-center gap-2 rounded-[3px] border px-2 py-1.5 text-[9px]" style={{ borderColor: LINE, background: PANEL2 }}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px]" style={{ background: `color-mix(in srgb,${SEV_C[sv]} 16%,transparent)`, color: SEV_C[sv] }} aria-hidden>⌕</span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono" style={{ color: INK }}>{cid}</div>
                  <div className="text-[8px]" style={{ color: MUT }}>{ty} · {dist}</div>
                </div>
                <div className="text-right">
                  <div className="text-[7.5px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</div>
                  <div className="font-mono text-[8px]" style={{ color: SOFT }}>{tm}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Investigation Status" action="View All">
          <Donut size={116} top={activeCases.toLocaleString()} sub="Total Cases" segs={[
            { label: 'Open', v: 69, n: openInv.toLocaleString(), c: CYAN }, { label: 'In Progress', v: 22, n: '632', c: AMBER },
            { label: 'Under Review', v: 5, n: '143', c: GOLD }, { label: 'Closed', v: 4, n: '110', c: EMER },
          ]} />
          <div className="mt-2 border-t pt-2" style={{ borderColor: LINE }}>
            <div className="mb-1 text-[8px] uppercase tracking-[0.14em]" style={{ color: MUT }}>Case Outcome (30 Days)</div>
            <Bars rows={[['Conviction', '128', 45, EMER], ['Charges Filed', '86', 30, CYAN], ['Case Closed', '49', 17, AMBER], ['Acquitted', '22', 8, RED]].map(([l, v, p, c]) => ({ l: l as string, v: `${v} · ${p}%`, pct: (p as number) * 2, c: c as string }))} />
          </div>
        </Panel>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-5">
        <Panel title="Case Priority Breakdown" action="View All">
          <Donut size={116} top={activeCases.toLocaleString()} sub="Total Cases" segs={[
            { label: 'Critical', v: 12, n: '342', c: RED }, { label: 'High', v: 30, n: '867', c: AMBER },
            { label: 'Medium', v: 40, n: '1,128', c: GOLD }, { label: 'Low', v: 18, n: '510', c: EMER },
          ]} />
        </Panel>
        <Panel title="Investigation Types" action="View All">
          <Bars rows={invTypes.map(([l, n, p, c]) => ({ l, v: `${n} (${p}%)`, pct: p * 3, c }))} />
        </Panel>
        <Panel title="Evidence Collection (24H)">
          <div className="space-y-2.5">
            {evidence.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: VIOLET }} aria-hidden>▤</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-9 text-right font-mono tabular-nums" style={{ color: EMER }}>{d}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Warrants Overview (24H)" action="View All">
          <div className="space-y-2.5">
            {warrantsList.map(([l, v, d]) => (
              <div key={l} className="flex items-center justify-between text-[9px]"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v} <span style={{ color: EMER }}>{d}</span></span></div>
            ))}
            <div className="flex justify-between border-t pt-1.5 text-[9px]" style={{ borderColor: LINE }}>
              <span style={{ color: MUT }}>Total Issued</span><span className="font-mono" style={{ color: INK }}>{warrants} <span style={{ color: EMER }}>+11%</span></span>
            </div>
          </div>
        </Panel>
        <Panel title="Most Wanted Persons" action="View All">
          <div className="space-y-2">
            {wanted.map(([nm, cr, sv]) => (
              <div key={nm} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px]" style={{ background: `color-mix(in srgb,${SEV_C[sv]} 16%,transparent)`, color: SEV_C[sv] }} aria-hidden>☉</span>
                <div className="min-w-0 flex-1"><div className="truncate" style={{ color: INK }}>{nm}</div><div className="text-[8px]" style={{ color: MUT }}>{cr}</div></div>
                <span className="w-12 text-right text-[7.5px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Case Timeline (7 Days)">
          <MultiLine series={[
            { name: 'Opened', c: CYAN, pts: W('to', 40, 95, 7) },
            { name: 'In Progress', c: AMBER, pts: W('tp', 30, 70, 7) },
            { name: 'Closed', c: EMER, pts: W('tcl', 14, 44, 7) },
          ]} />
          <div className="mt-1 flex flex-wrap gap-x-3 text-[8px]" style={{ color: MUT }}>
            {[['Opened', CYAN], ['In Progress', AMBER], ['Closed', EMER]].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </Panel>
        <Panel title="Resource Utilization" action="View All">
          <Bars rows={resource.map(([l, p]) => ({ l, v: `${p}%`, pct: p, c: p >= 75 ? EMER : p >= 60 ? GOLD : AMBER }))} />
        </Panel>
        <Panel title="Cases by District" action="View Full Map">
          <div className="space-y-2">
            {districts.map(([l, v]) => (
              <div key={l} className="text-[9px]">
                <div className="flex justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: '#161c26' }}>
                  <span className="block h-full rounded-full" style={{ width: `${(v / dMax) * 100}%`, background: CYAN }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Recent Case Updates" action="View All">
          <div className="space-y-2">
            {updates.map(([cid, t, tm]) => (
              <div key={cid + tm} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: CYAN }} aria-hidden>↻</span>
                <div className="min-w-0 flex-1"><span className="font-mono" style={{ color: INK }}>{cid}</span> <span style={{ color: SOFT }}>{t}</span></div>
                <span className="font-mono text-[8px]" style={{ color: SOFT }}>{tm}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Investigation feed ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[4px] border px-4 py-2.5" style={{ borderColor: LINE, background: PANEL }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: RED }}>Investigation Feed <span style={{ color: EMER }}>(Live)</span></span>
        {feed.map(([t, e, sv]) => (
          <span key={e} className="flex items-center gap-2 text-[9px]">
            <span className="font-mono" style={{ color: MUT }}>{t}</span>
            <span style={{ color: SOFT }}>{e}</span>
            <span className="text-[7.5px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</span>
          </span>
        ))}
        <span className="ml-auto text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>View All Updates →</span>
      </div>
    </div>
  );
}
