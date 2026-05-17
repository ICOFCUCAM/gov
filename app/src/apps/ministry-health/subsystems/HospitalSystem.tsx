'use client';

// apps/ministry-health/subsystems/HospitalSystem — a TRUE hospital-network
// execution system: regional capacity grid with surge/divert, ICU
// orchestration, operating-theatre management, ambulance zone
// coordination, national capacity telemetry, AI guidance and the
// executable admissions runtime. Multi-role aware.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { hospitalOps } from '@/lib/gov/health-systems';
import { hospitalDeepExecution } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function HospitalSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const h = hospitalOps(id, ts);
  const hd = hospitalDeepExecution(id, ts);

  // Inter-facility transfer authorisation — a real operational action.
  const [accepted, setAccepted] = React.useState<Set<string>>(() => new Set());

  const pTone: 'ok' | 'warn' | 'alert' =
    hd.posture === 'crisis' ? 'alert' : hd.posture === 'strained' ? 'warn' : 'ok';

  const adv = aiAdvisory('Hospital Network', [
    { label: 'Bed headroom', value: Math.max(0, 100 - hd.nationalBedHeadroomPct * 4), adverse: true },
    { label: 'Regions on divert', value: Math.min(100, hd.regions.filter(r => r.surge === 'divert').length * 34), adverse: true },
    { label: 'ICU escalation', value: Math.min(100, hd.icu.filter(u => u.escalation === 'critical').length * 34), adverse: true },
    { label: 'Theatre delays', value: Math.min(100, hd.theatres.filter(x => x.status === 'delayed').length * 18), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' =
    adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Hospital Network</span>
        <PosturePill label={hd.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">bed headroom · <span className="text-ink-soft">{hd.nationalBedHeadroomPct}%</span> · transfers <span className="text-ink-soft">{hd.transferRequests}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Bed occupancy', v: `${h.beds.occupancyPct}%`, t: h.beds.occupancyPct >= 92 ? 'alert' : h.beds.occupancyPct >= 82 ? 'warn' : 'ok' },
        { l: 'ICU occupancy', v: `${h.icu.occupancyPct}%`, t: h.icu.occupancyPct >= 95 ? 'alert' : h.icu.occupancyPct >= 85 ? 'warn' : 'ok' },
        { l: 'Ventilators', v: `${h.icu.ventInUse}/${h.icu.ventilators}`, t: h.icu.ventInUse / h.icu.ventilators >= 0.9 ? 'alert' : 'warn' },
        { l: 'Theatre util.', v: `${h.theatres.utilisationPct}%`, t: h.theatres.utilisationPct >= 92 ? 'warn' : 'ok' },
        { l: 'Blocked beds', v: `${hd.blockedBeds}`, t: hd.blockedBeds > 300 ? 'alert' : hd.blockedBeds > 150 ? 'warn' : 'ok' },
        { l: 'Admit/Disch per hr', v: `${hd.admissionsPerHr}/${hd.dischargesPerHr}`, t: hd.admissionsPerHr > hd.dischargesPerHr + 30 ? 'alert' : 'ok' },
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

      <Panel title="Regional capacity grid" meta="bed/ICU occupancy · surge state · accept transfer">
        <div className="space-y-1.5">
          {hd.regions.map(r => {
            const done = accepted.has(r.region);
            return (
              <div key={r.region} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(r.tone)}` }}>
                <span className="w-28 shrink-0 truncate text-[11px] text-ink">{r.region}</span>
                <span className="font-mono text-[9px] tabular-nums text-ink-muted">bed {r.bedOccPct}% · ICU {r.icuOccPct}%</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: ac(r.tone) }}>{r.surge}</span>
                {r.transfersPending > 0 ? (
                  done ? (
                    <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: ac('ok') }}>✓ {r.transfersPending} accepted</span>
                  ) : (
                    <button
                      onClick={() => setAccepted(prev => new Set(prev).add(r.region))}
                      className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">
                      Accept {r.transfersPending} transfer{r.transfersPending === 1 ? '' : 's'}
                    </button>
                  )
                ) : <span className="ml-auto text-[8.5px] text-ink-muted">no transfers</span>}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="ICU orchestration" meta="unit · occupied/beds · vent · ECMO · escalation">
          <div className="space-y-1">
            {hd.icu.map(u => (
              <div key={u.unit} className="flex items-center gap-2 text-[10px]">
                <span className="w-28 shrink-0 truncate text-ink">{u.unit}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, (u.occupied / u.beds) * 100)}%`, backgroundColor: ac(u.tone) }} /></div>
                <span className="w-32 shrink-0 text-right font-mono tabular-nums text-ink-muted">{u.occupied}/{u.beds} · v{u.ventilated} · e{u.ecmo}</span>
                <span className="w-14 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: ac(u.tone) }}>{u.escalation}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Operating theatre management" meta="theatre · case · status · delay">
          <div className="space-y-1">
            {hd.theatres.map(x => (
              <div key={x.theatre} className="flex items-center gap-2 text-[10px]">
                <span className="w-14 shrink-0 text-ink">{x.theatre}</span>
                <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{x.caseType}</span>
                <span className="w-16 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: ac(x.tone) }}>{x.status}</span>
                <span className="w-12 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(x.tone) }}>{x.delayMin}m</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Ambulance zone coordination" meta="zone · available/units · ETA · posture">
          <Bars rows={hd.ambulanceZones.map(z => ({ label: `${z.zone} (${z.available}/${z.units})`, pct: Math.min(100, (z.available / z.units) * 100), tone: z.tone, tail: `${z.meanEtaMin}m` }))} />
        </Panel>
        <Panel title="Operational timeline" meta="most recent first">
          <div className="space-y-1">
            {hd.timeline.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px]">
                <span className="w-12 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atHrsAgo}h</span>
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ac(e.tone) }} />
                <span className="min-w-0"><span className="text-[8px] uppercase tracking-wider text-ink-muted">{e.kind}</span><span className="block text-ink-soft">{e.detail}</span></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <RuntimeQueue
        scope={`${id}:hospitals`}
        kind="case"
        title="Admissions & capacity runtime — admit → place → escalate → discharge"
        by="Bed Manager"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
