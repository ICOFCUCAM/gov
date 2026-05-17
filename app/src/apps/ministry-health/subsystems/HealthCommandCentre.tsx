'use client';

// Domain 1 — National Health Command. The national operations centre and
// DEFAULT health surface: cinematic sovereign command wall built to the
// reference. Derives the dominant active national shock from live subsystem
// state, models its cascade through the federation, and lets command
// pre-empt the front. Distinct identity: propagation-cascade core.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { GeoMap } from '@/apps/_shared/GeoMap';
import { healthGeo } from '@/lib/gov/health-geo';
import { CommandHeader, CommandPanel, KpiSpark, Sparkline, sc, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import { diseaseIntel, hospitalOps } from '@/lib/gov/health-systems';
import { emergencyMedical, healthCommand, pharmaceuticalDeepExecution } from '@/lib/gov/health-operations';
import { propagateNationalEvent, type PropagationTrigger } from '@/lib/gov/national-propagation';
import { aiAdvisory } from '@/shared/ai/advisory';
import { waveSeries } from '@/lib/telemetry';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = ACCENT.command!;
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
  const geo = healthGeo(id, ts);
  const sp = (k: string, lo = 35, hi = 88) => waveSeries(`hcc:${k}`, ts, 18, lo, hi);

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
  const escTone: Tone = prop.escalation === 'cabinet' || prop.escalation === 'mobilise' ? 'alert' : prop.escalation === 'coordinate' ? 'warn' : 'ok';
  const pTone: Tone = hc.posture === 'crisis' ? 'alert' : hc.posture === 'elevated' ? 'warn' : 'ok';

  const adv = aiAdvisory('Health Command', [
    { label: 'Dominant shock severity', value: sev[dominant], adverse: true },
    { label: 'Cascade reach', value: Math.min(100, prop.reach * 14), adverse: true },
    { label: 'Terminal magnitude', value: prop.terminalMagnitude, adverse: true },
    { label: 'National Rt', value: Math.min(100, Math.round((di.nationalRt - 0.6) * 70)), adverse: true },
  ]);
  const at: Tone = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  const nhi = Math.max(40, Math.round(100 - hosp.mortalityIndex - hosp.beds.occupancyPct * 0.18));
  const criticalRegions = hc.regionalEscalations.filter(r => r.level === 'critical').length;

  const kpis: { label: string; value: string; unit?: string; tone: Tone; k: string }[] = [
    { label: 'National Health Index', value: `${nhi}`, tone: nhi >= 70 ? 'ok' : nhi >= 55 ? 'warn' : 'alert', k: 'nhi' },
    { label: 'Critical Alerts', value: `${criticalRegions}`, tone: criticalRegions ? 'alert' : 'ok', k: 'alr' },
    { label: 'ICU Occupancy', value: `${hosp.icu.occupancyPct}`, unit: '%', tone: hosp.icu.occupancyPct >= 90 ? 'alert' : hosp.icu.occupancyPct >= 78 ? 'warn' : 'ok', k: 'icu' },
    { label: 'Outbreak Risk', value: hc.outbreakAlerts >= 5 ? 'HIGH' : hc.outbreakAlerts >= 2 ? 'MED' : 'LOW', tone: hc.outbreakAlerts >= 5 ? 'alert' : hc.outbreakAlerts >= 2 ? 'warn' : 'ok', k: 'obr' },
    { label: 'Disaster', value: em.disasterPosture === 'major' ? 'L3' : em.disasterPosture === 'elevated' ? 'L2' : 'L1', tone: em.disasterPosture === 'major' ? 'alert' : em.disasterPosture === 'elevated' ? 'warn' : 'ok', k: 'dis' },
    { label: 'National Rt', value: `${di.nationalRt}`, tone: di.nationalRt > 1.3 ? 'alert' : di.nationalRt > 1 ? 'warn' : 'ok', k: 'rt' },
    { label: 'Cascade reach', value: `${prop.reach}/${prop.hops.length}`, tone: prop.reach >= 4 ? 'alert' : prop.reach >= 2 ? 'warn' : 'ok', k: 'csc' },
    { label: 'Cabinet window', value: `${prop.containmentWindowHrs}`, unit: 'h', tone: prop.containmentWindowHrs <= 4 ? 'alert' : prop.containmentWindowHrs <= 10 ? 'warn' : 'ok', k: 'cab' },
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#04080d', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      <CommandHeader index={1} title="National Health Command" subtitle="National Operations Centre"
        postureLabel={`${hc.posture.toUpperCase()} · ${prop.escalation.toUpperCase()}`} postureTone={pTone}
        now={now} role={role} accent={ACC} />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {kpis.map(k => <KpiSpark key={k.label} label={k.label} value={k.value} unit={k.unit} tone={k.tone} points={sp(k.k, k.tone === 'alert' ? 55 : 30, k.tone === 'alert' ? 95 : 80)} />)}
      </div>

      {/* National command map | National propagation cascade | AI + escalation */}
      <div className="grid gap-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <CommandPanel title="National command map" meta="health nodes · outbreak clusters · live" accent={ACC} live>
            <GeoMap geo={geo} metric="pressure" title="" height={250} />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[7.5px] uppercase tracking-wider text-ink-muted">
              {[['Stable', 'ok'], ['Elevated', 'warn'], ['Critical', 'alert'], ['Outbreak cell', 'alert']].map(([l, tn]) => (
                <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: sc(tn as Tone) }} />{l}</span>
              ))}
            </div>
          </CommandPanel>
        </div>
        <CommandPanel title={`National propagation · ${prop.label}`} meta={`origin ${di.worstRegion} · sev ${sev[active]}`} accent={ACC} live>
          <div className="space-y-1">
            {prop.hops.map(h => (
              <div key={h.order} className="flex items-center gap-1.5 rounded-[3px] border px-1.5 py-1"
                style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `3px solid ${sc(h.tone)}`, background: 'rgba(20,32,46,0.35)', opacity: h.status === 'latent' ? 0.5 : 1 }}>
                <span className="w-3.5 shrink-0 text-center font-mono text-[8px] text-ink-muted">{h.order}</span>
                <span className="min-w-0 flex-1 truncate text-[9px] font-medium text-ink">{h.institution}{h.amplified ? <span style={{ color: sc('alert') }}> ⤴</span> : null}</span>
                <span className="h-1 w-9 shrink-0 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full" style={{ width: `${h.magnitude}%`, background: sc(h.tone) }} /></span>
                <span className="w-7 shrink-0 text-right font-mono text-[8.5px] tabular-nums" style={{ color: sc(h.tone) }}>{h.magnitude}</span>
                <span className="w-8 shrink-0 text-right font-mono text-[7.5px] tabular-nums text-ink-muted">+{h.etaHrs}h</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(Object.keys(sev) as PropagationTrigger[]).map(k => {
              const on = k === active;
              return (
                <button key={k} onClick={() => setSelected(k)}
                  className="focus-ring rounded-[3px] border px-1.5 py-0.5 text-[8px] uppercase tracking-wider transition-colors"
                  style={{ borderColor: on ? sc(sev[k] >= 60 ? 'alert' : 'warn') : 'rgb(var(--c-line))', color: on ? 'rgb(var(--c-ink))' : 'rgb(var(--c-ink-muted))', background: on ? 'rgb(var(--c-surface-2))' : 'transparent' }}>
                  {TRIGGER_LABEL[k]} · {sev[k]}{k === dominant ? ' ●' : ''}
                </button>
              );
            })}
          </div>
        </CommandPanel>
        <div className="space-y-2">
          <CommandPanel title="AI command intelligence" meta={`${adv.confidence}%`} accent={ACC}>
            <div className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(at) }}>{adv.severity}</div>
            <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
            <ul className="mt-1 space-y-0.5">
              {prop.recommended.map((r, i) => <li key={i} className="text-[8.5px] text-ink-soft">▸ {r}</li>)}
              {adv.recommended.slice(0, 2).map((r, i) => <li key={`a${i}`} className="text-[8.5px] text-ink-muted">· {r}</li>)}
            </ul>
          </CommandPanel>
          <CommandPanel title="Regional escalation" meta="national → regional" accent={ACC}>
            <div className="space-y-1">
              {hc.regionalEscalations.map(r => {
                const pct = r.level === 'critical' ? 92 : r.level === 'watch' ? 60 : 28;
                return (
                  <div key={r.region} className="flex items-center gap-2 text-[8.5px]">
                    <span className="w-20 shrink-0 truncate text-ink-soft">{r.region}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: sc(r.tone), boxShadow: `0 0 6px ${sc(r.tone)}` }} /></span>
                    <span className="w-12 shrink-0 text-right font-mono uppercase tabular-nums" style={{ color: sc(r.tone) }}>{r.level}</span>
                  </div>
                );
              })}
            </div>
          </CommandPanel>
        </div>
      </div>

      {/* National telemetry strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['ICU load', 'icul', hosp.icu.occupancyPct >= 90 ? 'alert' : 'warn', `${hosp.icu.occupancyPct}%`],
          ['ER load', 'erl', em.activeDispatches >= 40 ? 'alert' : 'warn', `${em.activeDispatches}`],
          ['Ventilators', 'vent', hosp.icu.ventInUse / Math.max(1, hosp.icu.ventilators) >= 0.9 ? 'alert' : 'ok', `${hosp.icu.ventInUse}/${hosp.icu.ventilators}`],
          ['Staffing', 'stf', hosp.staffingPct >= 80 ? 'ok' : 'warn', `${hosp.staffingPct}%`],
        ].map(([l, k, tn, v]) => (
          <CommandPanel key={l as string} title={l as string} meta={v as string} accent={ACC}>
            <Sparkline points={sp(k as string, 40, 92)} tone={tn as Tone} width={150} height={28} />
          </CommandPanel>
        ))}
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
