'use client';

// Treasury Command — the Sovereign Financial Operating Ecosystem. A dense
// national fiscal command grid modelled on the benchmark: national
// financial-posture strip, mode tabs, eight numbered command modules
// (Treasury / Central Bank / Tax & Revenue / Procurement / Expenditure /
// Economic Intelligence / Citizen Finance / Financial Crime) and a live
// right rail (alerts · AI recommendations · market watch · system feed).
// Pure & deterministic — engine + telemetry only; SSR/test-safe.

import * as React from 'react';
import Link from 'next/link';
import {
  fiscalCommand, revenueOps, budgetOps, procurementOps,
  bankingRails, citizenFinance, fiscalAssurance,
} from '@/lib/gov/treasury-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#04100d';
const PANEL = '#071512';
const PANEL2 = '#09201a';
const LINE = 'rgba(63,174,130,0.15)';
const EMER = '#3fae82';
const EMER_BR = '#5fd6a6';
const GOLD = '#c9a24a';
const CYAN = '#4fb3d9';
const AMBER = '#e0a13a';
const RED = '#d8645f';
const INK = '#cfded7';
const SOFT = '#8ea399';
const MUT = '#5d6f67';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';

const f1 = (n: number) => n.toFixed(1);
const usd = (bn: number) => `$${bn.toFixed(1)}B`;
const tc = (t: string) => (t === 'ok' ? EMER : t === 'warn' ? GOLD : RED);

function Spark({ pts, color = EMER, w = 70, h = 20 }: { pts: number[]; color?: string; w?: number; h?: number }) {
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

function Donut({ segs, total, sub, size = 96 }: {
  segs: { label: string; v: number; c: string }[]; total: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 8, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#11241d" strokeWidth="8" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="8"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.16} fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>{total}</text>
        <text x="50%" y="61%" textAnchor="middle" fontSize={size * 0.085} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{Math.round((s.v / sum) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 34, circ = Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width="86" height="52" viewBox="0 0 86 52" aria-hidden>
        <path d={`M9 46 A${r} ${r} 0 0 1 77 46`} fill="none" stroke="#11241d" strokeWidth="7" strokeLinecap="round" />
        <path d={`M9 46 A${r} ${r} 0 0 1 77 46`} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * circ} ${circ}`} style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb,${color} 55%,transparent))` }} />
        <text x="43" y="42" textAnchor="middle" fontSize="15" fontWeight="700" fill={color} style={{ fontFamily: SERIF }}>{Math.round(v)}%</text>
      </svg>
      <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: MUT }}>{label}</span>
    </div>
  );
}

function Ring({ value, label, color }: { value: number; label: string; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 26, circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden>
        <circle cx="34" cy="34" r={r} fill="none" stroke="#11241d" strokeWidth="6" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)} transform="rotate(-90 34 34)"
          style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb,${color} 60%,transparent))` }} />
        <text x="34" y="38" textAnchor="middle" fontSize="16" fontWeight="700" fill={color} style={{ fontFamily: SERIF }}>{Math.round(v)}</text>
      </svg>
      <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: MUT }}>{label}</span>
    </div>
  );
}

function HeatGrid({ seedKey }: { seedKey: string }) {
  const cols = 16, rows = 8;
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} aria-hidden>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const v = seed(`${seedKey}:${i}`);
        const inland = (i % cols > 2 && i % cols < cols - 2 && Math.floor(i / cols) > 0 && Math.floor(i / cols) < rows - 1);
        const c = !inland ? 'transparent' : v > 0.74 ? RED : v > 0.55 ? AMBER : v > 0.34 ? GOLD : EMER;
        return <span key={i} className="aspect-square rounded-[1px]" style={{ background: c, opacity: inland ? 0.8 : 0 }} />;
      })}
    </div>
  );
}

function NodeGraph({ seedKey, color = EMER }: { seedKey: string; color?: string }) {
  const n = 7;
  const nodes = Array.from({ length: n }).map((_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * (26 + seed(`${seedKey}:r:${i}`) * 10), y: 38 + Math.sin(a) * (20 + seed(`${seedKey}:s:${i}`) * 6) };
  });
  return (
    <svg viewBox="0 0 100 76" className="w-full" style={{ height: 84 }} aria-hidden>
      {nodes.map((p, i) => (
        <line key={i} x1="50" y1="38" x2={p.x} y2={p.y} stroke={color} strokeWidth="0.5" opacity="0.4" />
      ))}
      {nodes.map((p, i) => i < n - 1 ? (
        <line key={`e${i}`} x1={p.x} y1={p.y} x2={nodes[i + 1]!.x} y2={nodes[i + 1]!.y} stroke={color} strokeWidth="0.35" opacity="0.25" />
      ) : null)}
      <circle cx="50" cy="38" r="4" fill={color} />
      {nodes.map((p, i) => (
        <circle key={`n${i}`} cx={p.x} cy={p.y} r={2 + seed(`${seedKey}:z:${i}`) * 1.6}
          fill={seed(`${seedKey}:t:${i}`) > 0.7 ? GOLD : color} opacity="0.9" />
      ))}
    </svg>
  );
}

function MultiLine({ series, height = 90 }: { series: { name: string; c: string; pts: number[] }[]; height?: number }) {
  const all = series.flatMap(s => s.pts);
  const mn = Math.min(...all), sp = Math.max(...all) - mn || 1;
  const path = (pts: number[]) => pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${96 - ((p - mn) / sp) * 88}`).join(' ');
  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
        {[24, 48, 72].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#11241d" strokeWidth="0.4" />)}
        {series.map(s => (
          <polyline key={s.name} points={path(s.pts)} fill="none" stroke={s.c} strokeWidth="1" vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${s.c} 45%,transparent))` }} />
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[8px]" style={{ color: MUT }}>
        {series.map(s => <span key={s.name} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: s.c }} />{s.name}</span>)}
      </div>
    </div>
  );
}

function Mod({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: LINE }}>
        <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold"
          style={{ border: `1px solid ${EMER}`, color: EMER }}>{n}</span>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: INK }}>{title}</h3>
        <span className="ml-auto flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider"
          style={{ color: EMER, background: 'color-mix(in srgb,#3fae82 16%,transparent)' }}>
          <span className="h-1 w-1 rounded-full animate-breathe" style={{ background: EMER }} />Live
        </span>
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

function Stat({ l, v, s, c = INK, sub }: { l: string; v: string; s?: string; c?: string; sub?: number[] }) {
  return (
    <div className="rounded-[3px] border px-2 py-1.5" style={{ borderColor: LINE, background: PANEL2 }}>
      <div className="text-[7.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUT }}>{l}</div>
      <div className="flex items-end justify-between gap-1">
        <span className="font-mono text-[14px] leading-none tabular-nums" style={{ color: c }}>{v}</span>
        {sub ? <Spark pts={sub} color={c} w={48} h={14} /> : null}
      </div>
      {s ? <div className="text-[8px]" style={{ color: SOFT }}>{s}</div> : null}
    </div>
  );
}

function Bars({ rows, accent = EMER }: { rows: { l: string; v: string; pct: number }[]; accent?: string }) {
  return (
    <div className="space-y-1.5">
      {rows.map(r => (
        <div key={r.l} className="text-[9px]">
          <div className="flex items-center justify-between">
            <span style={{ color: SOFT }}>{r.l}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{r.v}</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ background: '#11241d' }}>
            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, r.pct)}%`, background: accent }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TreasuryOverview({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const fc = fiscalCommand(id, ts);
  const rv = revenueOps(id, ts);
  const bg = budgetOps(id, ts);
  const pc = procurementOps(id, ts);
  const br = bankingRails(id, ts);
  const cf = citizenFinance(id, ts);
  const fa = fiscalAssurance(id, ts);

  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
  const mon = clock.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase();

  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`tro:${k}:${id}`, ts, n, lo, hi);
  const liqIdx = fc.macroStability;
  const reserveStab = Math.round(wave(`tro:rs:${id}`, ts, 78, 97));
  const revYtd = Math.round(wave(`tro:rev:${id}`, ts, 260, 360) * 10) / 10;
  const expYtd = Math.round(revYtd * (bg.executionPct / 100) * 10) / 10;
  const fiscalBal = Math.round((revYtd - expYtd) * 10) / 10;
  const pubDebt = Math.round(wave(`tro:pd:${id}`, ts, 300, 440) * 10) / 10;
  const taxToday = Math.round(wave(`tro:tt:${id}`, ts, 0.9, 2.6) * 100) / 100;
  const inflation = Math.round(wave(`tro:inf:${id}`, ts, 1.8, 4.6) * 100) / 100;
  const policyRate = Math.round(wave(`tro:pr:${id}`, ts, 3.0, 6.0) * 4) / 4;
  const grade = liqIdx >= 80 ? 'A' : liqIdx >= 65 ? 'B' : liqIdx >= 50 ? 'C' : 'D';
  const postureTone = fc.tone;

  const posture: { l: string; v: string; s: string; c?: string }[] = [
    { l: 'Treasury Liquidity Index', v: `${liqIdx}`, s: liqIdx >= 80 ? 'Excellent' : liqIdx >= 60 ? 'Stable' : 'Strained', c: tc(postureTone) },
    { l: 'Reserve Stability', v: `${reserveStab}%`, s: reserveStab >= 85 ? 'Stable' : 'Watch', c: reserveStab >= 85 ? EMER : GOLD },
    { l: 'Budget Execution (YTD)', v: `${bg.executionPct}%`, s: `+${f1(wave(`tro:bx:${id}`, ts, 1, 6))}% WoW`, c: EMER },
    { l: 'Revenue Collection (YTD)', v: usd(revYtd), s: `+${f1(wave(`tro:rc:${id}`, ts, 6, 16))}%`, c: INK },
    { l: 'Public Expenditure (YTD)', v: usd(expYtd), s: `${bg.executionPct}% of Budget`, c: INK },
    { l: 'Fiscal Balance (YTD)', v: usd(fiscalBal), s: `${fc.primaryBalancePct >= 0 ? '+' : ''}${fc.primaryBalancePct}% of GDP`, c: fiscalBal >= 0 ? EMER : RED },
    { l: 'Public Debt', v: usd(pubDebt), s: `${fc.debtToGdp}% of GDP`, c: INK },
    { l: 'FX Reserves', v: usd(fc.fxReservesBn), s: `${f1(fc.liquidityDays / 3)} Months`, c: INK },
    { l: 'Currency Strength', v: `${inflation}%`, s: `+${f1(wave(`tro:cs:${id}`, ts, 0.05, 0.4))}%`, c: EMER },
  ];

  const modes = [
    ['Executive Overview', 'Strategic Snapshot'], ['Operations Mode', 'Ministry Operations'],
    ['Analyst Mode', 'Deep Intelligence'], ['Crisis Mode', 'Rapid Response'],
  ];

  const alerts = [
    { lvl: 'High', t: 'Revenue shortfall risk in Oil & Gas', at: '11:38' },
    { lvl: 'Medium', t: 'Infrastructure budget overrun', at: '11:22' },
    { lvl: 'High', t: 'Cash buffer below optimal level', at: '11:10' },
    { lvl: 'Medium', t: 'Unusual transactions detected', at: '10:58' },
  ];
  const recs = [
    ['Increase tax compliance in import sector', 'High'],
    ['Optimize fuel subsidy allocation', 'Medium'],
    ['Prioritise debt refinancing window', 'High'],
    ['Review low-performing capital projects', 'High'],
  ];
  const market = [
    ['Sovereign Bond (10Y)', `${f1(wave(`tro:sb:${id}`, ts, 6.5, 8.4))}%`, -0.18],
    ['10Y Yield', `${f1(wave(`tro:yl:${id}`, ts, 5.8, 7.6))}%`, -0.11],
    ['Stock Index', `${Math.round(wave(`tro:si:${id}`, ts, 3800, 4600))}`, 0.64],
    ['Oil (Brent)', `${f1(wave(`tro:br:${id}`, ts, 70, 95))}`, 1.21],
    ['Gold', `$${Math.round(wave(`tro:gd:${id}`, ts, 2200, 2600))}`, 0.71],
    ['USD / Local', `${(Math.round(wave(`tro:fx:${id}`, ts, 0.97, 1.04) * 100) / 100).toFixed(2)}`, 0.12],
  ] as [string, string, number][];
  const feed = [
    ['11:38', `Treasury received ${usd(taxToday * 0.7)} tax revenue`],
    ['11:37', 'Payroll disbursement completed'],
    ['11:36', `Customs seizure at North Border ${usd(2.4)}`.replace('B', 'M')],
    ['11:35', `New procurement approved ${usd(8.7)}`.replace('B', 'M')],
    ['11:33', 'Foreign exchange intervention executed'],
  ];

  const taxBreakdown = [
    { label: 'Income Tax', v: 29, c: EMER }, { label: 'VAT', v: 24, c: EMER_BR },
    { label: 'Customs Duties', v: 12, c: GOLD }, { label: 'Excise Tax', v: 9, c: AMBER },
    { label: 'Corporate Tax', v: 9, c: CYAN }, { label: 'Other Taxes', v: 6, c: MUT },
  ];
  const sectors = [
    { label: 'Oil & Gas', v: 24, c: EMER }, { label: 'Manufacturing', v: 19, c: EMER_BR },
    { label: 'Financial Services', v: 17, c: GOLD }, { label: 'Construction', v: 14, c: AMBER },
    { label: 'Telecom', v: 12, c: CYAN }, { label: 'Others', v: 14, c: MUT },
  ];
  const lifecycle = [
    { label: 'Planning', v: 18, c: EMER }, { label: 'Tendering', v: 22, c: EMER_BR },
    { label: 'Evaluation', v: 20, c: GOLD }, { label: 'Awarded', v: 20, c: AMBER },
    { label: 'Execution', v: 20, c: CYAN },
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 130px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-2.5"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#06140f,#081a14)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full text-[14px]" style={{ border: `1px solid ${GOLD}`, color: GOLD }} aria-hidden>⚖</span>
          <div>
            <div className="text-[15px] font-bold uppercase tracking-[0.12em]" style={{ color: INK, fontFamily: SERIF }}>Ministry of Treasury &amp; Finance</div>
            <div className="text-[8px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Sovereign Financial Operating Ecosystem</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> GMT+1</span>
          <span>DATE <span style={{ color: SOFT }}>{mon}</span></span>
          <span>SYSTEM <span style={{ color: EMER }}>● OPERATIONAL</span></span>
          <span>FIVE-YEAR PLAN <span style={{ color: SOFT }}>2025/26 Q2</span></span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px]" style={{ color: MUT }}>
          {[['AI Engine', 'Active', EMER], ['Data Integrity', 'Verified', EMER], ['Cyber Defense', 'Secure', EMER]].map(([a, b, c]) => (
            <span key={a as string} className="uppercase tracking-[0.12em]">{a} <span style={{ color: c as string }}>● {b}</span></span>
          ))}
          <Link href="/treasury" target="_blank" rel="noopener"
            className="focus-ring rounded-[3px] border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em]"
            style={{ borderColor: LINE, color: GOLD }}>Public Site ↗</Link>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: EMER, color: '#03130d' }}>TC</span>
            <span><span className="block uppercase tracking-[0.12em]" style={{ color: MUT }}>Command User</span><span style={{ color: INK }}>Treasury Commander</span></span>
          </span>
        </div>
      </div>

      {/* ── National financial posture strip ───────────────────── */}
      <div className="flex flex-wrap items-stretch gap-x-1 gap-y-2 rounded-[4px] border px-3 py-2" style={{ borderColor: LINE, background: PANEL }}>
        <div className="flex items-center gap-3 pr-4">
          <span className="text-[16px]" style={{ color: tc(postureTone) }} aria-hidden>🛡</span>
          <div>
            <div className="text-[8px] font-semibold uppercase tracking-[0.18em]" style={{ color: MUT }}>National Financial Posture</div>
            <div className="text-[16px] font-bold uppercase tracking-[0.1em]" style={{ color: tc(postureTone), fontFamily: SERIF }}>
              {postureTone === 'ok' ? 'Strong' : postureTone === 'warn' ? 'Guarded' : 'Critical'}
            </div>
          </div>
          <Spark pts={W('post', 55, 95, 18)} color={tc(postureTone)} w={70} h={22} />
        </div>
        {posture.map(p => (
          <div key={p.l} className="flex-1 border-l px-3 py-0.5" style={{ borderColor: LINE, minWidth: 116 }}>
            <div className="text-[7px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUT }}>{p.l}</div>
            <div className="font-mono text-[15px] leading-tight tabular-nums" style={{ color: p.c ?? INK }}>{p.v}</div>
            <div className="text-[8px]" style={{ color: SOFT }}>{p.s}</div>
          </div>
        ))}
        <div className="flex items-center gap-2 border-l pl-4" style={{ borderColor: LINE }}>
          <Ring value={liqIdx} label="" color={tc(postureTone)} />
          <div>
            <div className="text-[7px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUT }}>Overall Fiscal Health</div>
            <div className="text-[18px] font-bold" style={{ color: tc(postureTone), fontFamily: SERIF }}>{grade}</div>
            <div className="text-[8px] uppercase" style={{ color: SOFT }}>{postureTone === 'ok' ? 'Strong' : postureTone === 'warn' ? 'Guarded' : 'At Risk'}</div>
          </div>
        </div>
      </div>

      {/* ── Mode tabs ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 rounded-[4px] border px-2 py-1.5" style={{ borderColor: LINE, background: PANEL }}>
        {modes.map(([m, s], i) => (
          <div key={m} className="flex items-center gap-2 rounded-[3px] px-3 py-1"
            style={i === 0 ? { background: 'color-mix(in srgb,#3fae82 16%,transparent)' } : undefined}>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: i === 0 ? EMER : SOFT }}>{m}</span>
            <span className="hidden text-[8px] sm:inline" style={{ color: MUT }}>{s}</span>
            {i < 3 ? <span style={{ color: MUT }}>›</span> : null}
          </div>
        ))}
        <span className="ml-auto text-[8px] uppercase tracking-[0.14em]" style={{ color: MUT }}>Data Window <span style={{ color: EMER }}>Live · Real-time ▾</span></span>
      </div>

      {/* ── Command grid + right rail ──────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_248px]">
        <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {/* 1 — National Treasury Command */}
          <Mod n={1} title="National Treasury Command">
            <div className="grid grid-cols-[1.3fr_1fr] gap-3">
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Treasury Pressure Map</div>
                <HeatGrid seedKey={`tro:hm:${id}`} />
                <div className="mt-1.5 flex items-center justify-between text-[7.5px] uppercase tracking-wider" style={{ color: MUT }}>
                  <span>Low</span><span className="flex items-center gap-0.5">{[EMER, GOLD, AMBER, RED].map(c => <span key={c} className="h-1.5 w-4" style={{ background: c }} />)}</span><span>High</span>
                </div>
              </div>
              <div className="space-y-1">
                {[['Treasury Liquidity Index', `${liqIdx}`, 'Excellent', EMER], ['Reserve Stability', `${reserveStab}%`, 'Stable', EMER], ['Budget Execution', `${bg.executionPct}%`, `+${f1(wave(`tro:be2:${id}`, ts, 1, 6))}% WoW`, EMER], ['Tax Inflow (Today)', usd(taxToday), `+${f1(wave(`tro:ti:${id}`, ts, 2, 9))}%`, INK]].map(([l, v, s, c]) => (
                  <div key={l as string} className="flex items-center justify-between gap-1 rounded-[2px] border px-1.5 py-1" style={{ borderColor: LINE }}>
                    <div><div className="text-[7px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div><div className="font-mono text-[11px]" style={{ color: c as string }}>{v}</div></div>
                    <Spark pts={W(`tl:${l}`, 40, 95, 10)} color={c as string} w={40} h={14} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2" style={{ borderColor: LINE }}>
              <div>
                <div className="text-[7.5px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>AI Fiscal Alerts</div>
                {['Revenue shortfall · Oil & Gas', 'Expenditure deviation · Infra', 'Cash buffer low (1 mo)'].map(a => (
                  <div key={a} className="mt-1 text-[8px]" style={{ color: SOFT }}>● {a}</div>
                ))}
              </div>
              <div>
                <div className="text-[7.5px] font-bold uppercase tracking-[0.14em]" style={{ color: SOFT }}>Inter-Ministerial Funding</div>
                <NodeGraph seedKey={`tro:imf:${id}`} />
                <div className="text-center text-[8px]" style={{ color: EMER }}>{usd(wave(`tro:imf$:${id}`, ts, 30, 55))} this month</div>
              </div>
              <div>
                <div className="text-[7.5px] font-bold uppercase tracking-[0.14em]" style={{ color: SOFT }}>Emergency Fiscal Controls</div>
                {[['Fiscal Trigger', 'Neutral'], ['Cash Buffer', usd(br.tsaBalanceBn * 2)], ['Contingency Line', usd(12.3)]].map(([a, b]) => (
                  <div key={a} className="mt-1 flex justify-between text-[8px]"><span style={{ color: MUT }}>{a}</span><span style={{ color: INK }}>{b}</span></div>
                ))}
                <button className="mt-1.5 w-full rounded-[2px] border py-0.5 text-[7.5px] font-bold uppercase tracking-wider" style={{ borderColor: GOLD, color: GOLD }}>View Controls</button>
              </div>
            </div>
          </Mod>

          {/* 2 — Central Bank Operations */}
          <Mod n={2} title="Central Bank Operations">
            <div className="grid grid-cols-[1fr_1.3fr] gap-3">
              <div className="space-y-1.5">
                <Stat l="Currency Stability" v={`${reserveStab}`} s="Strong" c={EMER} sub={W('cb1', 70, 95, 10)} />
                <Stat l="FX Reserves" v={usd(fc.fxReservesBn)} s="Adequate" c={INK} />
                <Stat l="Inflation (CPI)" v={`${inflation}%`} s="Contained" c={GOLD} />
                <Stat l="Policy Rate" v={`${policyRate}%`} s="Hold" c={INK} />
              </div>
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Monetary Policy Simulator</div>
                <MultiLine series={[
                  { name: 'Baseline', c: EMER, pts: W('mp:b', 40, 70, 12) },
                  { name: 'Easing', c: CYAN, pts: W('mp:e', 45, 80, 12) },
                  { name: 'Tightening', c: GOLD, pts: W('mp:t', 30, 60, 12) },
                  { name: 'Stress', c: RED, pts: W('mp:s', 20, 55, 12) },
                ]} />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2 text-[8px]" style={{ borderColor: LINE }}>
              {[['Interbank Liquidity', usd(br.tsaBalanceBn), 'Healthy', EMER], ['Banking Stress Index', `${f1(wave(`tro:bsi:${id}`, ts, 1.2, 4.5))}`, 'Low Risk', EMER], ['Payment Rails', `${br.reconciledPct}%`, 'Operational', EMER], ['Capital Flows', usd(wave(`tro:cap:${id}`, ts, 0.4, 2.6)), 'Net Inflow', EMER], ['Currency Defense', 'Active', 'Strong', EMER], ['Payment Volume', `${Math.round(wave(`tro:pv:${id}`, ts, 90, 160))}M`, '+23.4%', INK]].map(([l, v, s, c]) => (
                <div key={l as string} className="rounded-[2px] border px-1.5 py-1" style={{ borderColor: LINE }}>
                  <div className="text-[7px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div>
                  <div className="font-mono text-[10px]" style={{ color: c as string }}>{v}</div>
                  <div style={{ color: SOFT }}>{s}</div>
                </div>
              ))}
            </div>
          </Mod>

          {/* 3 — Tax & Revenue Intelligence */}
          <Mod n={3} title="Tax & Revenue Intelligence">
            <div className="grid grid-cols-4 gap-1.5">
              <Stat l="Total Revenue (YTD)" v={usd(revYtd)} s={`+${f1(wave(`tro:trd:${id}`, ts, 6, 16))}%`} c={INK} />
              <Stat l="Collection Eff." v={`${rv.collectionRatePct}%`} s="High" c={EMER} />
              <Stat l="Compliance Rate" v={`${Math.round(rv.customsThroughputPct)}%`} s="Good" c={GOLD} />
              <Stat l="Revenue Gap" v={usd(rv.arrearsBn)} s={`${f1(rv.arrearsBn / revYtd * 100)}%`} c={AMBER} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Revenue Breakdown (YTD)</div>
                <Bars rows={taxBreakdown.map(b => ({ l: b.label, v: `${b.v}%`, pct: b.v * 3.4 }))} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Ring value={Math.min(99, 60 + fa.fraudSignals * 4)} label="AI Fraud" color={fa.fraudSignals > 6 ? RED : GOLD} />
                  <div className="text-[8px]" style={{ color: SOFT }}>Fraud scoring<br />+5 vs last month</div>
                </div>
                <Donut size={84} total={usd(revYtd)} sub="total" segs={sectors} />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-[8px]" style={{ borderColor: LINE }}>
              <span style={{ color: MUT }}>Compliance Monitor</span>
              <span className="font-mono text-[11px]" style={{ color: EMER }}>{f1(rv.collectionRatePct + 6)}%</span>
              <Spark pts={W('cm', 80, 99, 12)} color={EMER} />
            </div>
          </Mod>

          {/* 4 — National Procurement Grid */}
          <Mod n={4} title="National Procurement Grid">
            <div className="grid grid-cols-4 gap-1.5">
              <Stat l="Active Contracts" v={pc.activeTenders.toLocaleString()} s="+245" c={INK} />
              <Stat l="Total Value" v={usd(wave(`tro:tv:${id}`, ts, 50, 90))} c={INK} />
              <Stat l="Avg Vendor Score" v={`${pc.integrityPct}`} s="Good" c={EMER} />
              <Stat l="Savings (YTD)" v={usd(wave(`tro:sv:${id}`, ts, 1.5, 4.5))} s="+11.3%" c={EMER} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Lifecycle</div>
                <Donut size={84} total={`${pc.contractsAwarded}`} sub="awarded" segs={lifecycle} />
              </div>
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Network</div>
                <NodeGraph seedKey={`tro:png:${id}`} color={CYAN} />
              </div>
              <div>
                <div className="text-[7.5px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>Corruption Risk</div>
                {[['High', pc.flaggedContracts, RED], ['Medium', 27, GOLD], ['Low', 156, EMER]].map(([l, v, c]) => (
                  <div key={l as string} className="mt-1 flex justify-between text-[8px]"><span style={{ color: c as string }}>● {l} Risk</span><span style={{ color: INK }}>{v as number}</span></div>
                ))}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2 text-[8px]" style={{ borderColor: LINE }}>
              {[['Capital Projects', 'Highway Ph.2 · 67%'], ['Tender Intelligence', `${(1247).toLocaleString()} open`], ['Vendor Integrity', `${(8942).toLocaleString()} certified`]].map(([l, v]) => (
                <div key={l} className="rounded-[2px] border px-1.5 py-1" style={{ borderColor: LINE }}>
                  <div className="text-[7px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div>
                  <div style={{ color: INK }}>{v}</div>
                </div>
              ))}
            </div>
          </Mod>

          {/* 5 — Public Expenditure Control */}
          <Mod n={5} title="Public Expenditure Control">
            <div className="grid grid-cols-[1.1fr_1fr] gap-3">
              <div>
                <Stat l="Total Expenditure (YTD)" v={usd(expYtd)} s={`${bg.executionPct}% of Budget`} c={INK} />
                <div className="mt-2 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Ministry Spending (YTD)</div>
                <div className="mt-1">
                  <Bars accent={GOLD} rows={bg.byMinistry.map(m => ({ l: m.ministry, v: `${m.execPct}%`, pct: m.execPct }))} />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Gauge value={bg.executionPct} label="Budget Burn" color={bg.executionPct >= 80 ? EMER : GOLD} />
                <div className="grid w-full grid-cols-2 gap-1.5 text-[8px]">
                  {[['Approvals 24H', '156'], ['Pending', usd(4.2)], ['Approved', usd(21.6)], ['Subsidy', `${usd(18.7)} 92%`]].map(([l, v]) => (
                    <div key={l} className="rounded-[2px] border px-1.5 py-1" style={{ borderColor: LINE }}>
                      <div className="text-[7px] uppercase" style={{ color: MUT }}>{l}</div><div style={{ color: INK }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex w-full items-center justify-between border-t pt-1.5 text-[8px]" style={{ borderColor: LINE }}>
                  <span style={{ color: MUT }}>Public Fund Risk</span>
                  <Gauge value={62 + fa.openFindings} label="" color={GOLD} />
                </div>
              </div>
            </div>
          </Mod>

          {/* 6 — Economic Intelligence Center */}
          <Mod n={6} title="Economic Intelligence Center">
            <div className="grid grid-cols-4 gap-1.5">
              <Stat l="GDP Growth (Fcst)" v={`${f1(wave(`tro:gdp:${id}`, ts, 2.4, 5.6))}%`} s="FY 2025" c={EMER} />
              <Stat l="GDP Simulation" v={`${f1(wave(`tro:gds:${id}`, ts, 3, 5.4))}%`} s="Optimistic" c={CYAN} />
              <Stat l="Inflation Fcst" v={`${inflation}%`} s="FY 2025" c={GOLD} />
              <Stat l="Current Account" v={`-${f1(wave(`tro:ca:${id}`, ts, 0.4, 2.4))}%`} s="of GDP" c={AMBER} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Sector Performance (YoY)</div>
                <Bars rows={['Agriculture', 'Industry', 'Manufacturing', 'Services', 'Construction', 'Mining'].map((s, i) => ({ l: s, v: `${f1(wave(`tro:sp:${id}:${i}`, ts, 2.5, 6.4))}%`, pct: wave(`tro:sp:${id}:${i}`, ts, 25, 92) }))} />
              </div>
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Growth Forecast (5Y)</div>
                <MultiLine series={[{ name: 'Forecast', c: EMER, pts: W('gf', 35, 80, 5) }, { name: 'Stress', c: RED, pts: W('gfs', 25, 60, 5) }]} />
                <div className="mt-2 flex items-center justify-between text-[8px]">
                  <span style={{ color: MUT }}>Strategic Reserves Impact</span>
                  <span className="font-mono" style={{ color: EMER }}>+{usd(2.8)} Positive</span>
                </div>
              </div>
            </div>
          </Mod>

          {/* 7 — Citizen Finance Portal */}
          <Mod n={7} title="Citizen Finance Portal">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {[['Taxpayer', '◈'], ['Business', '▤'], ['Benefits', '✚'], ['Pension', '◷'], ['Wallet', '▣'], ['Grants', '◇'], ['History', '↻'], ['Refunds', '⤺']].map(([l, ic]) => (
                <div key={l} className="rounded-[3px] border px-1.5 py-2 text-center" style={{ borderColor: LINE, background: PANEL2 }}>
                  <div className="text-[13px]" style={{ color: EMER }} aria-hidden>{ic}</div>
                  <div className="mt-1 text-[8px]" style={{ color: SOFT }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5 border-t pt-2 text-[8px]" style={{ borderColor: LINE }}>
              {[['Registered Users', `${cf.satisfactionPct >= 0 ? '' : ''}${f1(wave(`tro:ru:${id}`, ts, 18, 32))}M`, '+6.2%'], ['Digital Txns 24H', `${f1(cf.paymentsTodayM * 2.4)}M`, '+12.4%'], ['Payments 24H', usd(cf.paymentsTodayM * 5), '+9.8%'], ['Satisfaction', `${f1(cf.satisfactionPct / 20)}/5`, ''], ['System Uptime', `${cf.portalUptime}%`, '']].map(([l, v, s]) => (
                <div key={l} className="rounded-[2px] border px-1.5 py-1" style={{ borderColor: LINE }}>
                  <div className="text-[7px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div>
                  <div className="font-mono text-[10px]" style={{ color: INK }}>{v}</div>
                  {s ? <div style={{ color: EMER }}>{s}</div> : null}
                </div>
              ))}
            </div>
          </Mod>

          {/* 8 — Financial Crime & Audit Command */}
          <Mod n={8} title="Financial Crime & Audit Command">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Suspicious Alerts (24H)</div>
                <div className="font-mono text-[20px]" style={{ color: RED }}>{Math.round(wave(`tro:sa:${id}`, ts, 60, 180))} <span className="text-[9px]" style={{ color: SOFT }}>+32%</span></div>
                {[['High', 18, RED], ['Medium', 43, GOLD], ['Low', 67, EMER]].map(([l, v, c]) => (
                  <div key={l as string} className="mt-1 flex justify-between text-[8px]"><span style={{ color: c as string }}>● {l} Risk</span><span style={{ color: INK }}>{v as number}</span></div>
                ))}
              </div>
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Transaction Network</div>
                <NodeGraph seedKey={`tro:stn:${id}`} color={RED} />
              </div>
              <div className="flex items-center gap-2">
                <Ring value={Math.min(95, 55 + fa.openFindings)} label="AML" color={RED} />
                <div className="space-y-0.5 text-[8px]">
                  {[['Watchlist Hits', 45], ['Sanction Hits', 17], ['PEP Matches', 11], ['Structuring', 23]].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between gap-3"><span style={{ color: MUT }}>{l}</span><span style={{ color: INK }}>{v as number}</span></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 border-t pt-2 text-[8px]" style={{ borderColor: LINE }}>
              {[['Procurement Fraud', `${pc.flaggedContracts} · ${usd(8.7)}`.replace('B', 'M')], ['Public Fund Misuse', `31 · ${usd(3.1)}`.replace('B', 'M')], ['Audit Workspace', `${fa.openFindings} open`], ['Compliance Engine', `${fa.chainIntactPct}%`]].map(([l, v]) => (
                <div key={l} className="rounded-[2px] border px-1.5 py-1" style={{ borderColor: LINE }}>
                  <div className="text-[7px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div>
                  <div className="font-mono text-[10px]" style={{ color: INK }}>{v}</div>
                </div>
              ))}
            </div>
          </Mod>
        </div>

        {/* Right rail */}
        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: LINE }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: INK }}>National Alerts</span>
              <span className="text-[8px]" style={{ color: GOLD }}>View All</span>
            </div>
            <div className="space-y-2 p-2.5">
              {alerts.map(a => (
                <div key={a.t} className="text-[9px]">
                  <span className="text-[7.5px] font-bold uppercase tracking-wider" style={{ color: a.lvl === 'High' ? RED : GOLD }}>{a.lvl}</span>
                  <div style={{ color: SOFT }}>{a.t}</div>
                  <div className="text-[7.5px]" style={{ color: MUT }}>{a.at} AM</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: LINE }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: INK }}>AI Recommendations</span>
              <span className="text-[8px]" style={{ color: GOLD }}>View All</span>
            </div>
            <div className="space-y-2 p-2.5">
              {recs.map(([t, imp]) => (
                <div key={t} className="flex items-start justify-between gap-2 text-[9px]">
                  <span style={{ color: SOFT }}>● {t}</span>
                  <span className="shrink-0 text-[7.5px] font-bold uppercase" style={{ color: imp === 'High' ? EMER : GOLD }}>{imp} Impact</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
            <div className="border-b px-3 py-2" style={{ borderColor: LINE }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: INK }}>Market &amp; Economic Watch</span>
            </div>
            <div className="space-y-1.5 p-2.5">
              {market.map(([l, v, d]) => (
                <div key={l} className="flex items-center justify-between gap-2 text-[9px]">
                  <span style={{ color: SOFT }}>{l}</span>
                  <span className="flex items-center gap-2">
                    <Spark pts={W(`mk:${l}`, 40, 90, 8)} color={d >= 0 ? EMER : RED} w={36} h={12} />
                    <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                    <span className="w-12 text-right font-mono tabular-nums" style={{ color: d >= 0 ? EMER : RED }}>{d >= 0 ? '+' : ''}{d}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: LINE }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: INK }}>System Feed</span>
              <span className="text-[8px]" style={{ color: GOLD }}>View All</span>
            </div>
            <div className="space-y-1.5 p-2.5">
              {feed.map(([t, e]) => (
                <div key={e} className="flex gap-2 text-[8.5px]">
                  <span className="font-mono shrink-0" style={{ color: MUT }}>{t}</span>
                  <span style={{ color: SOFT }}>{e}</span>
                </div>
              ))}
              <div className="mt-1 border-t pt-1.5 text-[7.5px] uppercase tracking-wider" style={{ borderColor: LINE, color: MUT }}>
                Data as of {hh} <span style={{ color: EMER }}>● Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Classification footer ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border px-4 py-2 text-[8px] uppercase tracking-[0.16em]"
        style={{ borderColor: LINE, background: PANEL }}>
        <span style={{ color: MUT }}>Data Classification <span style={{ color: GOLD }}>Official · Sovereign 🔒</span></span>
        <span className="italic" style={{ color: SOFT, fontFamily: SERIF, textTransform: 'none', letterSpacing: 0 }}>
          Safeguard the Nation&rsquo;s resources. Allocate with discipline. Preserve sovereignty for generations.
        </span>
        <span style={{ color: MUT }}>Encryption <span style={{ color: EMER }}>Quantum Secure 🛡</span></span>
      </div>
    </div>
  );
}
