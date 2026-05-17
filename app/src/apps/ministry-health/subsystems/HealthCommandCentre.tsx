'use client';

// apps/ministry-health/subsystems/HealthCommandCentre — the national
// health operations centre. NOT a stat strip: a dense propagation command
// surface that derives the dominant active national shock from live
// subsystem state, models its cascade through the federation (Lab →
// Disease Intel → Emergency → Border → Treasury → National Security →
// Cabinet), and lets command pre-empt the front. Multi-role aware.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { diseaseIntel, hospitalOps } from '@/lib/gov/health-systems';
import { emergencyMedical, healthCommand, pharmaceuticalDeepExecution } from '@/lib/gov/health-operations';
import { propagateNationalEvent, type PropagationTrigger } from '@/lib/gov/national-propagation';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const TRIGGER_LABEL: Record<PropagationTrigger, string> = {
  outbreak: 'Outbreak', 'mass-casualty': 'Mass-casualty', 'drug-shortage': 'Drug shortage', 'capacity-collapse': 'Capacity collapse',
};

export function HealthCommandCentre({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const di = diseaseIntel(id, ts);
  const em = emergencyMedical(id, ts);
  const hosp = hospitalOps(id, ts);
  const px = pharmaceuticalDeepExecution(id, ts);
  const hc = healthCommand(id, ts, di.outbreaks.filter(o => o.severity !== 'contained').length);

  // Live severity per national-shock vector — derived from real subsystem
  // engine state, never synthetic.
  const sev: Record<PropagationTrigger, number> = {
    outbreak: Math.min(100, Math.round(Math.max(0, (di.nationalRt - 1) * 90) + hc.outbreakAlerts * 12 + di.mortality7d / 6)),
    'mass-casualty': Math.min(100, Math.round((em.disasterPosture === 'major' ? 70 : em.disasterPosture === 'elevated' ? 42 : 14) + em.hospitalDivert * 6 + em.activeDispatches * 0.6)),
    'drug-shortage': Math.min(100, Math.round(px.criticalDrugs * 20 + (px.posture === 'shortage' ? 38 : px.posture === 'strained' ? 18 : 0) + Math.max(0, 30 - px.nationalCoverDays))),
    'capacity-collapse': Math.min(100, Math.round(Math.max(0, hosp.beds.occupancyPct - 70) * 1.6 + Math.max(0, hosp.icu.occupancyPct - 80) * 1.4)),
  };
  const ranked = (Object.keys(sev) as PropagationTrigger[]).sort((a, b) => sev[b] - sev[a]);
  const dominant = ranked[0]!;
  const [selected, setSelected] = React.useState<PropagationTrigger | null>(null);
  const active = selected ?? dominant;

  const prop = propagateNationalEvent({ trigger: active, severity: sev[active], originRegion: di.worstRegion }, ts);
  const escTone: 'ok' | 'warn' | 'alert' =
    prop.escalation === 'cabinet' ? 'alert' : prop.escalation === 'mobilise' ? 'alert' : prop.escalation === 'coordinate' ? 'warn' : 'ok';
  const pTone: 'ok' | 'warn' | 'alert' = hc.posture === 'crisis' ? 'alert' : hc.posture === 'elevated' ? 'warn' : 'ok';

  const adv = aiAdvisory('Health Command', [
    { label: 'Dominant shock severity', value: sev[dominant], adverse: true },
    { label: 'Cascade reach', value: Math.min(100, prop.reach * 14), adverse: true },
    { label: 'Terminal magnitude', value: prop.terminalMagnitude, adverse: true },
    { label: 'National Rt', value: Math.min(100, Math.round((di.nationalRt - 0.6) * 70)), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Health Command — national operations centre</span>
        <PosturePill label={hc.posture} tone={pTone} />
        <span className="text-[9px]" style={{ color: ac(escTone) }}>national escalation · {prop.escalation}</span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <StatGrid items={[
          { l: 'Posture', v: hc.posture, t: pTone },
          { l: 'Dominant shock', v: TRIGGER_LABEL[dominant], t: sev[dominant] >= 60 ? 'alert' : sev[dominant] >= 35 ? 'warn' : 'ok' },
          { l: 'Cascade reach', v: `${prop.reach}/${prop.hops.length}`, t: prop.reach >= 4 ? 'alert' : prop.reach >= 2 ? 'warn' : 'ok' },
          { l: 'Terminal mag.', v: `${prop.terminalMagnitude}`, t: prop.terminalMagnitude >= 65 ? 'alert' : prop.terminalMagnitude >= 38 ? 'warn' : 'ok' },
          { l: 'Cabinet window', v: `${prop.containmentWindowHrs}h`, t: prop.containmentWindowHrs <= 4 ? 'alert' : prop.containmentWindowHrs <= 10 ? 'warn' : 'ok' },
          { l: 'National Rt', v: `${di.nationalRt}`, t: di.nationalRt > 1.3 ? 'alert' : di.nationalRt > 1 ? 'warn' : 'ok' },
          { l: 'Bed occ.', v: `${hosp.beds.occupancyPct}%`, t: hosp.beds.occupancyPct >= 92 ? 'alert' : hosp.beds.occupancyPct >= 82 ? 'warn' : 'ok' },
          { l: 'Corridors', v: `${hc.logisticsCorridorsOpen}/${hc.logisticsCorridorsTotal}`, t: hc.logisticsCorridorsOpen < hc.logisticsCorridorsTotal ? 'warn' : 'ok' },
        ]} />
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel title={`National propagation · ${prop.label}`} meta={`origin ${di.worstRegion} · severity ${sev[active]} · escalation ${prop.escalation}`}>
            <div className="space-y-1">
              {prop.hops.map(h => (
                <div key={h.order} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1" style={{ borderLeft: `3px solid ${ac(h.tone)}`, opacity: h.status === 'latent' ? 0.5 : 1 }}>
                  <span className="w-5 shrink-0 text-center font-mono text-[9px] text-ink-muted">{h.order}</span>
                  <span className="w-36 shrink-0 truncate text-[10px] font-medium text-ink">{h.institution}{h.amplified ? <span style={{ color: ac('alert') }}> ⤴</span> : null}</span>
                  <span className="hidden min-w-0 flex-1 truncate text-[9px] text-ink-muted sm:block">{h.signal} → {h.action}</span>
                  <div className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-2 md:block"><span className="block h-full" style={{ width: `${h.magnitude}%`, backgroundColor: ac(h.tone) }} /></div>
                  <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: ac(h.tone) }}>{h.magnitude}</span>
                  <span className="w-10 shrink-0 text-right font-mono text-[8.5px] tabular-nums text-ink-muted">+{h.etaHrs}h</span>
                  <span className="w-12 shrink-0 text-right text-[7.5px] font-bold uppercase tracking-[0.12em]" style={{ color: ac(h.tone) }}>{h.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(Object.keys(sev) as PropagationTrigger[]).map(k => (
                <button key={k} onClick={() => setSelected(k)}
                  className="focus-ring rounded-[3px] border px-2 py-0.5 text-[9px] uppercase tracking-wider transition-colors"
                  style={{ borderColor: k === active ? ac(sev[k] >= 60 ? 'alert' : 'warn') : 'rgb(var(--c-line))', color: k === active ? 'rgb(var(--c-ink))' : 'rgb(var(--c-ink-muted))' }}>
                  {TRIGGER_LABEL[k]} · {sev[k]}{k === dominant ? ' ●' : ''}
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <div className="space-y-2">
          <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI command intelligence · {adv.severity}</span>
              <span className="font-mono text-[9px] tabular-nums text-ink-muted">{adv.confidence}%</span>
            </div>
            <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
            <ul className="mt-1 space-y-0.5">
              {prop.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}
              {adv.recommended.slice(0, 2).map((r, i) => <li key={`a${i}`} className="text-[9px] text-ink-muted">· {r}</li>)}
            </ul>
          </div>
          <Panel title="Regional escalation" meta="national → regional">
            <Bars rows={hc.regionalEscalations.map(r => ({ label: r.region, pct: r.level === 'critical' ? 92 : r.level === 'watch' ? 60 : 28, tone: r.tone, tail: r.level }))} />
          </Panel>
        </div>
      </div>

      <RuntimeQueue
        scope={`${id}:command`}
        kind="incident"
        title="Health Command runtime — direct national health operations"
        by="Health Command"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
