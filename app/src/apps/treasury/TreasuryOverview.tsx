'use client';

// Treasury Overview — the sovereign-treasury command surface, modelled on
// the Ministry of Treasury & Finance benchmark: emblemed header band,
// hero fiscal KPIs, a revenue/expenditure/balance combo chart, allocation
// & reserve-composition donuts, market & economic indicators, revenue
// streams, expenditure categories, a risk monitor, the fiscal calendar
// and a sovereign footer. Pure & deterministic (engine + telemetry only).

import * as React from 'react';
import { fiscalCommand, revenueOps, budgetOps, bankingRails, citizenFinance, fiscalAssurance } from '@/lib/gov/treasury-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const GOLD = '#c9a24a';
const GOLD_DK = '#8f6f2e';
const EMER = '#3fae82';
const EMER_DK = '#2b6f57';
const BG = '#06100d';
const PANEL = '#0a1712';
const LINE = 'rgba(201,162,74,0.16)';
const INK = '#d6e0da';
const SOFT = '#9fb0a8';
const MUT = '#6f7e77';

const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';

function fmtUSD(bn: number): string {
  return `$${bn.toFixed(1)}B`;
}

function Crest({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.7" />
      <circle cx="24" cy="24" r="18" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.4" />
      {/* scales of fiscal stewardship */}
      <line x1="24" y1="12" x2="24" y2="34" stroke={GOLD} strokeWidth="1.4" />
      <line x1="13" y1="17" x2="35" y2="17" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="24" cy="12" r="2.1" fill={GOLD} />
      <path d="M13 17 L9 25 Q13 28 17 25 Z" fill="none" stroke={GOLD} strokeWidth="1.1" />
      <path d="M35 17 L31 25 Q35 28 39 25 Z" fill="none" stroke={GOLD} strokeWidth="1.1" />
      <path d="M19 34 H29 L31 38 H17 Z" fill={GOLD} opacity="0.85" />
    </svg>
  );
}

// Faded classical pediment + colonnade motif (no external asset).
function CapitolMotif() {
  return (
    <svg viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="cap-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD} stopOpacity="0.16" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="100,14 150,38 50,38" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.35" />
      <rect x="48" y="38" width="104" height="4" fill="url(#cap-fade)" />
      {[56, 70, 84, 98, 112, 126, 140].map(x => (
        <rect key={x} x={x} y="42" width="5" height="34" fill="url(#cap-fade)" />
      ))}
      <rect x="48" y="76" width="104" height="5" fill="url(#cap-fade)" />
    </svg>
  );
}

function Panel({ title, action, children, span }: {
  title: string; action?: string; children: React.ReactNode; span?: string;
}) {
  return (
    <section className={`flex flex-col rounded-[4px] border ${span ?? ''}`}
      style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: LINE }}>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: SOFT }}>{title}</h3>
        {action ? <span className="text-[9px] font-medium" style={{ color: GOLD }}>{action} →</span> : null}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

function Hero({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'gold' | 'emer' | 'mut' }) {
  const c = tone === 'emer' ? EMER : tone === 'gold' ? GOLD : INK;
  return (
    <div className="rounded-[4px] border px-4 py-3" style={{ borderColor: LINE, background: PANEL }}>
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUT }}>{label}</div>
      <div className="mt-1.5 font-mono text-[26px] leading-none tabular-nums"
        style={{ color: c, textShadow: `0 0 18px color-mix(in srgb,${c} 35%,transparent)`, fontFamily: SERIF }}>
        {value}
      </div>
      <div className="mt-1 text-[10px]" style={{ color: tone === 'mut' ? GOLD : c }}>{sub}</div>
    </div>
  );
}

// Revenue (emerald) / Expenditure (gold) bars + Balance line, 12 months.
function ComboChart({ rev, exp }: { rev: number[]; exp: number[] }) {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const bal = rev.map((r, i) => r - exp[i]!);
  const maxBar = Math.max(...rev, ...exp) * 1.12;
  const W = 600, H = 210, padB = 24, padT = 8, padL = 22;
  const innerW = W - padL, innerH = H - padB - padT;
  const slot = innerW / 12;
  const bw = slot * 0.3;
  const y = (v: number) => padT + innerH - (v / maxBar) * innerH;
  const balMin = Math.min(...bal), balMax = Math.max(...bal), balSpan = balMax - balMin || 1;
  const yBal = (v: number) => padT + innerH - ((v - balMin) / balSpan) * innerH * 0.82 - innerH * 0.09;
  const balPts = bal.map((v, i) => `${padL + i * slot + slot / 2},${yBal(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 230 }} aria-hidden>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={padL} y1={padT + innerH - f * innerH} x2={W} y2={padT + innerH - f * innerH}
          stroke={LINE} strokeWidth="0.6" />
      ))}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <text key={f} x={padL - 5} y={padT + innerH - f * innerH + 3} textAnchor="end"
          fontSize="8" fill={MUT}>{Math.round(maxBar * f)}</text>
      ))}
      {rev.map((r, i) => {
        const x = padL + i * slot + slot / 2;
        return (
          <g key={i}>
            <rect x={x - bw - 1.5} y={y(r)} width={bw} height={padT + innerH - y(r)} rx="1" fill={EMER} opacity="0.9" />
            <rect x={x + 1.5} y={y(exp[i]!)} width={bw} height={padT + innerH - y(exp[i]!)} rx="1" fill={GOLD} opacity="0.85" />
            <text x={x} y={H - 8} textAnchor="middle" fontSize="8.5" fill={MUT}>{M[i]}</text>
          </g>
        );
      })}
      <polyline points={balPts} fill="none" stroke={INK} strokeWidth="1.4" strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 3px rgba(214,224,218,0.5))' }} />
      {bal.map((v, i) => (
        <circle key={i} cx={padL + i * slot + slot / 2} cy={yBal(v)} r="2.4" fill={BG} stroke={INK} strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function DonutChart({ segments, centerTop, centerSub, size = 150 }: {
  segments: { label: string; pct: number; color: string }[]; centerTop: string; centerSub: string; size?: number;
}) {
  const r = size / 2 - 12, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#15231d" strokeWidth="11" />
        {segments.map((s, i) => {
          const frac = s.pct / 100;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="11"
              strokeDasharray={`${frac * circ} ${circ}`} strokeDashoffset={-acc * circ}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="butt" />
          );
          acc += frac;
          return el;
        })}
        <text x="50%" y="46%" textAnchor="middle" fontSize={size * 0.17} fontWeight="700"
          fill={INK} style={{ fontFamily: SERIF }}>{centerTop}</text>
        <text x="50%" y="60%" textAnchor="middle" fontSize={size * 0.08} fill={MUT}
          className="uppercase" style={{ letterSpacing: '0.12em' }}>{centerSub}</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span style={{ color: SOFT }}>{s.label}</span>
            <span className="ml-auto pl-4 font-mono tabular-nums" style={{ color: INK }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Delta({ d }: { d: number }) {
  if (Math.abs(d) < 0.02) return <span className="text-[9px]" style={{ color: MUT }}>—</span>;
  const up = d > 0;
  return (
    <span className="font-mono text-[9px] tabular-nums" style={{ color: up ? EMER : GOLD }}>
      {up ? '+' : ''}{d.toFixed(2)}% {up ? '↑' : '↓'}
    </span>
  );
}

const RISK_C: Record<string, string> = { Low: EMER, Medium: GOLD, High: '#d8645f' };

export function TreasuryOverview({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const fc = fiscalCommand(id, ts);
  const rv = revenueOps(id, ts);
  const bg = budgetOps(id, ts);
  const br = bankingRails(id, ts);
  const cf = citizenFinance(id, ts);
  const fa = fiscalAssurance(id, ts);

  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const balancePct = Math.round(wave(`tr:fbal:${id}`, ts, -3, 5.5) * 100) / 100;
  const liqMonths = Math.round((fc.liquidityDays / 30) * 10) / 10;

  // Revenue / Expenditure / Balance — 12 month series
  const rev = waveSeries(`tr:rev:${id}`, ts, 12, 22, 49).map(v => Math.round(v));
  const exp = waveSeries(`tr:exp:${id}`, ts, 12, 18, 45).map(v => Math.round(v));

  // Allocation status
  const ceilingBn = Math.round(wave(`tr:ceil:${id}`, ts, 15, 22) * 10) / 10;
  const committed = Math.round(wave(`tr:alc:c:${id}`, ts, 58, 76));
  const disbursed = Math.round(wave(`tr:alc:d:${id}`, ts, 14, 28));
  const pending = Math.max(4, 100 - committed - disbursed);
  const allocatedBn = Math.round(ceilingBn * (0.62 + seed(`tr:alc:${id}`) * 0.16) * 10) / 10;

  // Market & economic indicators (value + YoY delta)
  const ind = (k: string, lo: number, hi: number, dp = 2): { v: number; d: number } => {
    const v = wave(`tr:ind:${k}:${id}`, ts, lo, hi);
    const p = wave(`tr:ind:${k}:${id}`, ts - 0.7, lo, hi);
    const f = (x: number) => Math.round(x * 10 ** dp) / 10 ** dp;
    return { v: f(v), d: f(v - p) };
  };
  const inflation = ind('infl', 1.6, 6.4, 1);
  const gdp = ind('gdp', 2.1, 5.9, 1);
  const policy = ind('pol', 2.75, 6.0, 2);
  const fx = ind('fx', 0.96, 1.05, 3);
  const bond = ind('bond', 3.1, 5.8, 2);

  // Reserve composition (sums to 100)
  const rcFC = 40 + Math.round(seed(`tr:rc:1:${id}`) * 12);
  const rcGold = 20 + Math.round(seed(`tr:rc:2:${id}`) * 10);
  const rcBond = 12 + Math.round(seed(`tr:rc:3:${id}`) * 8);
  const rcOther = Math.max(5, 100 - rcFC - rcGold - rcBond);

  // Revenue streams ($ + delta)
  const streamMeta = [
    { name: 'Tax Revenue', base: 19 },
    { name: 'Customs Duties', base: 5 },
    { name: 'Resource Revenue', base: 3.4 },
    { name: 'Non-Tax Revenue', base: 1.7 },
  ];
  const streams = streamMeta.map((s, i) => ({
    name: s.name,
    amount: Math.round(s.base * (0.85 + seed(`tr:str:${id}:${i}`) * 0.35) * 10) / 10,
    delta: Math.round(wave(`tr:strd:${id}:${i}`, ts, 0.4, 6.2) * 10) / 10,
  }));

  // Expenditure categories ($ + share %)
  const expCats = [
    { name: 'Social Services', w: 32 }, { name: 'Infrastructure', w: 19 },
    { name: 'Defense & Security', w: 15 }, { name: 'Education', w: 11 },
    { name: 'Health', w: 10 }, { name: 'Other Services', w: 13 },
  ];
  const expTotal = Math.round(wave(`tr:expt:${id}`, ts, 14, 19) * 10) / 10;
  const expRows = expCats.map((c, i) => {
    const share = Math.max(4, c.w + Math.round((seed(`tr:exs:${id}:${i}`) - 0.5) * 6));
    return { name: c.name, amount: Math.round(expTotal * (share / 100) * 10) / 10, share };
  });

  // Risk monitor
  const lvl = (a: boolean, w: boolean) => (a ? 'High' : w ? 'Medium' : 'Low');
  const risks: { name: string; level: string }[] = [
    { name: 'Fiscal Risk', level: lvl(fc.tone === 'alert', fc.tone === 'warn') },
    { name: 'Liquidity Risk', level: lvl(fc.liquidityDays < 14, fc.liquidityDays < 30) },
    { name: 'Debt Sustainability', level: lvl(fc.debtToGdp >= 65, fc.debtToGdp >= 50) },
    { name: 'Market Volatility', level: lvl(Math.abs(bond.d) > 0.25, Math.abs(bond.d) > 0.1) },
    { name: 'Compliance Risk', level: lvl(fa.fraudSignals > 6, fa.fraudSignals > 0) },
  ];

  // Fiscal calendar (dates derived from now)
  const addDays = (base: Date, n: number) => {
    const x = new Date(base); x.setDate(x.getDate() + n);
    return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };
  const eom = new Date(clock.getFullYear(), clock.getMonth() + 1, 0);
  const cal = [
    { e: 'Monthly Close', d: eom.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() },
    { e: 'Revenue Forecast Update', d: addDays(clock, 8) },
    { e: 'Expenditure Review', d: addDays(clock, 10) },
    { e: 'Debt Committee', d: addDays(clock, 13) },
    { e: 'Fiscal Council Briefing', d: addDays(clock, 18) },
  ];

  const stable = fc.tone === 'ok';
  const sysC = stable ? EMER : fc.tone === 'warn' ? GOLD : '#d8645f';
  const dataIntegrity = br.reconciledPct >= 99.9 ? 100 : br.reconciledPct;
  const security = fa.chainIntactPct >= 99.5 ? 'Strong' : fa.chainIntactPct >= 98.5 ? 'Guarded' : 'Elevated';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 120px rgba(0,0,0,0.65)' }}>
      {/* ── Sovereign header band ───────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[4px] border" style={{ borderColor: LINE, background: 'linear-gradient(100deg,#081410,#0a1712 60%,#0c1a14)' }}>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-64 opacity-70">
          <CapitolMotif />
        </div>
        <div className="relative flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Crest />
            <div>
              <div className="text-[19px] font-bold uppercase leading-none tracking-[0.12em]" style={{ color: INK, fontFamily: SERIF }}>
                Ministry of Treasury &amp; Finance
              </div>
              <div className="mt-1 text-[8.5px] uppercase tracking-[0.26em]" style={{ color: GOLD }}>
                Fiscal Stewardship · Reserve Protection · Economic Continuity
              </div>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-x-7 gap-y-2">
            <div>
              <div className="text-[8px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUT }}>National Treasury Command</div>
              <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: SOFT }}>Sovereign Financial System</div>
            </div>
            <div>
              <div className="font-mono text-[15px] tabular-nums" style={{ color: INK }}>{hh}</div>
              <div className="text-[8px] tracking-[0.16em]" style={{ color: MUT }}>{dd}</div>
            </div>
            <div>
              <div className="text-[8px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUT }}>Classification</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>Official</div>
            </div>
            <div>
              <div className="text-[8px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUT }}>System Status</div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: sysC }}>
                <span className="h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: sysC }} />
                {stable ? 'Stable' : fc.tone === 'warn' ? 'Strained' : 'Critical'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero fiscal KPIs ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Hero label="Fiscal Balance (YTD)" value={`${balancePct > 0 ? '+' : ''}${balancePct.toFixed(2)}%`}
          sub={balancePct >= 0 ? 'Surplus' : 'Deficit'} tone={balancePct >= 0 ? 'emer' : 'gold'} />
        <Hero label="FX Reserves" value={fmtUSD(fc.fxReservesBn)}
          sub={fc.fxReservesBn >= 25 ? 'Adequate' : 'Tight'} tone="gold" />
        <Hero label="Debt Ratio" value={`${fc.debtToGdp.toFixed(1)}%`}
          sub={fc.debtToGdp < 50 ? 'Sustainable' : fc.debtToGdp < 65 ? 'Watch' : 'Elevated'} tone="gold" />
        <Hero label="Liquidity Position" value={fc.liquidityDays >= 30 ? 'Strong' : fc.liquidityDays >= 14 ? 'Adequate' : 'Tight'}
          sub={`${liqMonths.toFixed(1)} Months`} tone={fc.liquidityDays >= 30 ? 'emer' : 'mut'} />
      </div>

      {/* ── Main grid ───────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-12">
        <Panel title="Revenue, Expenditure & Balance (YTD)" span="xl:col-span-5">
          <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>In Billion USD</div>
          <ComboChart rev={rev} exp={exp} />
          <div className="mt-1 flex items-center gap-4 text-[9px]" style={{ color: SOFT }}>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[1px]" style={{ background: EMER }} />Revenue</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[1px]" style={{ background: GOLD }} />Expenditure</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-px w-3.5" style={{ background: INK }} />Balance</span>
          </div>
        </Panel>

        <Panel title="Allocation Status" action="View Allocation Ledger" span="xl:col-span-4">
          <DonutChart
            centerTop={fmtUSD(allocatedBn)} centerSub={`of ${fmtUSD(ceilingBn)}`}
            segments={[
              { label: 'Committed', pct: committed, color: EMER },
              { label: 'Disbursed', pct: disbursed, color: GOLD },
              { label: 'Pending', pct: pending, color: GOLD_DK },
            ]} />
          <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-2 text-center" style={{ borderColor: LINE }}>
            {[['Allocated', fmtUSD(allocatedBn)], ['Ceiling', fmtUSD(ceilingBn)], ['Utilisation', `${Math.round((allocatedBn / ceilingBn) * 100)}%`]].map(([l, v]) => (
              <div key={l}>
                <div className="text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>{l}</div>
                <div className="mt-0.5 font-mono text-[12px] tabular-nums" style={{ color: INK }}>{v}</div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex flex-col gap-2 xl:col-span-3">
          <Panel title="Market & Economic Indicators">
            <div className="space-y-2">
              {([
                ['Inflation (YoY)', `${inflation.v.toFixed(1)}%`, inflation.d],
                ['GDP Growth (YoY)', `${gdp.v.toFixed(1)}%`, gdp.d],
                ['Policy Rate', `${policy.v.toFixed(2)}%`, 0],
                ['Exchange Rate (USD)', fx.v.toFixed(2), fx.d],
                ['Bond Yield (10Y)', `${bond.v.toFixed(2)}%`, bond.d],
              ] as [string, string, number][]).map(([l, v, d]) => (
                <div key={l} className="flex items-center justify-between gap-2 text-[10px]">
                  <span style={{ color: SOFT }}>{l}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                    <span className="w-16 text-right"><Delta d={d} /></span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Reserve Composition">
            <div className="mb-2 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Total Reserves: {fmtUSD(fc.fxReservesBn)}</div>
            <DonutChart size={108} centerTop={fmtUSD(fc.fxReservesBn)} centerSub="reserves"
              segments={[
                { label: 'Foreign Cash', pct: rcFC, color: EMER },
                { label: 'Gold', pct: rcGold, color: GOLD },
                { label: 'Sovereign Bonds', pct: rcBond, color: EMER_DK },
                { label: 'Other Assets', pct: rcOther, color: GOLD_DK },
              ]} />
          </Panel>
        </div>
      </div>

      {/* ── Operational panels ──────────────────────────────────── */}
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="Revenue Streams (YTD)" action="View Revenue Report">
          <div className="space-y-2.5">
            {streams.map(s => (
              <div key={s.name} className="flex items-center justify-between gap-2 text-[10px]">
                <span style={{ color: SOFT }}>{s.name}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono tabular-nums" style={{ color: INK }}>{fmtUSD(s.amount)}</span>
                  <span className="w-10 text-right font-mono tabular-nums" style={{ color: EMER }}>+{s.delta}%</span>
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Expenditure Categories (YTD)" action="View Expenditure Report">
          <div className="space-y-2">
            {expRows.map(r => (
              <div key={r.name} className="text-[10px]">
                <div className="flex items-center justify-between">
                  <span style={{ color: SOFT }}>{r.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono tabular-nums" style={{ color: INK }}>{fmtUSD(r.amount)}</span>
                    <span className="w-8 text-right font-mono tabular-nums" style={{ color: MUT }}>{r.share}%</span>
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: '#15231d' }}>
                  <span className="block h-full rounded-full" style={{ width: `${r.share}%`, background: GOLD }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Risk Monitor" action="View Risk Dashboard">
          <div className="space-y-2.5">
            {risks.map(r => (
              <div key={r.name} className="flex items-center justify-between gap-2 text-[10px]">
                <span style={{ color: SOFT }}>{r.name}</span>
                <span className="rounded-[2px] px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: RISK_C[r.level], background: `color-mix(in srgb,${RISK_C[r.level]} 14%,transparent)` }}>
                  {r.level}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Fiscal Calendar" action="View Full Calendar">
          <div className="space-y-2.5">
            {cal.map(c => (
              <div key={c.e} className="flex items-center justify-between gap-2 text-[10px]">
                <span style={{ color: SOFT }}>{c.e}</span>
                <span className="font-mono text-[9px] tabular-nums" style={{ color: GOLD }}>{c.d}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Sovereign footer band ───────────────────────────────── */}
      <div className="grid gap-2 rounded-[4px] border p-3 md:grid-cols-4" style={{ borderColor: LINE, background: PANEL }}>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: SOFT }}>Treasury Directive</div>
          <p className="mt-1.5 text-[10px] italic leading-relaxed" style={{ color: SOFT }}>
            &ldquo;Safeguard the Nation&rsquo;s resources. Allocate with discipline. Invest in the
            future. Preserve sovereignty for generations.&rdquo;
          </p>
          <div className="mt-1 text-[8.5px]" style={{ color: MUT }}>— Minister of Treasury &amp; Finance</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: SOFT }}>System Integrity</div>
          <div className="mt-1.5 space-y-1.5 text-[10px]">
            {([['Data Integrity', `${dataIntegrity}%`], ['Uptime', `${cf.portalUptime}%`], ['Security Posture', security]] as [string, string][]).map(([l, v]) => (
              <div key={l} className="flex items-center justify-between">
                <span style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: EMER }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: SOFT }}>Classification</div>
          <div className="mt-1.5 text-[13px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>Official</div>
          <div className="mt-1 text-[9px]" style={{ color: MUT }}>Handle within Ministry Protocols</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: SOFT }}>Authorized By</div>
          <div className="mt-2 text-[18px] italic" style={{ color: INK, fontFamily: SERIF }}>J. M. Sovereign</div>
          <div className="mt-1 border-t pt-1 text-[8.5px]" style={{ borderColor: LINE, color: MUT }}>Minister of Treasury &amp; Finance</div>
        </div>
      </div>
    </div>
  );
}
