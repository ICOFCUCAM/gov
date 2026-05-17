'use client';

// apps/ministry-health/subsystems/CitizenPortalSystem — Layer 3/13, the
// citizen digital health ecosystem. Mode C: human, clean, trustworthy.
// Digital health ID, longitudinal timeline, appointments, digital
// prescriptions, insurance, telemedicine and a personal-health AI.

import * as React from 'react';
import { StatGrid, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { citizenHealthPortal } from '@/lib/gov/health-operations';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function CitizenPortalSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const cp = citizenHealthPortal(id, ts);
  const [booked, setBooked] = React.useState<Set<string>>(() => new Set());
  const pTone: 'ok' | 'warn' | 'alert' = cp.posture === 'at-risk' ? 'alert' : cp.posture === 'attention' ? 'warn' : 'ok';

  return (
    <div className="space-y-2 rounded-[6px] bg-[#f7fafc] p-2 text-[#0f1b22] dark:bg-transparent dark:text-inherit">
      <div className="flex flex-wrap items-center gap-3 rounded-[6px] border border-line bg-surface px-3 py-2">
        <span className="text-[11px] font-semibold tracking-tight text-ink">Citizen Health Portal</span>
        <PosturePill label={cp.posture} tone={pTone} />
        <span className="text-[10px] text-ink-muted">national digital health ID · <span className="text-ink-soft">{cp.digitalIdCoveragePct}%</span> coverage</span>
        <span className="ml-auto text-[9px] text-ink-muted">viewing as · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Citizens enrolled', v: `${cp.enrolledM}M`, t: 'ok' },
        { l: 'Health score', v: `${cp.healthScore}`, t: cp.healthScore >= 76 ? 'ok' : cp.healthScore >= 60 ? 'warn' : 'alert' },
        { l: 'Risk band', v: cp.riskBand, t: cp.riskBand === 'elevated' ? 'alert' : cp.riskBand === 'moderate' ? 'warn' : 'ok' },
        { l: 'Insurance coverage', v: `${cp.insuranceCoveragePct}%`, t: cp.insuranceCoveragePct >= 70 ? 'ok' : 'warn' },
        { l: 'Telemedicine', v: cp.telemedicineSessions.toLocaleString(), t: 'ok' },
        { l: 'Claims in progress', v: `${cp.claimsInProgress}`, t: cp.claimsInProgress > 3 ? 'warn' : 'ok' },
      ]} />

      <div className="rounded-[6px] border border-line bg-surface p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: ac(pTone) }}>Personal health AI</div>
        <ul className="mt-1 space-y-0.5">
          {cp.aiGuidance.map((g, i) => <li key={i} className="text-[11px] text-ink-soft">• {g}</li>)}
        </ul>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <Panel title="Health timeline" meta="diagnoses · prescriptions · labs · imaging · surgery">
          <div className="space-y-1.5">
            {cp.timeline.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-[5px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5">
                <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: ac(e.tone) }} />
                <span className="w-20 shrink-0 text-[9px] font-semibold uppercase tracking-wider text-ink-muted">{e.kind}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink">{e.detail}</span>
                <span className="shrink-0 font-mono text-[9px] tabular-nums text-ink-muted">{e.daysAgo}d ago</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Appointments" meta="book / confirm a visit">
          <div className="space-y-1.5">
            {cp.appointments.map(a => {
              const done = a.status === 'confirmed' || booked.has(a.facility);
              return (
                <div key={a.facility} className="flex flex-wrap items-center gap-2 rounded-[5px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5">
                  <span className="text-[11px] font-medium text-ink">{a.facility}</span>
                  <span className="text-[9px] text-ink-muted">{a.kind} · in {a.inDays}d</span>
                  {done ? (
                    <span className="ml-auto text-[9px] font-semibold" style={{ color: ac('ok') }}>✓ confirmed</span>
                  ) : (
                    <button onClick={() => setBooked(prev => new Set(prev).add(a.facility))}
                      className="focus-ring ml-auto rounded-full border border-line bg-surface px-2.5 py-0.5 text-[9px] font-semibold text-ink transition-colors hover:bg-surface-2">
                      {a.status === 'waitlist' ? 'Join waitlist' : 'Confirm'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Digital prescriptions" meta="QR pickup · refill tracking">
        <div className="grid gap-1.5 sm:grid-cols-3">
          {cp.prescriptions.map(p => (
            <div key={p.id} className="rounded-[5px] border border-line-soft bg-surface-2/40 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-ink">{p.drug}</span>
                <span className="grid h-6 w-6 place-items-center rounded-[3px] border border-line text-[7px] text-ink-muted" aria-hidden>▦</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[9px]">
                <span style={{ color: ac(p.tone) }}>{p.status}</span>
                <span className="text-ink-muted">{p.refillsLeft} refills</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <RuntimeQueue
        scope={`${id}:portal`}
        kind="approval"
        title="Citizen services runtime — request → verify → fulfil → notify"
        by="Citizen Services"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
