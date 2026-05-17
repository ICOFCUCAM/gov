'use client';

// apps/ministry-health/subsystems/HealthFinanceSystem — fiscal health as a
// TRUE execution system: claims-adjudication pipeline, insurance-scheme
// solvency orchestration, fraud-detection case queue with interactive
// referral, reimbursement chains and treasury coordination. Multi-role.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { healthFinance } from '@/lib/gov/health-operations';
import { healthFinanceExecution } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function HealthFinanceSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const hf = healthFinance(id, ts);
  const fx = healthFinanceExecution(id, ts);
  const [referred, setReferred] = React.useState<Set<string>>(() => new Set());

  const pTone: 'ok' | 'warn' | 'alert' = fx.posture === 'distressed' ? 'alert' : fx.posture === 'strained' ? 'warn' : 'ok';
  const adv = aiAdvisory('Health Finance', [
    { label: 'Fraud exposure', value: Math.min(100, fx.fraudExposureM / 3), adverse: true },
    { label: 'Treasury drawdown', value: fx.treasuryDrawdownPct, adverse: true },
    { label: 'Scheme deficits', value: Math.min(100, fx.schemes.filter(s => s.solvency === 'deficit').length * 34), adverse: true },
    { label: 'Reimbursement age', value: Math.min(100, Math.max(...fx.reimbursement.map(r => r.ageDays))), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Health Finance — fiscal command</span>
        <PosturePill label={fx.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">fraud exposure · <span style={{ color: ac(fx.fraudExposureM > 90 ? 'alert' : 'ok') }}>${fx.fraudExposureM}M</span> · treasury drawdown <span className="text-ink-soft">{fx.treasuryDrawdownPct}%</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Insurance coverage', v: `${hf.insuranceCoveragePct}%`, t: hf.insuranceCoveragePct >= 70 ? 'ok' : 'warn' },
        { l: 'Claims pending', v: hf.claimsPending.toLocaleString(), t: hf.claimsPending > 15000 ? 'alert' : 'warn' },
        { l: 'Claims SLA', v: `${hf.claimsSlaMetPct}%`, t: hf.claimsSlaMetPct >= 80 ? 'ok' : 'warn' },
        { l: 'Budget execution', v: `${hf.budgetExecutionPct}%`, t: hf.budgetExecutionPct >= 80 ? 'ok' : 'warn' },
        { l: 'Fraud cases', v: `${fx.fraud.length}`, t: fx.fraud.some(f => f.tone === 'alert') ? 'alert' : fx.fraud.length ? 'warn' : 'ok' },
        { l: 'Reimburse backlog', v: `$${hf.reimbursementBacklogBn}B`, t: hf.reimbursementBacklogBn > 8 ? 'alert' : 'warn' },
      ]} />

      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI fiscal & fraud intelligence · {adv.severity}</span>
          <span className="font-mono text-[9px] tabular-nums text-ink-muted">{adv.confidence}%</span>
        </div>
        <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
        <ul className="mt-0.5 flex flex-wrap gap-x-4">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
      </div>

      <Panel title="Claims adjudication pipeline" meta="submitted → adjudication → approved → paid / denied">
        <div className="flex items-stretch gap-1">
          {fx.claims.map((c, i) => (
            <React.Fragment key={c.stage}>
              <div className="flex-1 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5" style={{ borderLeft: `3px solid ${ac(c.tone)}` }}>
                <div className="text-[7.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{c.stage}</div>
                <div className="font-mono text-[13px] tabular-nums" style={{ color: ac(c.tone) }}>{c.count.toLocaleString()}</div>
                <div className="text-[8px] text-ink-muted">${c.valueM}M</div>
              </div>
              {i < fx.claims.length - 1 ? <span className="self-center text-[9px] text-ink-muted">→</span> : null}
            </React.Fragment>
          ))}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Insurance-scheme solvency" meta="claims-ratio ordered · collection · solvency">
          <div className="space-y-1">
            {fx.schemes.map(s => (
              <div key={s.scheme} className="flex items-center gap-2 text-[10px]">
                <span className="w-40 shrink-0 truncate text-ink">{s.scheme}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, s.claimsRatioPct)}%`, backgroundColor: ac(s.tone) }} /></div>
                <span className="w-24 shrink-0 text-right font-mono tabular-nums text-ink-muted">{s.coveredM}M · {s.collectionPct}%</span>
                <span className="w-14 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: ac(s.tone) }}>{s.solvency}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Reimbursement chains" meta="tier · owed · age">
          <Bars rows={fx.reimbursement.map(r => ({ label: `${r.tier} (${r.ageDays}d)`, pct: Math.min(100, r.owedM / 5), tone: r.tone, tail: `$${r.owedM}M` }))} />
        </Panel>
      </div>

      <Panel title="Fraud-detection case queue" meta="exposure-ordered · refer for prosecution">
        {fx.fraud.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No active fraud cases — claims-integrity surveillance nominal.</p>
        ) : (
          <div className="space-y-1.5">
            {fx.fraud.map(f => {
              const done = f.status === 'referred' || referred.has(f.id);
              return (
                <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(done ? 'ok' : f.tone)}` }}>
                  <span className="font-mono text-[9px] tabular-nums text-ink-muted">{f.id}</span>
                  <span className="text-[11px] font-medium text-ink">{f.pattern}</span>
                  <span className="text-[9px] text-ink-muted">${f.exposureM}M · {f.confidencePct}% conf</span>
                  {done ? (
                    <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: ac('ok') }}>✓ referred</span>
                  ) : (
                    <button
                      onClick={() => setReferred(prev => new Set(prev).add(f.id))}
                      className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">
                      Refer for prosecution
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

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
