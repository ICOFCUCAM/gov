'use client';

// Domain 8 — Finance & Insurance. Health finance command as a TRUE
// execution system: claims-adjudication funnel, scheme-solvency
// orchestration, interactive fraud-referral queue, reimbursement chains.
// Cinematic sovereign language built to the reference. Distinct rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { healthFinance, healthFinanceExecution } from '@/lib/gov/health-operations';
import { CommandHeader, CommandPanel, KpiSpark, Donut, Sparkline, sc, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import { aiAdvisory } from '@/shared/ai/advisory';
import { waveSeries } from '@/lib/telemetry';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = ACCENT.finance!;

export function HealthFinanceSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const hf = healthFinance(id, ts);
  const fx = healthFinanceExecution(id, ts);
  const [referred, setReferred] = React.useState<Set<string>>(() => new Set());
  const sp = (k: string, lo = 35, hi = 88) => waveSeries(`hfs:${k}`, ts, 18, lo, hi);

  const pTone: Tone = fx.posture === 'distressed' ? 'alert' : fx.posture === 'strained' ? 'warn' : 'ok';
  const adv = aiAdvisory('Health Finance', [
    { label: 'Fraud exposure', value: Math.min(100, fx.fraudExposureM / 3), adverse: true },
    { label: 'Treasury drawdown', value: fx.treasuryDrawdownPct, adverse: true },
    { label: 'Scheme deficits', value: Math.min(100, fx.schemes.filter(s => s.solvency === 'deficit').length * 34), adverse: true },
    { label: 'Reimbursement age', value: Math.min(100, Math.max(...fx.reimbursement.map(r => r.ageDays))), adverse: true },
  ]);
  const at: Tone = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  const kpis: { label: string; value: string; unit?: string; tone: Tone; k: string }[] = [
    { label: 'Insurance Coverage', value: `${hf.insuranceCoveragePct}`, unit: '%', tone: hf.insuranceCoveragePct >= 70 ? 'ok' : 'warn', k: 'cov' },
    { label: 'Claims Pending', value: hf.claimsPending.toLocaleString(), tone: hf.claimsPending > 15000 ? 'alert' : 'warn', k: 'clp' },
    { label: 'Claim SLA Met', value: `${hf.claimsSlaMetPct}`, unit: '%', tone: hf.claimsSlaMetPct >= 80 ? 'ok' : 'warn', k: 'sla' },
    { label: 'Budget Execution', value: `${hf.budgetExecutionPct}`, unit: '%', tone: hf.budgetExecutionPct >= 80 ? 'ok' : 'warn', k: 'bex' },
    { label: 'Treasury Drawdown', value: `${fx.treasuryDrawdownPct}`, unit: '%', tone: fx.treasuryDrawdownPct >= 85 ? 'alert' : 'ok', k: 'trz' },
    { label: 'Fraud Exposure', value: `$${fx.fraudExposureM}M`, tone: fx.fraudExposureM > 90 ? 'alert' : 'warn', k: 'frd' },
    { label: 'Fraud Cases', value: `${fx.fraud.length}`, tone: fx.fraud.some(f => f.tone === 'alert') ? 'alert' : fx.fraud.length ? 'warn' : 'ok', k: 'frc' },
    { label: 'Reimburse Backlog', value: `$${hf.reimbursementBacklogBn}B`, tone: hf.reimbursementBacklogBn > 8 ? 'alert' : 'warn', k: 'rbk' },
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#05100c', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <CommandHeader index={8} title="Finance & Insurance" subtitle="Health Finance Command"
        postureLabel={fx.posture.toUpperCase()} postureTone={pTone} now={now} role={role} accent={ACC} />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {kpis.map(k => <KpiSpark key={k.label} label={k.label} value={k.value} unit={k.unit} tone={k.tone} points={sp(k.k, k.tone === 'alert' ? 50 : 30, k.tone === 'alert' ? 95 : 78)} />)}
      </div>

      {/* Claim pipeline funnel | AI fiscal intelligence */}
      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="Claims adjudication pipeline" meta="submitted → adjudication → approved → paid / denied" accent={ACC} live>
            <div className="space-y-1">
              {fx.claims.map(c => {
                const max = Math.max(...fx.claims.map(x => x.count)) || 1;
                return (
                  <div key={c.stage} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[9px] uppercase tracking-wider text-ink-soft">{c.stage}</span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-[3px]" style={{ background: '#16222e' }}>
                      <span className="block h-full rounded-[3px]" style={{ width: `${(c.count / max) * 100}%`, background: `linear-gradient(90deg,color-mix(in srgb,${sc(c.tone)} 55%,transparent),${sc(c.tone)})`, boxShadow: `0 0 8px ${sc(c.tone)}` }} />
                      <span className="absolute inset-0 flex items-center justify-end px-2 font-mono text-[9px] tabular-nums text-ink">{c.count.toLocaleString()} · ${c.valueM}M</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CommandPanel>
        </div>
        <CommandPanel title="AI fiscal & fraud intelligence" meta={`${adv.confidence}%`} accent={ACC}>
          <div className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(at) }}>{adv.severity}</div>
          <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
          <ul className="mt-1 space-y-0.5">{adv.recommended.map((r, i) => <li key={i} className="text-[8.5px] text-ink-soft">▸ {r}</li>)}</ul>
        </CommandPanel>
      </div>

      {/* Scheme solvency | Expenditure donut | Reimbursement */}
      <div className="grid gap-2 xl:grid-cols-3">
        <CommandPanel title="Insurance-scheme solvency" meta="claims-ratio · collection" accent={ACC}>
          <div className="space-y-1">
            {fx.schemes.map(s => (
              <div key={s.scheme} className="flex items-center gap-2 text-[9px]">
                <span className="w-28 shrink-0 truncate text-ink-soft">{s.scheme}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, s.claimsRatioPct)}%`, background: sc(s.tone), boxShadow: `0 0 6px ${sc(s.tone)}` }} /></span>
                <span className="w-10 shrink-0 text-right text-[7.5px] font-bold uppercase" style={{ color: sc(s.tone) }}>{s.solvency}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Expenditure breakdown" meta="scheme coverage" accent={ACC}>
          <Donut total={fx.schemes.length} label="schemes" size={108}
            segments={fx.schemes.slice(0, 5).map(s => ({ label: s.scheme, value: Math.round(s.coveredM), tone: s.tone }))} />
        </CommandPanel>
        <CommandPanel title="Reimbursement chains" meta="tier · owed · age" accent={ACC}>
          <div className="space-y-1">
            {fx.reimbursement.map(r => (
              <div key={r.tier} className="flex items-center gap-2 text-[9px]">
                <span className="w-24 shrink-0 truncate text-ink-soft">{r.tier}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, r.owedM / 5)}%`, background: sc(r.tone) }} /></span>
                <span className="w-16 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(r.tone) }}>${r.owedM}M·{r.ageDays}d</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <CommandPanel title="Fraud-detection case queue" meta="exposure-ordered · refer for prosecution" accent={ACC} live>
        {fx.fraud.length === 0 ? (
          <p className="text-[10px] text-ink-muted">No active fraud cases — claims-integrity surveillance nominal.</p>
        ) : (
          <div className="space-y-1.5">
            {fx.fraud.map(f => {
              const done = f.status === 'referred' || referred.has(f.id);
              return (
                <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2.5 py-1.5"
                  style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `3px solid ${sc(done ? 'ok' : f.tone)}`, background: 'rgba(20,32,46,0.35)' }}>
                  <span className="font-mono text-[8.5px] tabular-nums text-ink-muted">{f.id}</span>
                  <span className="text-[10px] font-medium text-ink">{f.pattern}</span>
                  <span className="text-[8.5px] text-ink-muted">${f.exposureM}M · {f.confidencePct}% conf</span>
                  {done ? (
                    <span className="ml-auto text-[8px] font-bold uppercase tracking-wider" style={{ color: sc('ok') }}>✓ referred</span>
                  ) : (
                    <button onClick={() => setReferred(prev => new Set(prev).add(f.id))}
                      className="focus-ring ml-auto rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                      style={{ borderColor: ACC, color: ACC }}>Refer for prosecution</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CommandPanel>

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
