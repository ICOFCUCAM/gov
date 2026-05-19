'use client';

// Domain 8 — Finance & Insurance Command. Sovereign health-finance
// operations built to the benchmark: revenue/expenditure command strip,
// financial summary, revenue & budget analytics, claims, policy
// portfolio, premium collection, top insurers, cash-flow, provider
// payments, risk exposure and AI financial insights. Deterministic.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { DispatchChannel } from '@/apps/_shared/InstitutionChain';
import { healthFinanceExecution } from '@/lib/gov/health-operations';
import { CommandHeader, CommandPanel, Sparkline, Donut, TrendChart, RingGauge, sc, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import { wave, waveSeries } from '@/lib/telemetry';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = ACCENT.finance!;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function Kpi({ l, v, s, t, k, ts }: { l: string; v: string; s: string; t: Tone; k: string; ts: number }) {
  const up = s.includes('▲') || s.includes('↑');
  return (
    <div className="flex flex-col justify-between rounded-[4px] border px-2 py-1.5" style={{ borderColor: 'rgba(84,208,143,0.18)', background: 'rgba(8,22,16,0.55)' }}>
      <div className="truncate text-[7px] font-bold uppercase tracking-[0.12em] text-ink-muted">{l}</div>
      <div className="mt-0.5 flex items-end justify-between gap-1">
        <span className="font-mono text-[20px] font-bold leading-none tabular-nums" style={{ color: sc(t), textShadow: `0 0 10px color-mix(in srgb,${sc(t)} 45%,transparent)` }}>{v}</span>
        <Sparkline points={waveSeries(`fin:${k}`, ts, 16, 30, 85)} tone={t} width={42} height={15} />
      </div>
      <div className="truncate text-[7px]" style={{ color: up ? sc('ok') : sc('warn') }}>{s}</div>
    </div>
  );
}
function Row({ l, a, b, t }: { l: string; a: string; b?: string; t?: Tone }) {
  return (
    <div className="flex items-center gap-2 text-[8.5px]">
      <span className="min-w-0 flex-1 truncate text-ink-soft">{l}</span>
      <span className="font-mono tabular-nums text-ink-muted">{a}</span>
      {b ? <span className="w-12 shrink-0 text-right font-mono tabular-nums" style={{ color: t ? sc(t) : 'rgb(var(--c-ink-soft))' }}>{b}</span> : null}
    </div>
  );
}
function MetaBar({ pct, tone }: { pct: number; tone: Tone }) {
  return <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: '#0c1c16' }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: sc(tone), boxShadow: `0 0 5px ${sc(tone)}` }} /></span>;
}

export function HealthFinanceSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const fx = healthFinanceExecution(id, ts);
  const pTone: Tone = fx.posture === 'distressed' ? 'alert' : fx.posture === 'strained' ? 'warn' : 'ok';
  const ws = (k: string, lo: number, hi: number) => waveSeries(`fin:${k}`, ts, 12, lo, hi);

  const kpis: { l: string; v: string; s: string; t: Tone; k: string }[] = [
    { l: 'Total Revenue (YTD)', v: '$2.84B', s: '▲ 12.6% vs last year', t: 'ok', k: 'rev' },
    { l: 'Total Expenditure (YTD)', v: '$2.31B', s: '▲ 8.4% vs last year', t: 'warn', k: 'exp' },
    { l: 'Net Surplus (YTD)', v: '$532M', s: '▲ 18.7% vs last year', t: 'ok', k: 'sur' },
    { l: 'Claim Ratio', v: '72.4%', s: '▼ 5.2% vs last year', t: 'ok', k: 'clr' },
    { l: 'Loss Ratio', v: '64.8%', s: '▼ 4.1% vs last year', t: 'ok', k: 'lsr' },
    { l: 'Combined Ratio', v: '89.2%', s: '▼ 3.6% vs last year', t: 'warn', k: 'cmr' },
    { l: 'Cash & Investments', v: '$1.42B', s: '▲ 9.3% vs last year', t: 'ok', k: 'csh' },
    { l: 'Outstanding Payables', v: '$285M', s: '▼ 7.8% vs last year', t: 'ok', k: 'pay' },
  ];
  const revenue = [
    { label: 'Government Allocation', pct: 42.3, amt: '$1.20B', tone: 'info' as Tone },
    { label: 'Insurance Premiums', pct: 28.7, amt: '$0.82B', tone: 'ok' as Tone },
    { label: 'Patient Payments', pct: 15.6, amt: '$0.44B', tone: 'warn' as Tone },
    { label: 'Grants & Donations', pct: 7.8, amt: '$0.22B', tone: 'alert' as Tone },
    { label: 'Other Income', pct: 5.6, amt: '$0.16B', tone: 'info' as Tone },
  ];
  const budget = [
    ['Personnel Cost', '$1.25B', '$1.02B', 81.6], ['Medical Supplies', '$0.68B', '$0.52B', 76.5],
    ['Infrastructure', '$0.47B', '$0.36B', 76.6], ['Operations', '$0.33B', '$0.25B', 75.8],
    ['IT & Technology', '$0.12B', '$0.08B', 66.7], ['Other Expenses', '$0.10B', '$0.08B', 80.0],
  ] as const;
  const portfolio = [
    { label: 'Health Insurance', pct: 60.4, n: '755K', tone: 'ok' as Tone },
    { label: 'Life Insurance', pct: 22.8, n: '285K', tone: 'info' as Tone },
    { label: 'Disability Insurance', pct: 10.6, n: '133K', tone: 'warn' as Tone },
    { label: 'Critical Illness', pct: 3.7, n: '46K', tone: 'alert' as Tone },
    { label: 'Others', pct: 2.5, n: '31K', tone: 'info' as Tone },
  ];
  const insurers = [
    ['HealthSecure Insurance', '324K', '$212M', 25.9], ['MediLife Assurance', '287K', '$186M', 22.7],
    ['CarePlus Insurance', '198K', '$129M', 15.7], ['Wellness Protect', '156K', '$101M', 12.3],
    ['LifeGuard Assurance', '124K', '$81M', 9.9], ['Others', '167K', '$111M', 13.5],
  ] as const;
  const providers = [['Hospitals', 62.3], ['Clinics', 18.7], ['Laboratories', 9.6], ['Pharmacies', 6.4], ['Others', 3.0]] as const;
  const risks = [
    ['Claim Cost Inflation', 'High', '$320M', 'alert'], ['Regulatory Compliance', 'Medium', '$180M', 'warn'],
    ['Fraud & Abuse', 'Medium', '$95M', 'warn'], ['Investment Risk', 'Low', '$45M', 'ok'],
  ] as const;
  const aiInsights = [
    'Claim ratio improved 5.2% vs last year on better claims management.',
    `Pharmaceutical expenses trending 9.3% over budget — review recommended.`,
    'Premium collection rate above target with consistent improvement.',
    `High-risk claims detected in ${fx.fraud.length || 124} cases · potential savings $2.8M.`,
    'Cash reserves healthy — support ~6.4 months of operations.',
  ];
  const cf = [['Opening', '$620M', 18, 'info'], ['Inflow', '$3.12B', 92, 'ok'], ['Outflow', '$2.36B', 70, 'alert'], ['Net Flow', '$760M', 30, 'warn'], ['Closing', '$1.02B', 38, 'ok']] as const;

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#04100b', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <CommandHeader index={8} title="Finance & Insurance Command" subtitle="Sovereign Healthcare System · Active · Predict · Optimize"
        postureLabel={fx.posture.toUpperCase()} postureTone={pTone} now={now} role={role} accent={ACC} />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {kpis.map(k => <Kpi key={k.l} {...k} ts={ts} />)}
      </div>

      {/* Financial summary | Revenue breakdown | Budget vs actual */}
      <div className="grid gap-2 xl:grid-cols-3">
        <CommandPanel title="Financial Summary (YTD)" meta="Year to Date" accent={ACC} live>
          <TrendChart height={150} labels={[MON[0]!, MON[5]!, MON[11]!]} series={[
            { name: 'Revenue', points: ws('sumr', 45, 92), tone: 'ok' },
            { name: 'Expenditure', points: ws('sume', 40, 80), tone: 'alert' },
            { name: 'Net Surplus', points: ws('sums', 20, 55), tone: 'info' },
          ]} />
        </CommandPanel>
        <CommandPanel title="Revenue Breakdown" meta="$2.84B total" accent={ACC}>
          <div className="flex items-center gap-2">
            <Donut total={2.84} label="$B" size={104} segments={revenue.map(r => ({ label: r.label, value: r.pct, tone: r.tone }))} />
            <div className="min-w-0 flex-1 space-y-0.5">
              {revenue.map(r => (
                <div key={r.label} className="flex items-center gap-1 text-[7.5px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sc(r.tone) }} />
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{r.label}</span>
                  <span className="font-mono text-ink-muted">{r.pct}%</span>
                  <span className="w-12 text-right font-mono text-ink-soft">{r.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </CommandPanel>
        <CommandPanel title="Budget vs Actual (YTD)" meta="View Report" accent={ACC}>
          <div className="space-y-0.5 text-[8px]">
            <Row l="Total Budget" a="$2.95B" />
            <Row l="Actual Amount" a="$2.31B" />
            <div className="flex items-center gap-2"><span className="min-w-0 flex-1 text-ink-soft">Budget Utilization</span><span className="font-mono text-ink-muted">78.3%</span></div>
            <MetaBar pct={78.3} tone="ok" />
          </div>
          <div className="mt-1.5 space-y-0.5 border-t pt-1" style={{ borderColor: 'rgba(84,208,143,0.16)' }}>
            <div className="flex items-center gap-1 text-[6.5px] font-bold uppercase tracking-wider text-ink-muted"><span className="min-w-0 flex-1">Category</span><span className="w-10 text-right">Budget</span><span className="w-10 text-right">Actual</span><span className="w-14 text-right">Util</span></div>
            {budget.map(([c, b, a, u]) => (
              <div key={c} className="flex items-center gap-1 text-[7.5px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{c}</span>
                <span className="w-10 text-right font-mono text-ink-muted">{b}</span>
                <span className="w-10 text-right font-mono text-ink-muted">{a}</span>
                <span className="w-14 shrink-0"><span className="flex items-center gap-1"><span className="block h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#0c1c16' }}><span className="block h-full" style={{ width: `${u}%`, background: sc(u >= 80 ? 'warn' : 'ok') }} /></span><span className="font-mono text-[6.5px] text-ink-muted">{u}%</span></span></span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      {/* Claims | Policy portfolio | Premium collection | Top insurers */}
      <div className="grid gap-2 xl:grid-cols-4">
        <CommandPanel title="Claims Overview" accent={ACC} live>
          <div className="grid grid-cols-2 gap-1">
            {[['Total Claims', '248,532', 'ok'], ['Claims Paid', '$1.67B', 'ok'], ['Pending', `${fx.claims.find(c => c.stage === 'Adjudication')?.count.toLocaleString() ?? '18,743'}`, 'warn'], ['Rejection', '3.2%', 'ok']].map(([l, v, t]) => (
              <div key={l} className="rounded-[3px] border px-1.5 py-1" style={{ borderColor: 'rgba(84,208,143,0.16)', background: 'rgba(0,0,0,0.22)' }}>
                <div className="text-[6.5px] uppercase text-ink-muted">{l}</div>
                <div className="font-mono text-[12px] font-bold tabular-nums" style={{ color: sc(t as Tone) }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-1.5"><div className="mb-0.5 text-[7px] font-bold uppercase tracking-wider text-ink-soft">Claims Amount Trend</div>
            <TrendChart height={66} series={[{ name: 'Paid', points: ws('clp', 40, 85), tone: 'ok' }, { name: 'Pending', points: ws('clpn', 25, 55), tone: 'warn' }]} /></div>
        </CommandPanel>
        <CommandPanel title="Insurance Policy Portfolio" meta="1.25M policies" accent={ACC}>
          <Donut total={1.25} label="M total" size={96} segments={portfolio.map(p => ({ label: p.label, value: p.pct, tone: p.tone }))} />
          <div className="mt-1 grid grid-cols-3 gap-1 border-t pt-1 text-center text-[7px]" style={{ borderColor: 'rgba(84,208,143,0.16)' }}>
            <div><div className="font-mono text-[10px] text-ink">1.18M</div><div className="text-ink-muted">Active</div></div>
            <div><div className="font-mono text-[10px] text-ink">42,316</div><div className="text-ink-muted">Lapsed</div></div>
            <div><div className="font-mono text-[10px] text-ink">85,642</div><div className="text-ink-muted">New YTD</div></div>
          </div>
        </CommandPanel>
        <CommandPanel title="Premium Collection (YTD)" meta="View Report" accent={ACC} live>
          <div className="flex gap-2">
            <div><div className="text-[6.5px] uppercase text-ink-muted">Total Premiums</div><div className="font-mono text-[15px] font-bold text-ink">$820M</div><div className="text-[7px]" style={{ color: sc('ok') }}>▲ 13.4%</div></div>
            <div><div className="text-[6.5px] uppercase text-ink-muted">Collection Rate</div><div className="font-mono text-[15px] font-bold" style={{ color: sc('ok') }}>95.6%</div><div className="text-[7px]" style={{ color: sc('ok') }}>▲ 2.8%</div></div>
          </div>
          <div className="mt-1.5 flex h-16 items-end gap-0.5">
            {ws('prem', 30, 95).map((v, i) => <span key={i} className="flex-1 rounded-t-[1px]" style={{ height: `${v}%`, background: `color-mix(in srgb,${ACC} ${50 + v / 2}%,transparent)` }} />)}
          </div>
        </CommandPanel>
        <CommandPanel title="Top Insurers" meta="View All" accent={ACC}>
          <div className="space-y-1">
            {insurers.map(([n, pol, prem, mk]) => (
              <div key={n} className="text-[7.5px]">
                <div className="flex items-center justify-between"><span className="min-w-0 flex-1 truncate text-ink-soft">{n}</span><span className="font-mono text-ink-muted">{pol} · {prem}</span></div>
                <div className="mt-0.5 flex items-center gap-1"><span className="block h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#0c1c16' }}><span className="block h-full" style={{ width: `${mk * 3}%`, background: sc('info') }} /></span><span className="w-8 text-right font-mono text-ink-muted">{mk}%</span></div>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      {/* Cash flow | Provider payments | Risk exposure | AI insights */}
      <div className="grid gap-2 xl:grid-cols-4">
        <CommandPanel title="Cash Flow Summary (YTD)" meta="View Report" accent={ACC}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8px]">
            <Row l="Cash Inflow" a="$3.12B" /><Row l="Cash Outflow" a="$2.36B" />
            <Row l="Net Cash Flow" a="$760M" /><Row l="Bank Balance" a="$1.02B" />
          </div>
          <div className="mt-1.5 flex h-20 items-end gap-1">
            {cf.map(([l, v, h, t]) => (
              <div key={l} className="flex flex-1 flex-col items-center gap-0.5">
                <span className="w-full rounded-t-[2px]" style={{ height: `${h}%`, background: sc(t as Tone), opacity: 0.8 }} />
                <span className="text-[6px] text-ink-muted">{l}</span>
                <span className="font-mono text-[6px] text-ink-soft">{v}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Provider Payments (YTD)" meta="View All" accent={ACC}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8px]">
            <Row l="Total Payments" a="$1.45B" /><Row l="Paid Providers" a="8,742" />
            <Row l="Avg Payment Days" a="28.6" /><Row l="Pending" a="$112M" />
          </div>
          <div className="mt-1.5 space-y-1 border-t pt-1" style={{ borderColor: 'rgba(84,208,143,0.16)' }}>
            <div className="text-[7px] font-bold uppercase tracking-wider text-ink-soft">By Provider Type</div>
            {providers.map(([l, p]) => (
              <div key={l} className="flex items-center gap-1 text-[7.5px]"><span className="w-16 shrink-0 truncate text-ink-soft">{l}</span><span className="block h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#0c1c16' }}><span className="block h-full" style={{ width: `${p}%`, background: sc('info') }} /></span><span className="w-8 text-right font-mono text-ink-muted">{p}%</span></div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Risk Exposure Summary" accent={ACC}>
          <div className="flex items-center gap-2">
            <RingGauge value={Math.round(wave('fin:risk', ts, 40, 60))} label="risk" tone="warn" size={62} sub="MED" />
            <div className="min-w-0 flex-1 space-y-0.5 text-[7.5px]">
              <div className="flex justify-between"><span style={{ color: sc('alert') }}>● High Risk</span><span className="font-mono text-ink-muted">18.2%</span></div>
              <div className="flex justify-between"><span style={{ color: sc('warn') }}>● Medium Risk</span><span className="font-mono text-ink-muted">47.5%</span></div>
              <div className="flex justify-between"><span style={{ color: sc('ok') }}>● Low Risk</span><span className="font-mono text-ink-muted">34.3%</span></div>
            </div>
          </div>
          <div className="mt-1.5 space-y-0.5 border-t pt-1" style={{ borderColor: 'rgba(84,208,143,0.16)' }}>
            {risks.map(([c, lvl, exp, t]) => (
              <div key={c} className="flex items-center gap-1 text-[7.5px]"><span className="min-w-0 flex-1 truncate text-ink-soft">{c}</span><span className="w-12 text-right font-bold uppercase" style={{ color: sc(t as Tone) }}>{lvl}</span><span className="w-10 text-right font-mono text-ink-muted">{exp}</span></div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="AI Financial Insights" meta="View All" accent={ACC} live>
          <div className="space-y-1">
            {aiInsights.map((t, i) => (
              <div key={i} className="flex items-start gap-1.5 rounded-[3px] border px-1.5 py-1 text-[7.5px]" style={{ borderColor: 'rgba(84,208,143,0.16)', background: 'rgba(0,0,0,0.22)', borderLeft: `2px solid ${sc(i === 1 || i === 3 ? 'warn' : 'ok')}` }}>
                <span style={{ color: sc(i === 1 || i === 3 ? 'warn' : 'ok') }}>▸</span>
                <span className="min-w-0 flex-1 text-ink-soft">{t}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <DispatchChannel scope={`health:claimsline:${id}`} now={now} accent={ACC}
        selfTier="MINISTRY" selfName="Claims adjudication" toTier="FACILITY"
        title="Claims ↔ hospitals & insurers — adjudication & reimbursement" />

      <RuntimeQueue
        scope={`${id}:finance`}
        kind="procurement"
        title="Health finance runtime — requisition → adjudicate → authorise → disburse"
        by="Finance Controller"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
