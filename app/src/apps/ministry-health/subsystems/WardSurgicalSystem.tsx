'use client';

// Domain — Ward & Surgical Operations. Ward/nurse-station management,
// surgical queue intelligence and medication-schedule adherence.
// Cinematic sovereign command rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { wardSurgicalOps } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import { CommandPanel, sc, type Tone } from '@/apps/_shared/SovereignUI';
import { OpsHeader, KpiStrip, AdvisoryPanel } from '@/apps/ministry-health/subsystems/_ops';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = '#3fd6a8';

export function WardSurgicalSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const w = wardSurgicalOps(id, ts);
  const [expedited, setExpedited] = React.useState<Set<string>>(() => new Set());
  const pTone: Tone = w.posture === 'crisis' ? 'alert' : w.posture === 'strained' ? 'warn' : 'ok';
  const adv = aiAdvisory('Ward & Surgical Ops', [
    { label: 'Emergency surgical backlog', value: Math.min(100, w.emergencyBacklog * 30), adverse: true },
    { label: 'Critical wards', value: Math.min(100, w.wards.filter(x => x.acuity === 'critical').length * 26), adverse: true },
    { label: 'Medication non-adherence', value: Math.max(0, 100 - w.medicationAdherencePct), adverse: true },
  ]);

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#04100c', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={17} title="Ward & Surgical Operations" subtitle="Ward Stations · Surgical Queue · Adherence"
        posture={w.posture} tone={pTone} now={now} role={role} accent={ACC} />

      <KpiStrip ts={ts} accent={ACC} items={[
        { l: 'Wards', v: `${w.wards.length}`, s: 'monitored', t: 'ok', k: 'wsw' },
        { l: 'Critical Wards', v: `${w.wards.filter(x => x.acuity === 'critical').length}`, s: 'acuity', t: w.wards.some(x => x.acuity === 'critical') ? 'alert' : 'ok', k: 'wsc' },
        { l: 'Surgical Cases', v: `${w.surgical.length}`, s: 'in queue', t: 'ok', k: 'wss' },
        { l: 'Emergency Backlog', v: `${w.emergencyBacklog}`, s: 'awaiting', t: w.emergencyBacklog ? 'alert' : 'ok', k: 'wsb' },
        { l: 'Theatre Util.', v: `${w.theatreUtilisationPct}%`, s: 'capacity', t: w.theatreUtilisationPct >= 92 ? 'warn' : 'ok', k: 'wst' },
        { l: 'Med Adherence', v: `${w.medicationAdherencePct}%`, s: 'national', t: w.medicationAdherencePct >= 90 ? 'ok' : 'warn', k: 'wsm' },
      ]} />

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="Ward & nurse stations" meta="ward · occupied/beds · nurse ratio · acuity" accent={ACC} live>
            <div className="space-y-1">
              {w.wards.map(x => (
                <div key={x.ward} className="flex items-center gap-2 text-[8.5px]">
                  <span className="w-28 shrink-0 truncate text-ink">{x.ward}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#0c1c16' }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, (x.occupied / x.beds) * 100)}%`, background: sc(x.tone), boxShadow: `0 0 6px ${sc(x.tone)}` }} /></span>
                  <span className="w-24 shrink-0 text-right font-mono tabular-nums text-ink-muted">{x.occupied}/{x.beds} · 1:{x.nurseRatio}</span>
                  <span className="w-12 shrink-0 text-right text-[7px] font-bold uppercase" style={{ color: sc(x.tone) }}>{x.acuity}</span>
                </div>
              ))}
            </div>
          </CommandPanel>
        </div>
        <AdvisoryPanel accent={ACC} severity={adv.severity} headline={adv.headline} recommended={adv.recommended} />
      </div>

      <CommandPanel title="Surgical queue intelligence" meta="priority-ordered · expedite emergency cases" accent={ACC} live>
        <div className="space-y-1.5">
          {w.surgical.map(s => {
            const done = s.status !== 'queued' || expedited.has(s.id);
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2.5 py-1.5" style={{ borderColor: 'rgba(63,214,168,0.18)', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${sc(s.tone)}` }}>
                <span className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(s.priority === 'emergency' ? 'alert' : s.priority === 'urgent' ? 'warn' : 'ok') }}>{s.priority}</span>
                <span className="font-mono text-[8.5px] tabular-nums text-ink-muted">{s.id}</span>
                <span className="text-[10px] font-medium text-ink">{s.procedure}</span>
                <span className="text-[8px] text-ink-muted">{s.status} · wait {s.waitHrs}h</span>
                {s.priority === 'emergency' && s.status === 'queued' && !done ? (
                  <button onClick={() => setExpedited(prev => new Set(prev).add(s.id))}
                    className="focus-ring ml-auto rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                    style={{ borderColor: ACC, color: ACC }}>Expedite to theatre</button>
                ) : <span className="ml-auto text-[8px] uppercase tracking-wider" style={{ color: sc(done ? 'ok' : s.tone) }}>{done && s.status === 'queued' ? '✓ expedited' : s.status}</span>}
              </div>
            );
          })}
        </div>
      </CommandPanel>

      <RuntimeQueue scope={`${id}:wards`} kind="case" title="Ward & surgical runtime — admit → schedule → operate → discharge" by="Charge Nurse" role={role} withheld={withheld} />
    </div>
  );
}
