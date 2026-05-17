'use client';

// apps/ministry-health/subsystems/WardSurgicalSystem — Layer 2 deepening:
// ward/nurse-station management, surgical queue intelligence and
// medication-schedule adherence. Hospital-dense Mode B.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { wardSurgicalOps } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function WardSurgicalSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const w = wardSurgicalOps(id, ts);
  const [expedited, setExpedited] = React.useState<Set<string>>(() => new Set());
  const pTone: 'ok' | 'warn' | 'alert' = w.posture === 'crisis' ? 'alert' : w.posture === 'strained' ? 'warn' : 'ok';
  const adv = aiAdvisory('Ward & Surgical Ops', [
    { label: 'Emergency surgical backlog', value: Math.min(100, w.emergencyBacklog * 30), adverse: true },
    { label: 'Critical wards', value: Math.min(100, w.wards.filter(x => x.acuity === 'critical').length * 26), adverse: true },
    { label: 'Medication non-adherence', value: Math.max(0, 100 - w.medicationAdherencePct), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Ward &amp; Surgical Operations</span>
        <PosturePill label={w.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">theatre util · <span className="text-ink-soft">{w.theatreUtilisationPct}%</span> · emergency backlog <span style={{ color: ac(w.emergencyBacklog ? 'alert' : 'ok') }}>{w.emergencyBacklog}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>
      <StatGrid items={[
        { l: 'Wards', v: `${w.wards.length}`, t: 'ok' },
        { l: 'Critical wards', v: `${w.wards.filter(x => x.acuity === 'critical').length}`, t: w.wards.some(x => x.acuity === 'critical') ? 'alert' : 'ok' },
        { l: 'Surgical cases', v: `${w.surgical.length}`, t: 'ok' },
        { l: 'Emergency backlog', v: `${w.emergencyBacklog}`, t: w.emergencyBacklog ? 'alert' : 'ok' },
        { l: 'Theatre util.', v: `${w.theatreUtilisationPct}%`, t: w.theatreUtilisationPct >= 92 ? 'warn' : 'ok' },
        { l: 'Med adherence', v: `${w.medicationAdherencePct}%`, t: w.medicationAdherencePct >= 90 ? 'ok' : 'warn' },
      ]} />
      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI ward/surgical intelligence · {adv.severity}</div>
        <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
      </div>
      <Panel title="Ward & nurse stations" meta="ward · occupied/beds · nurse ratio · acuity">
        <div className="space-y-1">
          {w.wards.map(x => (
            <div key={x.ward} className="flex items-center gap-2 text-[10px]">
              <span className="w-32 shrink-0 truncate text-ink">{x.ward}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, (x.occupied / x.beds) * 100)}%`, backgroundColor: ac(x.tone) }} /></div>
              <span className="w-24 shrink-0 text-right font-mono tabular-nums text-ink-muted">{x.occupied}/{x.beds} · 1:{x.nurseRatio}</span>
              <span className="w-14 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: ac(x.tone) }}>{x.acuity}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Surgical queue intelligence" meta="priority-ordered · expedite emergency cases">
        <div className="space-y-1.5">
          {w.surgical.map(s => {
            const done = s.status !== 'queued' || expedited.has(s.id);
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(s.tone)}` }}>
                <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: ac(s.priority === 'emergency' ? 'alert' : s.priority === 'urgent' ? 'warn' : 'ok') }}>{s.priority}</span>
                <span className="font-mono text-[9px] tabular-nums text-ink-muted">{s.id}</span>
                <span className="text-[11px] font-medium text-ink">{s.procedure}</span>
                <span className="text-[9px] text-ink-muted">{s.status} · wait {s.waitHrs}h</span>
                {s.priority === 'emergency' && s.status === 'queued' && !done ? (
                  <button onClick={() => setExpedited(prev => new Set(prev).add(s.id))}
                    className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">Expedite to theatre</button>
                ) : <span className="ml-auto text-[8.5px] uppercase tracking-wider" style={{ color: ac(done ? 'ok' : s.tone) }}>{done && s.status === 'queued' ? '✓ expedited' : s.status}</span>}
              </div>
            );
          })}
        </div>
      </Panel>
      <RuntimeQueue scope={`${id}:wards`} kind="case" title="Ward & surgical runtime — admit → schedule → operate → discharge" by="Charge Nurse" role={role} withheld={withheld} />
    </div>
  );
}
