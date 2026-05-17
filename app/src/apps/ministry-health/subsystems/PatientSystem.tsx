'use client';

// Domain 4 — Patient Systems. A TRUE citizen-health execution system:
// intake workflow board with real routing, prescription integrity,
// vaccination-coverage intelligence, emergency citizen status, AI
// guidance and the executable runtime. Cinematic sovereign language.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { patientServices } from '@/lib/gov/health-systems';
import { patientDeepExecution } from '@/lib/gov/health-operations';
import { CommandHeader, CommandPanel, KpiSpark, Sparkline, sc, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import { aiAdvisory } from '@/shared/ai/advisory';
import { waveSeries } from '@/lib/telemetry';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = ACCENT.citizen!;

export function PatientSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const ps = patientServices(id, ts);
  const pe = patientDeepExecution(id, ts);
  const sp = (k: string, lo = 35, hi = 88) => waveSeries(`pts:${k}`, ts, 18, lo, hi);

  const [routed, setRouted] = React.useState<Set<string>>(() => new Set());
  const isRouted = (r: { id: string; stage: string }) => (r.stage !== 'registration' && r.stage !== 'triage') || routed.has(r.id);
  const openIntake = pe.intake.filter(r => !isRouted(r)).length;

  const pTone: Tone = pe.posture === 'crisis' ? 'alert' : pe.posture === 'strained' ? 'warn' : 'ok';
  const adv = aiAdvisory('Patient Systems', [
    { label: 'Unrouted acute intake', value: Math.min(100, openIntake * 18), adverse: true },
    { label: 'Critical citizen status', value: Math.min(100, pe.emergencyStatuses.filter(e => e.status === 'critical').length * 30), adverse: true },
    { label: 'Records integrity gap', value: Math.max(0, (100 - pe.recordsIntegrityPct) * 12), adverse: true },
    { label: 'Vaccination coverage gap', value: Math.max(0, 100 - pe.vaccination[0]!.coveragePct), adverse: true },
  ]);
  const at: Tone = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  const kpis: { label: string; value: string; unit?: string; tone: Tone; k: string }[] = [
    { label: 'Citizens Enrolled', value: `${ps.registeredM}M`, tone: 'ok', k: 'enr' },
    { label: 'Open Intake', value: `${openIntake}/${pe.intake.length}`, tone: openIntake ? 'warn' : 'ok', k: 'itk' },
    { label: 'Records Integrity', value: `${pe.recordsIntegrityPct}`, unit: '%', tone: pe.recordsIntegrityPct >= 98 ? 'ok' : pe.recordsIntegrityPct >= 96 ? 'warn' : 'alert', k: 'rec' },
    { label: 'Appts Honoured', value: `${pe.appointmentsHonouredPct}`, unit: '%', tone: pe.appointmentsHonouredPct >= 85 ? 'ok' : 'warn', k: 'apt' },
    { label: 'Critical Citizens', value: `${pe.emergencyStatuses.filter(e => e.status === 'critical').length}`, tone: pe.emergencyStatuses.some(e => e.status === 'critical') ? 'alert' : 'ok', k: 'crt' },
    { label: 'Portal Uptime', value: `${ps.portalUptime}`, unit: '%', tone: ps.portalUptime >= 99 ? 'ok' : 'warn', k: 'upt' },
    { label: 'Mean Wait', value: `${pe.meanIntakeWaitMin}`, unit: 'm', tone: pe.meanIntakeWaitMin >= 40 ? 'alert' : 'warn', k: 'wat' },
    { label: 'Appointments', value: ps.appointmentsToday.toLocaleString(), tone: 'ok', k: 'apd' },
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#04100c', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.55)' }}>
      <CommandHeader index={4} title="Patient Systems" subtitle="Citizen-facing Health Services"
        postureLabel={pe.posture.toUpperCase()} postureTone={pTone} now={now} role={role} accent={ACC} />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {kpis.map(k => <KpiSpark key={k.label} label={k.label} value={k.value} unit={k.unit} tone={k.tone} points={sp(k.k, k.tone === 'alert' ? 50 : 30, k.tone === 'alert' ? 95 : 78)} />)}
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="space-y-2 xl:col-span-2">
          <CommandPanel title="Intake workflow board" meta="triage-ordered · route to next stage" accent={ACC} live>
            <div className="space-y-1">
              {pe.intake.map(r => {
                const done = isRouted(r);
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2 py-1"
                    style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `3px solid ${sc(done ? 'ok' : r.tone)}`, background: 'rgba(20,32,46,0.35)' }}>
                    <span className="w-7 shrink-0 text-center text-[8.5px] font-bold" style={{ color: sc(r.triage <= 2 ? 'alert' : r.triage === 3 ? 'warn' : 'ok') }}>T{r.triage}</span>
                    <span className="font-mono text-[8.5px] tabular-nums text-ink-muted">{r.id}</span>
                    <span className="text-[9.5px] text-ink">{r.channel}</span>
                    <span className="text-[8.5px] text-ink-muted">{r.stage} · {r.waitMin}m</span>
                    {done ? (
                      <span className="ml-auto text-[8px] font-bold uppercase tracking-wider" style={{ color: sc('ok') }}>✓ routed</span>
                    ) : (
                      <button onClick={() => setRouted(prev => new Set(prev).add(r.id))}
                        className="focus-ring ml-auto rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                        style={{ borderColor: ACC, color: ACC }}>Route to clinician</button>
                    )}
                  </div>
                );
              })}
            </div>
          </CommandPanel>
          {pe.emergencyStatuses.length > 0 ? (
            <CommandPanel title="Emergency citizen status" meta="citizen · status · facility" accent={ACC} live>
              <div className="space-y-1">
                {pe.emergencyStatuses.map(e => (
                  <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2 py-1"
                    style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `3px solid ${sc(e.tone)}`, background: 'rgba(20,32,46,0.35)' }}>
                    <span className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(e.tone) }}>{e.status}</span>
                    <span className="font-mono text-[8.5px] tabular-nums text-ink-muted">{e.citizen}</span>
                    <span className="text-[9.5px] text-ink">{e.facility}</span>
                    <span className="ml-auto font-mono text-[8.5px] tabular-nums text-ink-muted">{e.ageMin}m</span>
                  </div>
                ))}
              </div>
            </CommandPanel>
          ) : null}
        </div>
        <CommandPanel title="AI operational guidance" meta={`${adv.confidence}%`} accent={ACC}>
          <div className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(at) }}>{adv.severity}</div>
          <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
          <div className="text-[8.5px] text-ink-muted">{adv.rationale}</div>
          <ul className="mt-1 space-y-0.5">{adv.recommended.map((r, i) => <li key={i} className="text-[8.5px] text-ink-soft">▸ {r}</li>)}</ul>
        </CommandPanel>
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <CommandPanel title="Prescription integrity" meta="issued · flagged · interactions" accent={ACC}>
          <div className="space-y-1">
            {pe.rx.map(x => (
              <div key={x.category} className="flex items-center gap-2 text-[9px]">
                <span className="w-24 shrink-0 truncate text-ink-soft">{x.category}</span>
                <span className="min-w-0 flex-1 truncate text-[8.5px] text-ink-muted">{x.issued.toLocaleString()} issued</span>
                <span className="shrink-0 text-right font-mono tabular-nums" style={{ color: sc(x.tone) }}>{x.flagged} flag · {x.interactionAlerts} int</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Vaccination coverage intelligence" meta="vaccine · coverage · trend" accent={ACC}>
          <div className="space-y-1">
            {pe.vaccination.map(v => (
              <div key={v.vaccine} className="flex items-center gap-2 text-[9px]">
                <span className="w-28 shrink-0 truncate text-ink-soft">{v.vaccine} ({v.trend})</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full rounded-full" style={{ width: `${v.coveragePct}%`, background: sc(v.tone), boxShadow: `0 0 6px ${sc(v.tone)}` }} /></span>
                <span className="w-10 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(v.tone) }}>{v.coveragePct}%</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <CommandPanel title="Operational timeline" meta="most recent first" accent={ACC}>
        <div className="space-y-1">
          {pe.timeline.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-[9px]">
              <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atHrsAgo}h</span>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sc(e.tone) }} />
              <span className="min-w-0"><span className="text-[7.5px] uppercase tracking-wider text-ink-muted">{e.kind}</span><span className="block text-ink-soft">{e.detail}</span></span>
            </div>
          ))}
        </div>
      </CommandPanel>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([['Enrolment', 'enr', 'ok'], ['Intake flow', 'itk', 'warn'], ['Records sync', 'rec', 'ok'], ['Portal load', 'upt', 'ok']] as const).map(([l, k, tn]) => (
          <CommandPanel key={l} title={l} accent={ACC}>
            <Sparkline points={sp(k, 40, 92)} tone={tn as Tone} width={150} height={26} />
          </CommandPanel>
        ))}
      </div>

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
