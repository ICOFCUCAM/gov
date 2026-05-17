'use client';

// Domain 6 — Laboratory Systems. A TRUE laboratory execution system:
// specimen lifecycle pipeline, priority-laned queue intelligence, outbreak
// detection + regional escalation tree, capacity-based diagnostics
// routing, panic-value acknowledgement, AI guidance and the executable
// specimen-workflow runtime. Cinematic sovereign language, distinct rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { laboratoryNetwork, laboratoryExecution } from '@/lib/gov/health-operations';
import { CommandHeader, CommandPanel, KpiSpark, Sparkline, sc, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import { aiAdvisory } from '@/shared/ai/advisory';
import { waveSeries } from '@/lib/telemetry';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = ACCENT.lab!;

export function LaboratorySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const net = laboratoryNetwork(id, ts);
  const lx = laboratoryExecution(id, ts);
  const sp = (k: string, lo = 35, hi = 88) => waveSeries(`lab:${k}`, ts, 18, lo, hi);

  const [acked, setAcked] = React.useState<Set<string>>(() => new Set());
  const isAcked = (a: { id: string; acknowledged: boolean }) => a.acknowledged || acked.has(a.id);
  const unacked = lx.criticalAlerts.filter(a => !isAcked(a)).length;

  const pTone: Tone = lx.posture === 'crisis' ? 'alert' : lx.posture === 'strained' ? 'warn' : 'ok';
  const adv = aiAdvisory('Laboratory Systems', [
    { label: 'SLA breaches', value: Math.min(100, lx.slaBreaches), adverse: true },
    { label: 'Unacknowledged panic values', value: Math.min(100, unacked * 22), adverse: true },
    { label: 'Outbreak escalation', value: lx.escalationLevel === 'national' ? 92 : lx.escalationLevel === 'regional' ? 58 : 12, adverse: true },
    { label: 'Turnaround', value: Math.min(100, net.meanTurnaroundHrs), adverse: true },
  ]);
  const at: Tone = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  const kpis: { label: string; value: string; unit?: string; tone: Tone; k: string }[] = [
    { label: 'Laboratories', value: `${net.labs}`, tone: 'ok', k: 'lbs' },
    { label: 'Samples In Process', value: net.samplesInProcess.toLocaleString(), tone: 'ok', k: 'sip' },
    { label: 'Mean Turnaround', value: `${net.meanTurnaroundHrs}`, unit: 'h', tone: net.meanTurnaroundHrs >= 48 ? 'alert' : net.meanTurnaroundHrs >= 24 ? 'warn' : 'ok', k: 'tat' },
    { label: 'SLA Breaches', value: `${lx.slaBreaches}`, tone: lx.slaBreaches > 120 ? 'alert' : lx.slaBreaches > 30 ? 'warn' : 'ok', k: 'sla' },
    { label: 'Panic Values', value: `${unacked}/${lx.criticalAlerts.length}`, tone: unacked ? 'alert' : 'ok', k: 'pnc' },
    { label: 'LIS Sync', value: `${net.syncIntegrityPct}`, unit: '%', tone: net.syncIntegrityPct >= 98 ? 'ok' : 'warn', k: 'lis' },
    { label: 'Escalation', value: lx.escalationLevel.toUpperCase(), tone: lx.escalationLevel === 'national' ? 'alert' : lx.escalationLevel === 'regional' ? 'warn' : 'ok', k: 'esc' },
    { label: 'Backlog', value: net.backlog.toLocaleString(), tone: net.backlog > 5000 ? 'alert' : 'warn', k: 'bkl' },
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#08060f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <CommandHeader index={6} title="Laboratory Systems" subtitle="Pathology & Testing Networks"
        postureLabel={lx.posture.toUpperCase()} postureTone={pTone} now={now} role={role} accent={ACC} />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {kpis.map(k => <KpiSpark key={k.label} label={k.label} value={k.value} unit={k.unit} tone={k.tone} points={sp(k.k, k.tone === 'alert' ? 50 : 30, k.tone === 'alert' ? 95 : 78)} />)}
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="Specimen lifecycle pipeline" meta="collected → reported · inflow/outflow · bottleneck" accent={ACC} live>
            <div className="space-y-1">
              {lx.pipeline.map((s, i) => (
                <div key={s.stage} className="flex items-center gap-2 text-[9px]">
                  <span className="w-24 shrink-0 text-ink-soft">{i + 1}. {s.stage}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, s.count / 26)}%`, background: sc(s.tone), boxShadow: `0 0 6px ${sc(s.tone)}` }} /></span>
                  <span className="w-24 shrink-0 text-right font-mono tabular-nums text-ink-muted">{s.count.toLocaleString()} · {s.inflowPerHr}↓/{s.outflowPerHr}↑</span>
                  {s.bottleneck ? <span className="w-12 shrink-0 text-right text-[7px] font-bold uppercase" style={{ color: sc('alert') }}>bneck</span> : <span className="w-12 shrink-0" />}
                </div>
              ))}
            </div>
          </CommandPanel>
        </div>
        <CommandPanel title="AI operational guidance" meta={`${adv.confidence}%`} accent={ACC}>
          <div className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(at) }}>{adv.severity}</div>
          <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
          <div className="text-[8.5px] text-ink-muted">{adv.rationale}</div>
          <ul className="mt-1 space-y-0.5">{adv.recommended.map((r, i) => <li key={i} className="text-[8.5px] text-ink-soft">▸ {r}</li>)}</ul>
        </CommandPanel>
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <CommandPanel title="Testing queue intelligence" meta="priority lane · SLA · throughput" accent={ACC}>
          <div className="space-y-1">
            {lx.queues.map(q => (
              <div key={q.priority} className="rounded-[3px] border px-2 py-1.5"
                style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `3px solid ${sc(q.tone)}`, background: 'rgba(20,32,46,0.35)' }}>
                <div className="flex items-center justify-between gap-2 text-[9px]">
                  <span className="font-semibold text-ink">{q.priority}</span>
                  <span className="font-mono tabular-nums text-ink-muted">depth {q.depth.toLocaleString()} · {q.throughputPerHr}/hr</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[8px] text-ink-muted">
                  <span>SLA {q.slaHrs}h · oldest <span style={{ color: sc(q.oldestHrs > q.slaHrs ? 'alert' : 'ok') }}>{q.oldestHrs}h</span></span>
                  <span style={{ color: sc(q.tone) }}>{q.breaching} breaching</span>
                </div>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Outbreak detection · escalation tree" meta={`national · ${lx.escalationLevel}`} accent={ACC} live>
          <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: sc(lx.escalationLevel === 'national' ? 'alert' : lx.escalationLevel === 'regional' ? 'warn' : 'ok') }}>
            ▣ National laboratory command · {lx.escalationLevel}
          </div>
          <div className="space-y-1 border-l pl-2" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
            {lx.outbreaks.map(o => (
              <div key={`${o.pathogen}-${o.region}`} className="flex items-center gap-2 text-[9px]">
                <span className="w-20 shrink-0 truncate text-ink">{o.region}</span>
                <span className="min-w-0 flex-1 truncate text-[8.5px] text-ink-muted">{o.pathogen} · {o.trend}</span>
                <span className="w-9 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(o.tone) }}>{o.positivityPct}%</span>
                <span className="w-14 shrink-0 text-right text-[7px] font-bold uppercase" style={{ color: sc(o.tone) }}>{o.escalation}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <CommandPanel title="Critical-result alerts" meta="panic values · acknowledge to clear" accent={ACC} live>
        {lx.criticalAlerts.length === 0 ? (
          <p className="text-[10px] text-ink-muted">No outstanding panic values — all critical results acknowledged.</p>
        ) : (
          <div className="space-y-1.5">
            {lx.criticalAlerts.map(a => {
              const done = isAcked(a);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2.5 py-1.5"
                  style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `3px solid ${sc(done ? 'ok' : a.ageMin >= 30 ? 'alert' : 'warn')}`, background: 'rgba(20,32,46,0.35)' }}>
                  <span className="font-mono text-[8.5px] tabular-nums text-ink-muted">{a.id}</span>
                  <span className="text-[10px] font-medium text-ink">{a.test}</span>
                  <span className="text-[8.5px] text-ink-muted">{a.patient} · {a.ageMin}m ago</span>
                  {done ? (
                    <span className="ml-auto text-[8px] font-bold uppercase tracking-wider" style={{ color: sc('ok') }}>✓ acknowledged</span>
                  ) : (
                    <button onClick={() => setAcked(prev => new Set(prev).add(a.id))}
                      className="focus-ring ml-auto rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                      style={{ borderColor: ACC, color: ACC }}>Acknowledge</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CommandPanel>

      <div className="grid gap-2 xl:grid-cols-2">
        <CommandPanel title="Diagnostics routing" meta="specimen → lab tier · capacity" accent={ACC}>
          <div className="space-y-1">
            {lx.routing.map(r => (
              <div key={`${r.specimen}-${r.tier}`} className="flex items-center gap-2 text-[9px]">
                <span className="w-32 shrink-0 truncate text-ink-soft">{r.specimen} → {r.tier}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full rounded-full" style={{ width: `${r.capacityPct}%`, background: sc(r.tone) }} /></span>
                <span className="w-14 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(r.tone) }}>{r.capacityPct}%{r.rerouted ? ' ⤳' : ''}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Operational timeline" meta="most recent first" accent={ACC}>
          <div className="space-y-1">
            {lx.timeline.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-[9px]">
                <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atHrsAgo}h</span>
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sc(e.tone) }} />
                <span className="min-w-0"><span className="text-[7.5px] uppercase tracking-wider text-ink-muted">{e.kind}</span><span className="block text-ink-soft">{e.detail}</span></span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <RuntimeQueue
        scope={`${id}:lab`}
        kind="lab"
        title="Specimen runtime — received → accessioned → in assay → verified → reported"
        by="Lab Scientist"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
