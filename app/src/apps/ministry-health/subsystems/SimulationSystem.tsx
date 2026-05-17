'use client';

// apps/ministry-health/subsystems/SimulationSystem — Layer 12. Predictive
// sovereign AI: pandemic simulation, intervention modelling and systemic
// collapse-risk detection.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { healthSimulation } from '@/lib/gov/health-operations';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function SimulationSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const sm = healthSimulation(id, ts);
  const [selected, setSelected] = React.useState<string | null>(null);
  const sc = sm.scenarios.find(s => s.name === selected) ?? sm.scenarios[0]!;
  const pTone: 'ok' | 'warn' | 'alert' = sm.posture === 'critical' ? 'alert' : sm.posture === 'watch' ? 'warn' : 'ok';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">AI &amp; National Health Simulation</span>
        <PosturePill label={sm.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">systemic risk · <span style={{ color: ac(pTone) }}>{sm.systemicRiskIndex}</span> · confidence {sm.confidencePct}%</span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>
      <StatGrid items={[
        { l: 'Systemic risk', v: `${sm.systemicRiskIndex}`, t: pTone },
        { l: 'Posture', v: sm.posture, t: pTone },
        { l: 'Scenarios', v: `${sm.scenarios.length}`, t: 'ok' },
        { l: 'Collapse vectors', v: `${sm.collapseRisks.length}`, t: 'ok' },
        { l: 'Top risk', v: `${sm.collapseRisks[0]!.riskPct}%`, t: sm.collapseRisks[0]!.tone },
        { l: 'Confidence', v: `${sm.confidencePct}%`, t: 'ok' },
      ]} />
      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(pTone)}` }}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(pTone) }}>AI recommended intervention</div>
        <div className="mt-0.5 text-[10px] text-ink">{sm.recommendedIntervention}</div>
      </div>
      <div className="grid gap-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Panel title="Simulation scenarios" meta="select to model">
            <div className="space-y-1">
              {sm.scenarios.map(s => {
                const on = sc.name === s.name;
                return (
                  <button key={s.name} onClick={() => setSelected(s.name)}
                    className="focus-ring flex w-full items-center gap-2 rounded-[3px] border px-2 py-1 text-left transition-colors"
                    style={{ borderColor: on ? ac(s.tone) : 'rgb(var(--c-line-soft))', backgroundColor: on ? 'rgb(var(--c-surface-2))' : 'transparent', borderLeft: `3px solid ${ac(s.tone)}` }}>
                    <span className="min-w-0 flex-1 truncate text-[10px] text-ink">{s.name}</span>
                    <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: ac(s.tone) }}>{s.peakLoadPct}%</span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
        <div className="lg:col-span-3 space-y-2">
          <Panel title={`Modelled · ${sc.name}`} meta={`peak in ${sc.weeksToPeak}w`}>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { l: 'Peak load', v: `${sc.peakLoadPct}%`, t: sc.tone },
                { l: 'Mortality idx', v: `${sc.mortalityIdx}`, t: (sc.mortalityIdx >= 40 ? 'alert' : sc.mortalityIdx >= 20 ? 'warn' : 'ok') as 'ok' | 'warn' | 'alert' },
                { l: 'Weeks to peak', v: `${sc.weeksToPeak}w`, t: (sc.weeksToPeak <= 3 ? 'alert' : 'warn') as 'ok' | 'warn' | 'alert' },
              ].map(x => (
                <div key={x.l} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <div className="text-[7.5px] uppercase tracking-[0.14em] text-ink-muted">{x.l}</div>
                  <div className="font-mono text-[13px] tabular-nums" style={{ color: ac(x.t) }}>{x.v}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Collapse-risk detection" meta="system · risk% · horizon · driver (risk-ordered)">
            <Bars rows={sm.collapseRisks.map(r => ({ label: `${r.system} (${r.horizonDays}d · ${r.driver})`, pct: r.riskPct, tone: r.tone, tail: `${r.riskPct}%` }))} />
          </Panel>
        </div>
      </div>
      <RuntimeQueue scope={`${id}:simulation`} kind="incident" title="Simulation runtime — model → recommend → authorise → deploy intervention" by="Strategic Analyst" role={role} withheld={withheld} />
    </div>
  );
}
