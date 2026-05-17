'use client';

// apps/ministry-health/subsystems/LaboratorySystem — a TRUE laboratory
// execution system (not a card collection): specimen lifecycle pipeline,
// priority-laned queue intelligence, outbreak detection + regional
// escalation tree, capacity-based diagnostics routing, panic-value
// acknowledgement, an operational timeline, AI-assisted guidance and the
// executable specimen-workflow runtime. Multi-role aware.

import * as React from 'react';
import { Stat, StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { laboratoryNetwork, laboratoryExecution } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function LaboratorySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const net = laboratoryNetwork(id, ts);
  const lx = laboratoryExecution(id, ts);

  // Panic-value acknowledgement — a real operational action held in
  // session state; the executable runtime below carries the audited chain.
  const [acked, setAcked] = React.useState<Set<string>>(() => new Set());
  const isAcked = (a: { id: string; acknowledged: boolean }) => a.acknowledged || acked.has(a.id);
  const unacked = lx.criticalAlerts.filter(a => !isAcked(a)).length;

  const pTone: 'ok' | 'warn' | 'alert' =
    lx.posture === 'crisis' ? 'alert' : lx.posture === 'strained' ? 'warn' : 'ok';

  const adv = aiAdvisory('Laboratory Systems', [
    { label: 'SLA breaches', value: Math.min(100, lx.slaBreaches), adverse: true },
    { label: 'Unacknowledged panic values', value: Math.min(100, unacked * 22), adverse: true },
    { label: 'Outbreak escalation', value: lx.escalationLevel === 'national' ? 92 : lx.escalationLevel === 'regional' ? 58 : 12, adverse: true },
    { label: 'Turnaround', value: Math.min(100, net.meanTurnaroundHrs), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' =
    adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Laboratory Systems</span>
        <PosturePill label={lx.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">escalation · <span className="text-ink-soft">{lx.escalationLevel}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Laboratories', v: `${net.labs}`, t: 'ok' },
        { l: 'Samples in process', v: net.samplesInProcess.toLocaleString(), t: 'ok' },
        { l: 'Mean turnaround', v: `${net.meanTurnaroundHrs}h`, t: net.meanTurnaroundHrs >= 48 ? 'alert' : net.meanTurnaroundHrs >= 24 ? 'warn' : 'ok' },
        { l: 'SLA breaches', v: `${lx.slaBreaches}`, t: lx.slaBreaches > 120 ? 'alert' : lx.slaBreaches > 30 ? 'warn' : 'ok' },
        { l: 'Panic values', v: `${unacked} / ${lx.criticalAlerts.length}`, t: unacked ? 'alert' : 'ok' },
        { l: 'LIS sync', v: `${net.syncIntegrityPct}%`, t: net.syncIntegrityPct >= 98 ? 'ok' : 'warn' },
      ]} />

      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI operational guidance · {adv.severity}</span>
          <span className="font-mono text-[9px] tabular-nums text-ink-muted">confidence {adv.confidence}%</span>
        </div>
        <div className="mt-0.5 text-[11px] text-ink">{adv.headline}</div>
        <div className="text-[9px] text-ink-muted">{adv.rationale}</div>
        <ul className="mt-0.5 flex flex-wrap gap-x-4">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
      </div>

      <Panel title="Specimen lifecycle pipeline" meta="collected → reported · inflow/outflow per hr · bottleneck">
        <div className="space-y-1">
          {lx.pipeline.map((s, i) => (
            <div key={s.stage} className="flex items-center gap-2 text-[10px]">
              <span className="w-24 shrink-0 text-ink-soft">{i + 1}. {s.stage}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full" style={{ width: `${Math.min(100, s.count / 26)}%`, backgroundColor: ac(s.tone) }} />
              </div>
              <span className="w-28 shrink-0 text-right font-mono tabular-nums text-ink-muted">{s.count.toLocaleString()} · {s.inflowPerHr}↓/{s.outflowPerHr}↑</span>
              {s.bottleneck ? <span className="w-16 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: ac('alert') }}>bottleneck</span> : <span className="w-16 shrink-0" />}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Testing queue intelligence" meta="priority lane · SLA · breaching · throughput">
          <div className="space-y-1.5">
            {lx.queues.map(q => (
              <div key={q.priority} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5" style={{ borderLeft: `3px solid ${ac(q.tone)}` }}>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-semibold text-ink">{q.priority}</span>
                  <span className="font-mono tabular-nums text-ink-muted">depth {q.depth.toLocaleString()} · {q.throughputPerHr}/hr</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[8.5px] text-ink-muted">
                  <span>SLA {q.slaHrs}h · oldest <span style={{ color: ac(q.oldestHrs > q.slaHrs ? 'alert' : 'ok') }}>{q.oldestHrs}h</span></span>
                  <span style={{ color: ac(q.tone) }}>{q.breaching} breaching</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Outbreak detection · regional escalation tree" meta={`national · ${lx.escalationLevel}`}>
          <div className="mb-1 text-[8.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: ac(lx.escalationLevel === 'national' ? 'alert' : lx.escalationLevel === 'regional' ? 'warn' : 'ok') }}>
            ▣ National laboratory command · {lx.escalationLevel}
          </div>
          <div className="space-y-1 border-l border-line pl-2">
            {lx.outbreaks.map(o => (
              <div key={`${o.pathogen}-${o.region}`} className="flex items-center gap-2 text-[10px]">
                <span className="w-24 shrink-0 truncate text-ink">{o.region}</span>
                <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{o.pathogen} · {o.trend}</span>
                <span className="w-10 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(o.tone) }}>{o.positivityPct}%</span>
                <span className="w-16 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: ac(o.tone) }}>{o.escalation}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Critical-result alerts" meta="panic values · acknowledge to clear">
        {lx.criticalAlerts.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No outstanding panic values — all critical results acknowledged.</p>
        ) : (
          <div className="space-y-1.5">
            {lx.criticalAlerts.map(a => {
              const done = isAcked(a);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(done ? 'ok' : a.ageMin >= 30 ? 'alert' : 'warn')}` }}>
                  <span className="font-mono text-[9px] tabular-nums text-ink-muted">{a.id}</span>
                  <span className="text-[11px] font-medium text-ink">{a.test}</span>
                  <span className="text-[9px] text-ink-muted">{a.patient} · {a.ageMin}m ago</span>
                  {done ? (
                    <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: ac('ok') }}>✓ acknowledged</span>
                  ) : (
                    <button
                      onClick={() => setAcked(prev => new Set(prev).add(a.id))}
                      className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">
                      Acknowledge
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Diagnostics routing" meta="specimen → lab tier · capacity · reroute">
          <Bars rows={lx.routing.map(r => ({ label: `${r.specimen} → ${r.tier}`, pct: r.capacityPct, tone: r.tone, tail: `${r.capacityPct}%${r.rerouted ? ' ⤳' : ''}` }))} />
        </Panel>
        <Panel title="Operational timeline" meta="most recent first">
          <div className="space-y-1">
            {lx.timeline.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px]">
                <span className="w-12 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atHrsAgo}h</span>
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ac(e.tone) }} />
                <span className="min-w-0"><span className="text-[8px] uppercase tracking-wider text-ink-muted">{e.kind}</span><span className="block text-ink-soft">{e.detail}</span></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <RuntimeQueue
        scope={`${id}:lab`}
        kind="lab"
        title="Specimen runtime — received → accessioned → in assay → verified → reported"
        by="Lab Scientist"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
