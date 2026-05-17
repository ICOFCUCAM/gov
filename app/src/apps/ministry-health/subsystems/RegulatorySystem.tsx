'use client';

// Domain — Regulatory & Compliance. Health regulation as a TRUE execution
// system: licensing pipeline, accreditation bands, practitioner-registry
// integrity and an interactive enforcement / sanctions queue. Cinematic
// sovereign command rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { healthRegulatory, healthRegulatoryExecution } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import { CommandPanel, sc, type Tone } from '@/apps/_shared/SovereignUI';
import { OpsHeader, KpiStrip, BarPanel, AdvisoryPanel } from '@/apps/ministry-health/subsystems/_ops';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = '#c9a24a';

export function RegulatorySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const rg = healthRegulatory(id, ts);
  const rx = healthRegulatoryExecution(id, ts);
  const [sanctioned, setSanctioned] = React.useState<Set<string>>(() => new Set());
  const pTone: Tone = rx.posture === 'breach' ? 'alert' : rx.posture === 'watch' ? 'warn' : 'ok';
  const adv = aiAdvisory('Regulatory Systems', [
    { label: 'Critical breaches', value: Math.min(100, rx.criticalBreaches * 30), adverse: true },
    { label: 'Compliance gap', value: Math.max(0, 100 - rx.compliancePct), adverse: true },
    { label: 'Registry lapse', value: Math.min(100, Math.max(...rx.registry.map(r => r.lapsedPct)) * 5), adverse: true },
    { label: 'Licensing latency', value: Math.min(100, Math.max(...rx.licensing.map(l => l.medianDays))), adverse: true },
  ]);

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#0c0a05', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={12} title="Regulatory & Compliance" subtitle="Licensing · Accreditation · Enforcement"
        posture={rx.posture} tone={pTone} now={now} role={role} accent={ACC} />

      <KpiStrip ts={ts} accent={ACC} items={[
        { l: 'Facilities Licensed', v: rg.facilitiesLicensed.toLocaleString(), s: 'active', t: 'ok', k: 'rgf' },
        { l: 'Licensing Pending', v: rg.licensingPending.toLocaleString(), s: 'in queue', t: rg.licensingPending > 1000 ? 'warn' : 'ok', k: 'rgp' },
        { l: 'Accreditation Due', v: `${rg.accreditationDuePct}%`, s: 'this cycle', t: rg.accreditationDuePct >= 25 ? 'warn' : 'ok', k: 'rga' },
        { l: 'Practitioners', v: `${rg.practitionersRegisteredK}k`, s: 'registered', t: 'ok', k: 'rgr' },
        { l: 'Compliance', v: `${rx.compliancePct}%`, s: 'national', t: rx.compliancePct >= 85 ? 'ok' : rx.compliancePct >= 70 ? 'warn' : 'alert', k: 'rgc' },
        { l: 'Enforcement Cases', v: `${rx.enforcement.length}`, s: 'open', t: rx.enforcement.some(e => e.tone === 'alert') ? 'alert' : rx.enforcement.length ? 'warn' : 'ok', k: 'rge' },
      ]} />

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="Licensing pipeline" meta="application → review → inspection → granted" accent={ACC} live>
            <div className="flex items-stretch gap-1">
              {rx.licensing.map((l, i) => (
                <React.Fragment key={l.stage}>
                  <div className="flex-1 rounded-[4px] border px-2 py-1.5" style={{ borderColor: 'rgba(201,162,74,0.2)', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${sc(l.tone)}` }}>
                    <div className="text-[7px] font-bold uppercase tracking-[0.12em] text-ink-muted">{l.stage}</div>
                    <div className="font-mono text-[15px] font-bold tabular-nums" style={{ color: sc(l.tone) }}>{l.count.toLocaleString()}</div>
                    <div className="text-[7.5px] text-ink-muted">~{l.medianDays}d</div>
                  </div>
                  {i < rx.licensing.length - 1 ? <span className="self-center text-[9px] text-ink-muted">→</span> : null}
                </React.Fragment>
              ))}
            </div>
          </CommandPanel>
        </div>
        <AdvisoryPanel accent={ACC} severity={adv.severity} headline={adv.headline} recommended={adv.recommended} />
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <BarPanel title="Facility accreditation" meta="band · facilities" accent={ACC}
          rows={rx.accreditation.map(a => ({ label: a.band, pct: Math.min(100, a.facilities / 42), tone: a.tone, tail: a.facilities.toLocaleString() }))} />
        <CommandPanel title="Practitioner-registry integrity" meta="discipline · verification" accent={ACC}>
          <div className="space-y-1">
            {rx.registry.map(r => (
              <div key={r.discipline} className="flex items-center gap-2 text-[8.5px]">
                <span className="w-24 shrink-0 truncate text-ink-soft">{r.discipline}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#1c1708' }}><span className="block h-full rounded-full" style={{ width: `${r.verificationPct}%`, background: sc(r.tone) }} /></span>
                <span className="w-24 shrink-0 text-right font-mono tabular-nums text-ink-muted">{r.registeredK}k · {r.lapsedPct}% lapsed</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <CommandPanel title="Enforcement & sanctions queue" meta="severity-ordered" accent={ACC} live>
        {rx.enforcement.length === 0 ? (
          <p className="text-[10px] text-ink-muted">No active enforcement cases — sector compliance nominal.</p>
        ) : (
          <div className="space-y-1.5">
            {rx.enforcement.map(e => {
              const done = e.stage === 'sanctioned' || sanctioned.has(e.id);
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2.5 py-1.5" style={{ borderColor: 'rgba(201,162,74,0.18)', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${sc(done ? 'ok' : e.tone)}` }}>
                  <span className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(e.tone) }}>{e.severity}</span>
                  <span className="font-mono text-[8.5px] tabular-nums text-ink-muted">{e.id}</span>
                  <span className="text-[10px] font-medium text-ink">{e.subject}</span>
                  <span className="text-[8px] text-ink-muted">{e.breach} · {e.stage}</span>
                  {done ? (
                    <span className="ml-auto text-[8px] font-bold uppercase tracking-wider" style={{ color: sc('ok') }}>✓ sanctioned</span>
                  ) : (
                    <button onClick={() => setSanctioned(prev => new Set(prev).add(e.id))}
                      className="focus-ring ml-auto rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                      style={{ borderColor: ACC, color: ACC }}>Issue sanction</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CommandPanel>

      <RuntimeQueue scope={`${id}:regulatory`} kind="permit" title="Licensing & accreditation runtime — applied → reviewed → inspected → granted" by="Regulatory Officer" role={role} withheld={withheld} />
    </div>
  );
}
