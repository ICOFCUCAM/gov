'use client';

// Domain — AI & Simulation. Predictive sovereign AI: pandemic simulation,
// intervention modelling and systemic collapse-risk detection. Cinematic
// sovereign command rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { healthSimulation } from '@/lib/gov/health-operations';
import { CommandPanel, sc, type Tone } from '@/apps/_shared/SovereignUI';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/ministry-health/subsystems/_ops';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = '#7c5cff';

export function SimulationSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const sm = healthSimulation(id, ts);
  const [selected, setSelected] = React.useState<string | null>(null);
  const scn = sm.scenarios.find(s => s.name === selected) ?? sm.scenarios[0]!;
  const pTone: Tone = sm.posture === 'critical' ? 'alert' : sm.posture === 'watch' ? 'warn' : 'ok';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#06050f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={11} title="AI & National Health Simulation" subtitle="Pandemic Modelling · Collapse-Risk Detection"
        posture={sm.posture} tone={pTone} now={now} role={role} accent={ACC} />

      <KpiStrip ts={ts} accent={ACC} items={[
        { l: 'Systemic Risk', v: `${sm.systemicRiskIndex}`, s: 'index', t: pTone, k: 'smr' },
        { l: 'Posture', v: sm.posture.toUpperCase(), s: 'national', t: pTone, k: 'smp' },
        { l: 'Scenarios', v: `${sm.scenarios.length}`, s: 'modelled', t: 'ok', k: 'sms' },
        { l: 'Collapse Vectors', v: `${sm.collapseRisks.length}`, s: 'detected', t: sm.collapseRisks.some(r => r.tone === 'alert') ? 'alert' : 'warn', k: 'smc' },
        { l: 'Top Risk', v: `${sm.collapseRisks[0]!.riskPct}%`, s: sm.collapseRisks[0]!.system, t: sm.collapseRisks[0]!.tone, k: 'smt' },
        { l: 'Confidence', v: `${sm.confidencePct}%`, s: 'ensemble', t: 'ok', k: 'smf' },
      ]} />

      <CommandPanel title="AI recommended intervention" meta={`confidence ${sm.confidencePct}%`} accent={ACC} live>
        <div className="text-[10px] text-ink">{sm.recommendedIntervention}</div>
      </CommandPanel>

      <div className="grid gap-2 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <CommandPanel title="Simulation scenarios" meta="select to model" accent={ACC}>
            <div className="space-y-1">
              {sm.scenarios.map(s => {
                const on = scn.name === s.name;
                return (
                  <button key={s.name} onClick={() => setSelected(s.name)}
                    className="focus-ring flex w-full items-center gap-2 rounded-[3px] border px-2 py-1.5 text-left transition-colors"
                    style={{ borderColor: on ? sc(s.tone) : 'rgba(124,92,255,0.18)', background: on ? 'rgba(124,92,255,0.14)' : 'rgba(0,0,0,0.22)', borderLeft: `3px solid ${sc(s.tone)}` }}>
                    <span className="min-w-0 flex-1 truncate text-[9px] text-ink">{s.name}</span>
                    <span className="w-12 shrink-0 text-right font-mono text-[9px] tabular-nums" style={{ color: sc(s.tone) }}>{s.peakLoadPct}%</span>
                  </button>
                );
              })}
            </div>
          </CommandPanel>
        </div>
        <div className="space-y-2 xl:col-span-3">
          <CommandPanel title={`Modelled · ${scn.name}`} meta={`peak in ${scn.weeksToPeak}w`} accent={ACC} live>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { l: 'Peak load', v: `${scn.peakLoadPct}%`, t: scn.tone },
                { l: 'Mortality idx', v: `${scn.mortalityIdx}`, t: (scn.mortalityIdx >= 40 ? 'alert' : scn.mortalityIdx >= 20 ? 'warn' : 'ok') as Tone },
                { l: 'Weeks to peak', v: `${scn.weeksToPeak}w`, t: (scn.weeksToPeak <= 3 ? 'alert' : 'warn') as Tone },
              ].map(x => (
                <div key={x.l} className="rounded-[4px] border px-2 py-1.5" style={{ borderColor: 'rgba(124,92,255,0.18)', background: 'rgba(0,0,0,0.22)' }}>
                  <div className="text-[7px] uppercase tracking-[0.14em] text-ink-muted">{x.l}</div>
                  <div className="font-mono text-[15px] font-bold tabular-nums" style={{ color: sc(x.t) }}>{x.v}</div>
                </div>
              ))}
            </div>
          </CommandPanel>
          <BarPanel title="Collapse-risk detection" meta="system · risk% · horizon (risk-ordered)" accent={ACC} live
            rows={sm.collapseRisks.map(r => ({ label: `${r.system} (${r.horizonDays}d · ${r.driver})`, pct: r.riskPct, tone: r.tone, tail: `${r.riskPct}%` }))} />
        </div>
      </div>

      <RuntimeQueue scope={`${id}:simulation`} kind="incident" title="Simulation runtime — model → recommend → authorise → deploy intervention" by="Strategic Analyst" role={role} withheld={withheld} />
    </div>
  );
}
