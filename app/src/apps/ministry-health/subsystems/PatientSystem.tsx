'use client';

// apps/ministry-health/subsystems/PatientSystem — a TRUE citizen-health
// execution system: intake workflow board, prescription integrity,
// vaccination-coverage intelligence, emergency citizen status, AI
// guidance and the executable patient-services runtime. Multi-role aware.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { patientServices } from '@/lib/gov/health-systems';
import { patientDeepExecution } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function PatientSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const ps = patientServices(id, ts);
  const pe = patientDeepExecution(id, ts);

  // Intake routing — a real operational action on the workflow board.
  const [routed, setRouted] = React.useState<Set<string>>(() => new Set());
  const isRouted = (r: { id: string; stage: string }) => (r.stage !== 'registration' && r.stage !== 'triage') || routed.has(r.id);
  const openIntake = pe.intake.filter(r => !isRouted(r)).length;

  const pTone: 'ok' | 'warn' | 'alert' =
    pe.posture === 'crisis' ? 'alert' : pe.posture === 'strained' ? 'warn' : 'ok';

  const adv = aiAdvisory('Patient Systems', [
    { label: 'Unrouted acute intake', value: Math.min(100, openIntake * 18), adverse: true },
    { label: 'Critical citizen status', value: Math.min(100, pe.emergencyStatuses.filter(e => e.status === 'critical').length * 30), adverse: true },
    { label: 'Records integrity gap', value: Math.max(0, (100 - pe.recordsIntegrityPct) * 12), adverse: true },
    { label: 'Vaccination coverage gap', value: Math.max(0, 100 - pe.vaccination[0]!.coveragePct), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' =
    adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Patient Systems</span>
        <PosturePill label={pe.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">enrolled · <span className="text-ink-soft">{ps.registeredM}M</span> · mean wait <span className="text-ink-soft">{pe.meanIntakeWaitMin}m</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Citizens enrolled', v: `${ps.registeredM}M`, t: 'ok' },
        { l: 'Open intake', v: `${openIntake} / ${pe.intake.length}`, t: openIntake ? 'warn' : 'ok' },
        { l: 'Records integrity', v: `${pe.recordsIntegrityPct}%`, t: pe.recordsIntegrityPct >= 98 ? 'ok' : pe.recordsIntegrityPct >= 96 ? 'warn' : 'alert' },
        { l: 'Appointments honoured', v: `${pe.appointmentsHonouredPct}%`, t: pe.appointmentsHonouredPct >= 85 ? 'ok' : 'warn' },
        { l: 'Critical citizens', v: `${pe.emergencyStatuses.filter(e => e.status === 'critical').length}`, t: pe.emergencyStatuses.some(e => e.status === 'critical') ? 'alert' : 'ok' },
        { l: 'Portal uptime', v: `${ps.portalUptime}%`, t: ps.portalUptime >= 99 ? 'ok' : 'warn' },
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

      {pe.emergencyStatuses.length > 0 ? (
        <Panel title="Emergency citizen status" meta="citizen · status · facility · age">
          <div className="space-y-1.5">
            {pe.emergencyStatuses.map(e => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(e.tone)}` }}>
                <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: ac(e.tone) }}>{e.status}</span>
                <span className="font-mono text-[9px] tabular-nums text-ink-muted">{e.citizen}</span>
                <span className="text-[10px] text-ink">{e.facility}</span>
                <span className="ml-auto font-mono text-[9px] tabular-nums text-ink-muted">{e.ageMin}m</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Intake workflow board" meta="triage-ordered · channel · stage · route to next stage">
        <div className="space-y-1.5">
          {pe.intake.map(r => {
            const done = isRouted(r);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(done ? 'ok' : r.tone)}` }}>
                <span className="w-8 shrink-0 text-center text-[9px] font-bold" style={{ color: ac(r.triage <= 2 ? 'alert' : r.triage === 3 ? 'warn' : 'ok') }}>T{r.triage}</span>
                <span className="font-mono text-[9px] tabular-nums text-ink-muted">{r.id}</span>
                <span className="text-[10px] text-ink">{r.channel}</span>
                <span className="text-[9px] text-ink-muted">{r.stage} · {r.waitMin}m</span>
                {done ? (
                  <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: ac('ok') }}>✓ routed</span>
                ) : (
                  <button
                    onClick={() => setRouted(prev => new Set(prev).add(r.id))}
                    className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">
                    Route to clinician
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Prescription integrity" meta="category · issued · flagged · interaction alerts">
          <div className="space-y-1">
            {pe.rx.map(x => (
              <div key={x.category} className="flex items-center gap-2 text-[10px]">
                <span className="w-24 shrink-0 truncate text-ink">{x.category}</span>
                <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{x.issued.toLocaleString()} issued</span>
                <span className="w-28 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(x.tone) }}>{x.flagged} flag · {x.interactionAlerts} int</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Vaccination coverage intelligence" meta="vaccine · coverage · trend">
          <Bars rows={pe.vaccination.map(v => ({ label: `${v.vaccine} (${v.trend})`, pct: v.coveragePct, tone: v.tone, tail: `${v.coveragePct}%` }))} />
        </Panel>
      </div>

      <Panel title="Operational timeline" meta="most recent first">
        <div className="space-y-1">
          {pe.timeline.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className="w-12 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atHrsAgo}h</span>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ac(e.tone) }} />
              <span className="min-w-0"><span className="text-[8px] uppercase tracking-wider text-ink-muted">{e.kind}</span><span className="block text-ink-soft">{e.detail}</span></span>
            </div>
          ))}
        </div>
      </Panel>

      <RuntimeQueue
        scope={`${id}:patient`}
        kind="approval"
        title="Patient services runtime — request → verify → fulfil → close"
        by="Service Officer"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
