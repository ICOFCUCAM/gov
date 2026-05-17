'use client';

// apps/ministry-health/subsystems/RegulatorySystem — health regulation as
// a TRUE execution system: licensing pipeline, facility-accreditation
// bands, practitioner-registry integrity and an enforcement / sanctions
// case queue with interactive sanction. Multi-role aware.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { healthRegulatory, healthRegulatoryExecution } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function RegulatorySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const rg = healthRegulatory(id, ts);
  const rx = healthRegulatoryExecution(id, ts);
  const [sanctioned, setSanctioned] = React.useState<Set<string>>(() => new Set());

  const pTone: 'ok' | 'warn' | 'alert' = rx.posture === 'breach' ? 'alert' : rx.posture === 'watch' ? 'warn' : 'ok';
  const adv = aiAdvisory('Regulatory Systems', [
    { label: 'Critical breaches', value: Math.min(100, rx.criticalBreaches * 30), adverse: true },
    { label: 'Compliance gap', value: Math.max(0, 100 - rx.compliancePct), adverse: true },
    { label: 'Registry lapse', value: Math.min(100, Math.max(...rx.registry.map(r => r.lapsedPct)) * 5), adverse: true },
    { label: 'Licensing latency', value: Math.min(100, Math.max(...rx.licensing.map(l => l.medianDays))), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Regulatory Systems — licensing & enforcement</span>
        <PosturePill label={rx.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">compliance · <span style={{ color: ac(rx.compliancePct >= 85 ? 'ok' : 'warn') }}>{rx.compliancePct}%</span> · critical breaches <span style={{ color: ac(rx.criticalBreaches ? 'alert' : 'ok') }}>{rx.criticalBreaches}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Facilities licensed', v: rg.facilitiesLicensed.toLocaleString(), t: 'ok' },
        { l: 'Licensing pending', v: rg.licensingPending.toLocaleString(), t: rg.licensingPending > 1000 ? 'warn' : 'ok' },
        { l: 'Accreditation due', v: `${rg.accreditationDuePct}%`, t: rg.accreditationDuePct >= 25 ? 'warn' : 'ok' },
        { l: 'Practitioners', v: `${rg.practitionersRegisteredK}k`, t: 'ok' },
        { l: 'Compliance', v: `${rx.compliancePct}%`, t: rx.compliancePct >= 85 ? 'ok' : rx.compliancePct >= 70 ? 'warn' : 'alert' },
        { l: 'Enforcement cases', v: `${rx.enforcement.length}`, t: rx.enforcement.some(e => e.tone === 'alert') ? 'alert' : rx.enforcement.length ? 'warn' : 'ok' },
      ]} />

      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI regulatory-risk intelligence · {adv.severity}</span>
          <span className="font-mono text-[9px] tabular-nums text-ink-muted">{adv.confidence}%</span>
        </div>
        <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
        <ul className="mt-0.5 flex flex-wrap gap-x-4">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
      </div>

      <Panel title="Licensing pipeline" meta="application → review → inspection → granted / refused">
        <div className="flex items-stretch gap-1">
          {rx.licensing.map((l, i) => (
            <React.Fragment key={l.stage}>
              <div className="flex-1 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5" style={{ borderLeft: `3px solid ${ac(l.tone)}` }}>
                <div className="text-[7.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{l.stage}</div>
                <div className="font-mono text-[13px] tabular-nums" style={{ color: ac(l.tone) }}>{l.count.toLocaleString()}</div>
                <div className="text-[8px] text-ink-muted">~{l.medianDays}d</div>
              </div>
              {i < rx.licensing.length - 1 ? <span className="self-center text-[9px] text-ink-muted">→</span> : null}
            </React.Fragment>
          ))}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Facility accreditation" meta="band · facilities">
          <Bars rows={rx.accreditation.map(a => ({ label: a.band, pct: Math.min(100, a.facilities / 42), tone: a.tone, tail: a.facilities.toLocaleString() }))} />
        </Panel>
        <Panel title="Practitioner-registry integrity" meta="discipline · lapsed · verification">
          <div className="space-y-1">
            {rx.registry.map(r => (
              <div key={r.discipline} className="flex items-center gap-2 text-[10px]">
                <span className="w-24 shrink-0 truncate text-ink">{r.discipline}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${r.verificationPct}%`, backgroundColor: ac(r.tone) }} /></div>
                <span className="w-24 shrink-0 text-right font-mono tabular-nums text-ink-muted">{r.registeredK}k · {r.lapsedPct}% lapsed</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Enforcement & sanctions queue" meta="severity-ordered · sanction subject">
        {rx.enforcement.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No active enforcement cases — sector compliance nominal.</p>
        ) : (
          <div className="space-y-1.5">
            {rx.enforcement.map(e => {
              const done = e.stage === 'sanctioned' || sanctioned.has(e.id);
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(done ? 'ok' : e.tone)}` }}>
                  <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: ac(e.tone) }}>{e.severity}</span>
                  <span className="font-mono text-[9px] tabular-nums text-ink-muted">{e.id}</span>
                  <span className="text-[11px] font-medium text-ink">{e.subject}</span>
                  <span className="text-[9px] text-ink-muted">{e.breach} · {e.stage}</span>
                  {done ? (
                    <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: ac('ok') }}>✓ sanctioned</span>
                  ) : (
                    <button
                      onClick={() => setSanctioned(prev => new Set(prev).add(e.id))}
                      className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">
                      Issue sanction
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <RuntimeQueue
        scope={`${id}:regulatory`}
        kind="permit"
        title="Licensing & accreditation runtime — applied → reviewed → inspected → granted"
        by="Regulatory Officer"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
