'use client';

// apps/ministry-health/subsystems/EmergencySystem — pre-hospital command
// as a TRUE master/detail execution system. The left board is a dense live
// incident list; selecting an incident hydrates an operational command
// core: stage machine, responder chain, hospital routing, escalation
// matrix, AI recommendation and the incident timeline. Multi-role aware.

import * as React from 'react';
import { StatGrid, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { emergencyMedical, emergencyIncidentExecution, type IncidentStage } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const STAGES: IncidentStage[] = ['Received', 'Dispatched', 'On scene', 'Transporting', 'Cleared'];

export function EmergencySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const em = emergencyMedical(id, ts);
  const ex = emergencyIncidentExecution(id, ts);

  const [selId, setSelId] = React.useState<string | null>(null);
  const sel = ex.incidents.find(x => x.id === selId) ?? ex.incidents[0] ?? null;
  // Operator command actions on the selected incident (session state).
  const [advanced, setAdvanced] = React.useState<Set<string>>(() => new Set());

  const pTone: 'ok' | 'warn' | 'alert' = ex.posture === 'mci' ? 'alert' : ex.posture === 'surge' ? 'warn' : 'ok';
  const adv = aiAdvisory('Emergency Medical', [
    { label: 'Immediate (S1) incidents', value: Math.min(100, ex.immediate * 26), adverse: true },
    { label: 'Mean dispatch', value: Math.min(100, ex.meanDispatchMin * 4), adverse: true },
    { label: 'Hospital divert', value: ex.divertActive ? 80 : 20, adverse: true },
    { label: 'Fleet committed', value: Math.min(100, (em.ambulanceFleet - em.ambulancesAvailable) / Math.max(1, em.ambulanceFleet) * 100), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Emergency Medical — incident command</span>
        <PosturePill label={ex.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">S1 active · <span style={{ color: ac(ex.immediate ? 'alert' : 'ok') }}>{ex.immediate}</span> · units committed <span className="text-ink-soft">{ex.unitsCommitted}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Active incidents', v: `${ex.incidents.length}`, t: ex.incidents.length >= 10 ? 'alert' : ex.incidents.length >= 6 ? 'warn' : 'ok' },
        { l: 'Immediate (S1)', v: `${ex.immediate}`, t: ex.immediate ? 'alert' : 'ok' },
        { l: 'Fleet available', v: `${em.ambulancesAvailable}/${em.ambulanceFleet}`, t: em.ambulancesAvailable < em.ambulanceFleet * 0.2 ? 'alert' : 'ok' },
        { l: 'Mean dispatch', v: `${ex.meanDispatchMin}m`, t: ex.meanDispatchMin >= 18 ? 'alert' : ex.meanDispatchMin >= 12 ? 'warn' : 'ok' },
        { l: 'Hospital divert', v: ex.divertActive ? 'ACTIVE' : 'none', t: ex.divertActive ? 'alert' : 'ok' },
        { l: 'Disaster posture', v: em.disasterPosture, t: em.disasterPosture === 'major' ? 'alert' : em.disasterPosture === 'elevated' ? 'warn' : 'ok' },
      ]} />

      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI command intelligence · {adv.severity}</span>
          <span className="font-mono text-[9px] tabular-nums text-ink-muted">{adv.confidence}%</span>
        </div>
        <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
        <ul className="mt-0.5 flex flex-wrap gap-x-4">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
      </div>

      <div className="grid gap-2 lg:grid-cols-5">
        {/* MASTER — dense live incident board */}
        <div className="lg:col-span-2">
          <Panel title="Incident board" meta={`${ex.incidents.length} live · severity-ordered`}>
            <div className="space-y-1">
              {ex.incidents.map(x => {
                const on = sel?.id === x.id;
                return (
                  <button key={x.id} onClick={() => setSelId(x.id)}
                    className="focus-ring flex w-full items-center gap-2 rounded-[3px] border px-2 py-1 text-left transition-colors"
                    style={{ borderColor: on ? ac(x.tone) : 'rgb(var(--c-line-soft))', backgroundColor: on ? 'rgb(var(--c-surface-2))' : 'transparent', borderLeft: `3px solid ${ac(x.tone)}` }}>
                    <span className="w-6 shrink-0 text-center text-[9px] font-bold" style={{ color: ac(x.severity === 1 ? 'alert' : x.severity === 2 ? 'warn' : 'ok') }}>S{x.severity}</span>
                    <span className="min-w-0 flex-1 truncate text-[10px] text-ink">{x.type}</span>
                    <span className="hidden shrink-0 text-[8.5px] text-ink-muted sm:inline">{x.region}</span>
                    <span className="w-14 shrink-0 text-right text-[8px] font-bold uppercase tracking-[0.1em]" style={{ color: ac(x.tone) }}>{x.stage}</span>
                    <span className="w-8 shrink-0 text-right font-mono text-[8.5px] tabular-nums text-ink-muted">{x.ageMin}m</span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* DETAIL — operational command core for the selected incident */}
        <div className="lg:col-span-3">
          {sel ? (
            <Panel title={`Command core · ${sel.id}`} meta={`${sel.type} · ${sel.region} · S${sel.severity}`}>
              <div className="space-y-2">
                {/* stage machine */}
                <div className="flex items-center gap-1">
                  {STAGES.map((st, i) => {
                    const idx = STAGES.indexOf(sel.stage);
                    const reached = i <= idx || advanced.has(sel.id) && i <= idx + 1;
                    return (
                      <React.Fragment key={st}>
                        <span className="rounded-[3px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em]"
                          style={{ backgroundColor: reached ? `color-mix(in srgb, ${ac(sel.tone)} 18%, transparent)` : 'transparent', color: reached ? ac(sel.tone) : 'rgb(var(--c-ink-muted))', border: `1px solid ${reached ? ac(sel.tone) : 'rgb(var(--c-line))'}` }}>{st}</span>
                        {i < STAGES.length - 1 ? <span className="text-[8px] text-ink-muted">→</span> : null}
                      </React.Fragment>
                    );
                  })}
                  {sel.stage !== 'Cleared' && !advanced.has(sel.id) ? (
                    <button onClick={() => setAdvanced(prev => new Set(prev).add(sel.id))}
                      className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">Advance stage</button>
                  ) : <span className="ml-auto text-[8.5px] uppercase tracking-wider" style={{ color: ac('ok') }}>{advanced.has(sel.id) ? '✓ advanced' : 'cleared'}</span>}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                    <div className="mb-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Responder chain</div>
                    <div className="space-y-0.5">
                      {sel.responders.map(r => (
                        <div key={r.unit} className="flex items-center gap-2 text-[9.5px]">
                          <span className="w-16 shrink-0 font-mono text-ink-soft">{r.unit}</span>
                          <span className="min-w-0 flex-1 truncate text-ink-muted">{r.kind}</span>
                          <span className="shrink-0 text-[8px] uppercase" style={{ color: ac(r.tone) }}>{r.status}</span>
                          <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(r.tone) }}>{r.etaMin}m</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[9px]">
                      <span className="text-ink-muted">Routing → {sel.destinationHospital}</span>
                      <span style={{ color: ac(sel.hospitalAccepting ? 'ok' : 'alert') }}>{sel.hospitalAccepting ? 'accepting' : 'DIVERTING'}</span>
                    </div>
                  </div>
                  <div className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                    <div className="mb-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Escalation matrix</div>
                    <div className="space-y-0.5">
                      {sel.escalation.map(e => (
                        <div key={e.tier} className="flex items-center gap-2 text-[9.5px]">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.reached ? ac(sel.tone) : 'rgb(var(--c-line))' }} />
                          <span className="min-w-0 flex-1 truncate" style={{ color: e.reached ? 'rgb(var(--c-ink))' : 'rgb(var(--c-ink-muted))' }}>{e.tier}</span>
                          <span className="shrink-0 text-[8px] text-ink-muted">{e.authority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[3px] border px-2 py-1 text-[9.5px]" style={{ borderColor: ac(sel.tone), color: ac(sel.tone) }}>
                  ▸ AI recommendation — {sel.recommended}
                </div>

                <div>
                  <div className="mb-0.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Incident timeline</div>
                  <div className="space-y-0.5">
                    {sel.timeline.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-[9.5px]">
                        <span className="w-12 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atMinAgo}m</span>
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ac(e.tone) }} />
                        <span className="min-w-0 text-ink-soft">{e.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          ) : <Panel title="Command core" meta="no active incidents"><p className="text-[11px] text-ink-muted">No active incidents — EMS network nominal.</p></Panel>}
        </div>
      </div>

      <RuntimeQueue
        scope={`${id}:emergency`}
        kind="incident"
        title="Emergency dispatch runtime — receive → dispatch → on-scene → transport → clear"
        by="EMS Controller"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
