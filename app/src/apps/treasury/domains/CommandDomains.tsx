'use client';

// Treasury command-tier surfaces. 4 domains: fiscal-command,
// single-account-overview, macro-stability, fiscal-forecasting.
// Each is a focused operational view consuming the live engine.

import * as React from 'react';
import { fiscalCommand, bankingRails, treasuryCommand } from '@/lib/gov/treasury-systems';
import { fiscalExecutionBoard } from '@/lib/gov/fiscal-execution';
import { LedgerFrame, KpiStrip, BrassRule, TREASURY_DS } from '@/apps/treasury/design-system/treasury-ds';
import { seed, wave } from '@/lib/telemetry';

// ⌘ I — Fiscal Command
export function FiscalCommandSurface({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const c = fiscalCommand(id, ts);
  const tc = treasuryCommand(id, ts);
  return (
    <LedgerFrame archetype="command" ref="TR-CMD-01" title="Fiscal Command" subtitle="sovereign fiscal posture & macro-stability" fiscalYear={String(new Date(now).getFullYear())}>
      <KpiStrip items={[
        { label: 'Liquidity (days)', value: c.liquidityDays, tone: c.liquidityDays < 30 ? TREASURY_DS.deficit : c.liquidityDays < 90 ? TREASURY_DS.brass : TREASURY_DS.surplus },
        { label: 'Debt-to-GDP', value: `${c.debtToGdp}%`, tone: c.debtToGdp > 80 ? TREASURY_DS.deficit : c.debtToGdp > 60 ? TREASURY_DS.brass : TREASURY_DS.surplus },
        { label: 'Primary balance', value: `${c.primaryBalancePct >= 0 ? '+' : ''}${c.primaryBalancePct}%`, tone: c.primaryBalancePct >= 0 ? TREASURY_DS.surplus : TREASURY_DS.deficit },
        { label: 'FX reserves (Bn)', value: c.fxReservesBn, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="directives in force" />
      <ul className="space-y-1.5">
        {tc.directives.slice(0, 6).map((d, i) => (
          <li key={i} className="grid grid-cols-[80px_1fr_1fr_140px] gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
            <span className="text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: d.priority === 'critical' ? TREASURY_DS.deficit : d.priority === 'priority' ? TREASURY_DS.brass : TREASURY_DS.mut }}>· {d.priority}</span>
            <span style={{ color: TREASURY_DS.parchment }}>{d.title}</span>
            <span className="italic" style={{ color: TREASURY_DS.mut }}>{d.rationale}</span>
            <span className="text-right text-[9.5px] uppercase tracking-[0.18em]" style={{ color: TREASURY_DS.brassDim }}>· {d.target}</span>
          </li>
        ))}
      </ul>
    </LedgerFrame>
  );
}

// ⌘ II — Treasury Single Account overview
export function SingleAccountOverview({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const r = bankingRails(id, ts);
  // Synthesise sub-ledger composition deterministically
  const subLedgers = ['Health', 'Education', 'Defence', 'Interior', 'Transport', 'Energy', 'Agriculture'].map((m, i) => ({
    ministry: m,
    balanceBn: Math.round(wave(`tsa:${m}`, ts, 0.4, 32) * 10) / 10,
    encumberedPct: Math.round(wave(`tsa:enc:${m}`, ts, 38, 88)),
  }));
  const total = subLedgers.reduce((s, x) => s + x.balanceBn, 0);
  return (
    <LedgerFrame archetype="command" ref="TR-CMD-02" title="Treasury Single Account" subtitle="TSA position with per-ministry sub-ledgers" fiscalYear={String(new Date(now).getFullYear())}>
      <KpiStrip items={[
        { label: 'TSA balance', value: `${r.tsaBalanceBn} Bn`, tone: TREASURY_DS.surplus },
        { label: 'Sub-ledger sum', value: `${total.toFixed(1)} Bn`, tone: TREASURY_DS.brass },
        { label: 'Settlement latency', value: `${r.settlementLatencyMin}m`, tone: r.settlementLatencyMin > 30 ? TREASURY_DS.deficit : TREASURY_DS.brass },
        { label: 'Reconciled', value: `${r.reconciledPct}%`, tone: r.reconciledPct < 95 ? TREASURY_DS.deficit : TREASURY_DS.surplus },
      ]} />
      <BrassRule label="sub-ledger composition" />
      <ul className="space-y-1">
        {subLedgers.map(s => (
          <li key={s.ministry} className="grid grid-cols-[1fr_120px_1fr_70px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
            <span style={{ color: TREASURY_DS.parchment }}>{s.ministry}</span>
            <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brass }}>{s.balanceBn.toFixed(1)} Bn</span>
            <div className="h-1.5" style={{ background: TREASURY_DS.vaultDeep }}>
              <div className="h-full" style={{ width: `${s.encumberedPct}%`, background: TREASURY_DS.brass }} />
            </div>
            <span className="text-right tabular-nums text-[10px]" style={{ color: TREASURY_DS.mut }}>{s.encumberedPct}%</span>
          </li>
        ))}
      </ul>
      <BrassRule label="TSA doctrine" />
      <p className="text-[10.5px] italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>
        All government cash flows pass through the Single Treasury Account at the central bank. Sub-ledgers maintain
        the separation of grant, revenue and operational funds without holding physical balances.
      </p>
    </LedgerFrame>
  );
}

// ⌘ III — Macro stability monitor
export function MacroStability({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const c = fiscalCommand(id, ts);
  const indicators = [
    { label: 'Inflation YoY', value: Math.round(wave(`mc:inf:${id}`, ts, 1.2, 12) * 10) / 10, unit: '%', target: 5 },
    { label: 'Policy rate', value: Math.round(wave(`mc:pol:${id}`, ts, 3, 18) * 10) / 10, unit: '%', target: 6 },
    { label: 'GDP growth YoY', value: Math.round(wave(`mc:gdp:${id}`, ts, -2, 8) * 10) / 10, unit: '%', target: 4 },
    { label: 'Unemployment', value: Math.round(wave(`mc:unp:${id}`, ts, 4, 24) * 10) / 10, unit: '%', target: 8 },
    { label: 'Macro stability index', value: c.macroStability, unit: '', target: 70 },
  ];
  return (
    <LedgerFrame archetype="gauge" ref="TR-CMD-03" title="Macro Stability Monitor" subtitle="indicators feeding fiscal policy">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        {indicators.map(i => {
          const delta = i.value - i.target;
          const ok = i.label === 'Unemployment' || i.label === 'Inflation YoY' || i.label === 'Policy rate' ? i.value <= i.target : i.value >= i.target;
          const col = ok ? TREASURY_DS.surplus : Math.abs(delta) > i.target * 0.5 ? TREASURY_DS.deficit : TREASURY_DS.brass;
          return (
            <div key={i.label} className="border px-4 py-3" style={{ borderColor: TREASURY_DS.ruleSoft, background: TREASURY_DS.vaultDeep, borderTop: `2px solid ${col}` }}>
              <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: TREASURY_DS.mut }}>{i.label}</div>
              <div className="mt-1 tabular-nums text-[18px]" style={{ color: col, fontFamily: 'ui-monospace, monospace' }}>{i.value}{i.unit}</div>
              <div className="text-[9px]" style={{ color: TREASURY_DS.mut }}>target {i.target}{i.unit}</div>
            </div>
          );
        })}
      </div>
    </LedgerFrame>
  );
}

// ⌘ IV — Fiscal forecasting (25-year)
export function FiscalForecasting({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const c = fiscalCommand(id, ts);
  const horizon = [5, 10, 15, 20, 25];
  const debtTraj = horizon.map(h => Math.round(c.debtToGdp + wave(`fc:d:${id}`, ts + h * 0.12, -8, 18)));
  const liqTraj = horizon.map(h => Math.round(c.liquidityDays + wave(`fc:l:${id}`, ts + h * 0.13, -20, 30)));
  const fxTraj = horizon.map(h => Math.round((c.fxReservesBn + wave(`fc:f:${id}`, ts + h * 0.14, -20, 40)) * 10) / 10);
  return (
    <LedgerFrame archetype="gauge" ref="TR-CMD-04" title="Fiscal Forecasting" subtitle="25-year sovereign fiscal trajectory">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { label: 'Debt-to-GDP (%)', series: debtTraj, color: TREASURY_DS.deficit, inverse: true },
          { label: 'Liquidity (days)', series: liqTraj, color: TREASURY_DS.surplus, inverse: false },
          { label: 'FX reserves (Bn)', series: fxTraj, color: TREASURY_DS.brass, inverse: false },
        ].map(t => {
          const min = Math.min(...t.series); const max = Math.max(...t.series); const rng = Math.max(1, max - min);
          return (
            <div key={t.label} className="border px-4 py-3" style={{ borderColor: TREASURY_DS.ruleSoft, background: TREASURY_DS.vaultDeep }}>
              <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: TREASURY_DS.mut }}>{t.label}</div>
              <div className="mt-3 flex items-end gap-2" style={{ height: '60px' }}>
                {t.series.map((v, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full" style={{ height: `${20 + ((v - min) / rng) * 36}px`, background: t.color, opacity: 0.4 + i * 0.13 }} />
                    <span className="text-[8px] tabular-nums" style={{ color: TREASURY_DS.mut }}>+{horizon[i]}y</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-baseline justify-between text-[10px]">
                <span style={{ color: TREASURY_DS.mut }}>now <span className="tabular-nums" style={{ color: TREASURY_DS.parchment }}>{t.series[0]}</span></span>
                <span style={{ color: TREASURY_DS.mut }}>+25y <span className="tabular-nums" style={{ color: t.color }}>{t.series[t.series.length - 1]}</span></span>
              </div>
            </div>
          );
        })}
      </div>
      <BrassRule label="composite signal" />
      <p className="text-[10.5px] italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>
        Fiscal trajectory is a function of primary balance, debt servicing, demographic shift and reserve adequacy.
        The Treasury revises this forecast quarterly and publishes the supporting econometric scenarios.
      </p>
      {void fiscalExecutionBoard(now)}{void seed}
    </LedgerFrame>
  );
}
