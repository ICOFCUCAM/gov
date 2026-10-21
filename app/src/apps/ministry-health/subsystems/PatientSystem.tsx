'use client';

// Domain 4 — Health Service Access. Citizen-facing service operations,
// counted per desk and per facility, never per person (CLAUDE.md, Health:
// no patient or clinical field anywhere): service desks and their waits,
// emergency attendances by facility, dispensing and immunisation coverage in
// aggregate, guidance and the executable runtime. Generated
// (lib/gov/health-admin.ts) until facility returns answer for it.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { DispatchChannel } from '@/apps/_shared/InstitutionChain';
import { serviceAccess } from '@/lib/gov/health-admin';
import { CommandHeader, CommandPanel, KpiSpark, Sparkline, sc, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import { aiAdvisory } from '@/shared/ai/advisory';
import { waveSeries } from '@/lib/telemetry';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

import { aiLabel } from '@/lib/nation/registry';
const ACC = ACCENT.citizen!;

export function PatientSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const sa = serviceAccess(id, ts);
  const sp = (k: string, lo = 35, hi = 88) => waveSeries(`pts:${k}`, ts, 18, lo, hi);

  // A desk over its waiting target can be given another counter (this session only).
  const [resourced, setResourced] = React.useState<Set<string>>(() => new Set());
  const isResourced = (d: { id: string; tone: string }) => d.tone === 'ok' || resourced.has(d.id);
  const openDesks = sa.desks.filter(d => !isResourced(d)).length;
  const waiting = sa.desks.reduce((a, d) => a + d.waiting, 0);
  const meanWait = Math.round(sa.desks.reduce((a, d) => a + d.meanWaitMin, 0) / Math.max(1, sa.desks.length));
  const emergencyAttendances = sa.emergencyByFacility.reduce((a, f) => a + f.attendances, 0);

  const pTone: Tone = sa.posture === 'crisis' ? 'alert' : sa.posture === 'strained' ? 'warn' : 'ok';
  const adv = aiAdvisory('Health Service Access', [
    { label: 'Desks over waiting target', value: Math.min(100, openDesks * 25), adverse: true },
    { label: 'Emergency attendances', value: Math.min(100, emergencyAttendances), adverse: true },
    { label: 'Returns completeness gap', value: Math.max(0, (100 - sa.recordsCompletenessPct) * 12), adverse: true },
    { label: 'Vaccination coverage gap', value: Math.max(0, 100 - (sa.vaccination[0]?.coveragePct ?? 100)), adverse: true },
  ]);
  const at: Tone = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  const kpis: { label: string; value: string; unit?: string; tone: Tone; k: string }[] = [
    { label: 'Portal Members', value: `${sa.enrolledM}M`, tone: 'ok', k: 'enr' },
    { label: 'Desks Over Target', value: `${openDesks}/${sa.desks.length}`, tone: openDesks ? 'warn' : 'ok', k: 'itk' },
    { label: 'Returns Complete', value: `${sa.recordsCompletenessPct}`, unit: '%', tone: sa.recordsCompletenessPct >= 98 ? 'ok' : sa.recordsCompletenessPct >= 96 ? 'warn' : 'alert', k: 'rec' },
    { label: 'Appts Honoured', value: `${sa.appointmentsHonouredPct}`, unit: '%', tone: sa.appointmentsHonouredPct >= 85 ? 'ok' : 'warn', k: 'apt' },
    { label: 'Emergency Attendances', value: `${emergencyAttendances}`, tone: emergencyAttendances > 40 ? 'alert' : 'ok', k: 'crt' },
    { label: 'Portal Uptime', value: `${sa.portalUptime}`, unit: '%', tone: sa.portalUptime >= 99 ? 'ok' : 'warn', k: 'upt' },
    { label: 'Mean Wait', value: `${meanWait}`, unit: 'm', tone: meanWait >= 40 ? 'alert' : 'warn', k: 'wat' },
    { label: 'Appointments', value: sa.appointmentsToday.toLocaleString(), tone: 'ok', k: 'apd' },
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#04100c', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.55)' }}>
      <CommandHeader index={4} title="Health Service Access" subtitle="Citizen-facing Health Services"
        postureLabel={sa.posture.toUpperCase()} postureTone={pTone} now={now} role={role} accent={ACC} />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {kpis.map(k => <KpiSpark key={k.label} label={k.label} value={k.value} unit={k.unit} tone={k.tone} points={sp(k.k, k.tone === 'alert' ? 50 : 30, k.tone === 'alert' ? 95 : 78)} />)}
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="space-y-2 xl:col-span-2">
          <CommandPanel title="Service desk board" meta={`${waiting} waiting · open a counter where a desk is over target`} accent={ACC} live>
            <div className="space-y-1">
              {sa.desks.map(d => {
                const done = isResourced(d);
                return (
                  <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2 py-1"
                    style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `3px solid ${sc(done ? 'ok' : d.tone)}`, background: 'rgba(20,32,46,0.35)' }}>
                    <span className="font-mono text-[8.5px] tabular-nums text-ink-muted">{d.id}</span>
                    <span className="text-[9.5px] text-ink">{d.desk}</span>
                    <span className="text-[8.5px] text-ink-muted">{d.waiting} waiting · mean {d.meanWaitMin}m</span>
                    {done ? (
                      <span className="ml-auto text-[8px] font-bold uppercase tracking-wider" style={{ color: sc('ok') }}>✓ within target</span>
                    ) : (
                      <button onClick={() => setResourced(prev => new Set(prev).add(d.id))}
                        className="focus-ring ml-auto rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                        style={{ borderColor: ACC, color: ACC }}>Open another counter</button>
                    )}
                  </div>
                );
              })}
            </div>
          </CommandPanel>
          {sa.emergencyByFacility.length > 0 ? (
            <CommandPanel title="Emergency attendances by facility" meta="facility · attendances (count)" accent={ACC} live>
              <div className="space-y-1">
                {sa.emergencyByFacility.map(e => (
                  <div key={e.facility} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2 py-1"
                    style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `3px solid ${sc(e.tone)}`, background: 'rgba(20,32,46,0.35)' }}>
                    <span className="text-[9.5px] text-ink">{e.facility}</span>
                    <span className="ml-auto font-mono text-[8.5px] tabular-nums text-ink-muted">{e.attendances}</span>
                  </div>
                ))}
              </div>
            </CommandPanel>
          ) : null}
        </div>
        <CommandPanel title={aiLabel('AI operational guidance', 'Operational guidance')} meta={`${adv.confidence}%`} accent={ACC}>
          <div className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(at) }}>{adv.severity}</div>
          <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
          <div className="text-[8.5px] text-ink-muted">{adv.rationale}</div>
          <ul className="mt-1 space-y-0.5">{adv.recommended.map((r, i) => <li key={i} className="text-[8.5px] text-ink-soft">▸ {r}</li>)}</ul>
        </CommandPanel>
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <CommandPanel title="Dispensing returns" meta="issued · flagged by pharmacies (counts)" accent={ACC}>
          <div className="space-y-1">
            {sa.dispensing.map(x => (
              <div key={x.category} className="flex items-center gap-2 text-[9px]">
                <span className="w-24 shrink-0 truncate text-ink-soft">{x.category}</span>
                <span className="min-w-0 flex-1 truncate text-[8.5px] text-ink-muted">{x.issued.toLocaleString()} issued</span>
                <span className="shrink-0 text-right font-mono tabular-nums" style={{ color: sc(x.tone === 'info' ? 'ok' : x.tone) }}>{x.flagged} flagged</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Vaccination coverage intelligence" meta="vaccine · coverage · trend" accent={ACC}>
          <div className="space-y-1">
            {sa.vaccination.map(v => (
              <div key={v.vaccine} className="flex items-center gap-2 text-[9px]">
                <span className="w-28 shrink-0 truncate text-ink-soft">{v.vaccine} ({v.trend})</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full rounded-full" style={{ width: `${v.coveragePct}%`, background: sc(v.tone === 'info' ? 'ok' : v.tone), boxShadow: `0 0 6px ${sc(v.tone === 'info' ? 'ok' : v.tone)}` }} /></span>
                <span className="w-10 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(v.tone === 'info' ? 'ok' : v.tone) }}>{v.coveragePct}%</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <CommandPanel title="Operational timeline" meta="most recent first" accent={ACC}>
        <div className="space-y-1">
          {sa.timeline.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-[9px]">
              <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atHrsAgo}h</span>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sc(e.tone === 'info' ? 'ok' : e.tone) }} />
              <span className="min-w-0"><span className="text-[7.5px] uppercase tracking-wider text-ink-muted">{e.kind}</span><span className="block text-ink-soft">{e.detail}</span></span>
            </div>
          ))}
        </div>
      </CommandPanel>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([['Portal members', 'enr', 'ok'], ['Desk flow', 'itk', 'warn'], ['Returns sync', 'rec', 'ok'], ['Portal load', 'upt', 'ok']] as const).map(([l, k, tn]) => (
          <CommandPanel key={l} title={l} accent={ACC}>
            <Sparkline points={sp(k, 40, 92)} tone={tn as Tone} width={150} height={26} />
          </CommandPanel>
        ))}
      </div>

      <DispatchChannel scope={`health:intakeline:${id}`} now={now} accent={ACC}
        selfTier="FACILITY" selfName="Service desk" toTier="ACTOR"
        title="Service desk ↔ facility staff — counters, rota and bed capacity" />

      <RuntimeQueue
        scope={`${id}:service-access`}
        kind="approval"
        title="Service access runtime — request → verify → fulfil → close"
        by="Service Officer"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
