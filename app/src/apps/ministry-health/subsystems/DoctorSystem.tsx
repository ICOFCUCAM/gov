'use client';

// apps/ministry-health/subsystems/DoctorSystem — a TRUE clinical execution
// system: patient→clinician assignment board, shift coordination with
// handover-gap detection, live emergency escalation codes, treatment-
// workflow lanes, workforce strain, AI guidance and the executable
// clinical encounter runtime. Multi-role aware.

import * as React from 'react';
import { Stat, StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { doctorClinicalExecution } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function DoctorSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const dx = doctorClinicalExecution(id, ts);

  // Manual clinician assignment — a real operational action (session
  // state); the executable encounter runtime carries the audited chain.
  const [assigned, setAssigned] = React.useState<Set<string>>(() => new Set());
  const isAssigned = (a: { patient: string; assignedTo: string | null }) => a.assignedTo != null || assigned.has(a.patient);
  const openAssign = dx.assignments.filter(a => !isAssigned(a)).length;

  const pTone: 'ok' | 'warn' | 'alert' =
    dx.posture === 'crisis' ? 'alert' : dx.posture === 'strained' ? 'warn' : 'ok';

  const adv = aiAdvisory('Doctor Systems', [
    { label: 'Unassigned acute patients', value: Math.min(100, openAssign * 22), adverse: true },
    { label: 'Next-shift coverage gap', value: Math.min(100, dx.nextShiftGap * 6), adverse: true },
    { label: 'Active emergency codes', value: Math.min(100, dx.codes.length * 22), adverse: true },
    { label: 'Workforce strain', value: dx.meanWorkloadPct, adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' =
    adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Doctor Systems</span>
        <PosturePill label={dx.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">codes · <span className="text-ink-soft">{dx.codes.length}</span> · next-shift gap <span className="text-ink-soft">{dx.nextShiftGap}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Open assignments', v: `${openAssign} / ${dx.assignments.length}`, t: openAssign ? 'warn' : 'ok' },
        { l: 'Active codes', v: `${dx.codes.length}`, t: dx.codes.some(c => c.tone === 'alert') ? 'alert' : dx.codes.length ? 'warn' : 'ok' },
        { l: 'Mean workload', v: `${dx.meanWorkloadPct}%`, t: dx.meanWorkloadPct >= 90 ? 'alert' : dx.meanWorkloadPct >= 78 ? 'warn' : 'ok' },
        { l: 'Burnout alerts', v: `${dx.burnoutAlerts}`, t: dx.burnoutAlerts ? 'alert' : 'ok' },
        { l: 'Next-shift gap', v: `${dx.nextShiftGap}`, t: dx.nextShiftGap >= 12 ? 'alert' : dx.nextShiftGap ? 'warn' : 'ok' },
        { l: 'Treatment lanes', v: `${dx.lanes.length}`, t: 'ok' },
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

      {dx.codes.length > 0 ? (
        <Panel title="Emergency escalation — active codes" meta="code · location · responding clinician · age">
          <div className="space-y-1.5">
            {dx.codes.map(c => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(c.tone)}` }}>
                <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: ac(c.tone) }}>{c.code}</span>
                <span className="text-[11px] font-medium text-ink">{c.location}</span>
                <span className="text-[9px] text-ink-muted">{c.clinician} · {c.status}</span>
                <span className="ml-auto font-mono text-[9px] tabular-nums" style={{ color: ac(c.tone) }}>{c.ageMin}m</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Patient → clinician assignment board" meta="triage-ordered · acute first · assign to dispatch">
        <div className="space-y-1.5">
          {dx.assignments.map(a => {
            const done = isAssigned(a);
            return (
              <div key={a.patient} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(done ? 'ok' : a.tone)}` }}>
                <span className="w-8 shrink-0 text-center text-[9px] font-bold" style={{ color: ac(a.triage <= 2 ? 'alert' : a.triage === 3 ? 'warn' : 'ok') }}>T{a.triage}</span>
                <span className="font-mono text-[9px] tabular-nums text-ink-muted">{a.patient}</span>
                <span className="text-[10px] text-ink">{a.specialty}</span>
                <span className="text-[9px] text-ink-muted">wait {a.waitMin}m</span>
                {done ? (
                  <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: ac('ok') }}>✓ {a.assignedTo ?? 'assigned'}</span>
                ) : (
                  <button
                    onClick={() => setAssigned(prev => new Set(prev).add(a.patient))}
                    className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">
                    Assign clinician
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Shift coordination" meta="specialty · on-duty / required · utilisation">
          <Bars rows={dx.shift.map(s => ({ label: `${s.specialty} (${s.onDuty}/${s.required})`, pct: s.utilisationPct, tone: s.tone, tail: `${s.utilisationPct}%` }))} />
        </Panel>
        <Panel title="Treatment workflow lanes" meta="stage · patients · throughput/hr">
          <Bars rows={dx.lanes.map(l => ({ label: `${l.stage} (${l.throughputPerHr}/hr)`, pct: Math.min(100, l.patients / 2.2), tone: l.tone, tail: `${l.patients}` }))} />
        </Panel>
      </div>

      <Panel title="Operational timeline" meta="most recent first">
        <div className="space-y-1">
          {dx.timeline.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className="w-12 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atHrsAgo}h</span>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ac(e.tone) }} />
              <span className="min-w-0"><span className="text-[8px] uppercase tracking-wider text-ink-muted">{e.kind}</span><span className="block text-ink-soft">{e.detail}</span></span>
            </div>
          ))}
        </div>
      </Panel>

      <RuntimeQueue
        scope={`${id}:doctor`}
        kind="encounter"
        title="Clinical encounter runtime — triage → assess → treat → disposition"
        by="Attending Clinician"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
