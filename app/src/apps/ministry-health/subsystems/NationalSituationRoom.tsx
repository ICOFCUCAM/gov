'use client';

// apps/ministry-health/subsystems/NationalSituationRoom — Domain 1,
// National Health Command. Cabinet-level crisis chamber: cinematic command
// substrate, national operations map, live regional pressure topology,
// crisis propagation, AI intervention engine. Sovereign Mode A.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { nationalSituation } from '@/lib/gov/health-operations';
import { healthGeo } from '@/lib/gov/health-geo';
import { GeoMap } from '@/apps/_shared/GeoMap';
import { propagateNationalEvent } from '@/lib/gov/national-propagation';
import { aiAdvisory } from '@/shared/ai/advisory';
import { CommandHeader, CommandPanel, KpiTile, RingGauge, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const C = (t: 'ok' | 'warn' | 'alert') => `rgb(var(--c-${t}))`;
const ACC = ACCENT.situation!;

export function NationalSituationRoom({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const ns = nationalSituation(id, ts);
  const prev = nationalSituation(id, ts - 3); // deterministic delta window
  const geo = healthGeo(id, ts);
  const rr = geo.reroute;
  const sev = Math.min(100, Math.round(ns.regions[0]!.composite * (ns.disasterState === 'national-disaster' ? 1 : 0.85)));
  const prop = propagateNationalEvent(
    { trigger: ns.activeOutbreaks >= 1 ? 'outbreak' : ns.nationalIcuLoad >= 90 ? 'capacity-collapse' : 'mass-casualty', severity: sev, originRegion: ns.worstRegion },
    ts,
  );
  const pT: 'ok' | 'warn' | 'alert' = ns.posture === 'crisis' ? 'alert' : ns.posture === 'elevated' ? 'warn' : 'ok';
  const adv = aiAdvisory('National Situation Room', [
    { label: 'National ICU load', value: ns.nationalIcuLoad, adverse: true },
    { label: 'Active outbreaks', value: Math.min(100, ns.activeOutbreaks * 22), adverse: true },
    { label: 'Critical regions', value: Math.min(100, ns.regions.filter(r => r.state === 'critical').length * 25), adverse: true },
    { label: 'Medicine shortfalls', value: Math.min(100, ns.medicineShortfalls * 16), adverse: true },
  ]);
  const readiness = Math.max(0, Math.min(100, 100 - Math.round(ns.regions.reduce((s, r) => s + r.composite, 0) / ns.regions.length)));
  const readinessTone: Tone = readiness >= 70 ? 'ok' : readiness >= 45 ? 'warn' : 'alert';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#04070c', boxShadow: 'inset 0 0 80px rgba(0,0,0,0.7)' }}>
      <CommandHeader index={1} title="National Health Command" subtitle="National Situation Room"
        postureLabel={`DISASTER · ${ns.disasterState}`} postureTone={ns.disasterState === 'national-disaster' || ns.disasterState === 'emergency' ? 'alert' : ns.disasterState === 'watch' ? 'warn' : 'ok'}
        now={now} role={role} accent={ACC} />

      <div className="rounded-[3px] border px-3 py-2 text-[12px] font-medium" style={{ borderColor: C(pT), color: C(pT), background: '#070b10', boxShadow: pT === 'alert' ? `0 0 20px color-mix(in srgb,${C('alert')} 26%,transparent)` : 'none' }}>
        {ns.headline}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-7">
        <KpiTile label="Bed pressure" value={`${ns.nationalBedPressure}%`} delta={ns.nationalBedPressure - prev.nationalBedPressure} tone={ns.nationalBedPressure >= 92 ? 'alert' : ns.nationalBedPressure >= 82 ? 'warn' : 'ok'} />
        <KpiTile label="ICU load" value={`${ns.nationalIcuLoad}%`} delta={ns.nationalIcuLoad - prev.nationalIcuLoad} tone={ns.nationalIcuLoad >= 95 ? 'alert' : ns.nationalIcuLoad >= 85 ? 'warn' : 'ok'} />
        <KpiTile label="Active outbreaks" value={`${ns.activeOutbreaks}`} delta={ns.activeOutbreaks - prev.activeOutbreaks} tone={ns.activeOutbreaks >= 2 ? 'alert' : ns.activeOutbreaks ? 'warn' : 'ok'} />
        <KpiTile label="Ambulance cover" value={`${ns.ambulanceCoverPct}%`} delta={ns.ambulanceCoverPct - prev.ambulanceCoverPct} tone={ns.ambulanceCoverPct < 55 ? 'alert' : ns.ambulanceCoverPct < 72 ? 'warn' : 'ok'} />
        <KpiTile label="Medicine shortfalls" value={`${ns.medicineShortfalls}`} delta={ns.medicineShortfalls - prev.medicineShortfalls} tone={ns.medicineShortfalls >= 3 ? 'alert' : ns.medicineShortfalls ? 'warn' : 'ok'} />
        <KpiTile label="Mortality idx" value={`${ns.mortalityIndex}`} delta={Math.round((ns.mortalityIndex - prev.mortalityIndex) * 10) / 10} tone={ns.mortalityIndex >= 16 ? 'alert' : ns.mortalityIndex >= 11 ? 'warn' : 'ok'} />
        <KpiTile label="Cascade reach" value={`${prop.reach}/${prop.hops.length}`} tone={prop.reach >= 4 ? 'alert' : prop.reach >= 2 ? 'warn' : 'ok'} sub={prop.escalation} />
      </div>

      <div className="flex items-start gap-2 rounded-[3px] border px-3 py-2"
        style={{ borderColor: C(rr.tone), background: '#070b10', boxShadow: rr.active ? `0 0 18px color-mix(in srgb,${C(rr.tone)} 30%,transparent)` : 'none' }}>
        <span className="mt-0.5 shrink-0 text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: C(rr.tone) }}>AI ▸</span>
        <span className="text-[11px] leading-snug" style={{ color: rr.active ? C(rr.tone) : 'rgb(var(--c-ink-soft))' }}>{rr.text}</span>
      </div>

      <div className="grid gap-2 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <CommandPanel title="National operations map" meta="regional pressure · live corridors" accent={ACC} live>
            <GeoMap geo={geo} metric="pressure" title="" height={300} />
          </CommandPanel>
        </div>
        <div className="space-y-2">
          <CommandPanel title="National readiness" accent={ACC}>
            <div className="flex items-center justify-around py-1">
              <RingGauge value={readiness} label="readiness" tone={readinessTone} size={104} sub="index" />
            </div>
          </CommandPanel>
          <CommandPanel title="AI command intelligence" meta={adv.severity} accent={ACC}>
            <div className="text-[10px] text-ink">{adv.headline}</div>
            <ul className="mt-1 space-y-0.5">
              {prop.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}
            </ul>
          </CommandPanel>
        </div>
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="Regional pressure topology" meta="bed · ICU · ER · outbreak · medicine" accent={ACC} dense>
            <div className="grid gap-0.5 p-1" style={{ gridTemplateColumns: '108px repeat(5,1fr) 52px' }}>
              <span />
              {['BED', 'ICU', 'ER', 'OUTBRK', 'MED'].map(h => <span key={h} className="px-1 text-center text-[7px] font-bold uppercase tracking-wider text-ink-muted">{h}</span>)}
              <span className="px-1 text-right text-[7px] font-bold uppercase tracking-wider text-ink-muted">CMP</span>
              {ns.regions.map(r => (
                <React.Fragment key={r.region}>
                  <span className="truncate px-1 py-1 text-[9px]" style={{ color: C(r.tone) }}>{r.region}</span>
                  {[r.bedPressure, r.icuPressure, r.emergencyLoad, r.outbreakHeat, r.medicineShortage].map((v, k) => {
                    const vt: 'ok' | 'warn' | 'alert' = v >= 80 ? 'alert' : v >= 58 ? 'warn' : 'ok';
                    return <div key={k} className="flex items-center justify-center py-1 font-mono text-[8.5px] tabular-nums" style={{ backgroundColor: `color-mix(in srgb,${C(vt)} ${Math.round(v * 0.62)}%,transparent)`, color: v >= 58 ? '#04070c' : 'rgb(var(--c-ink-soft))' }}>{v}</div>;
                  })}
                  <span className="px-1 py-1 text-right font-mono text-[9px] tabular-nums" style={{ color: C(r.tone), textShadow: `0 0 8px color-mix(in srgb,${C(r.tone)} 50%,transparent)` }}>{r.composite}</span>
                </React.Fragment>
              ))}
            </div>
          </CommandPanel>
        </div>
        <CommandPanel title="Crisis propagation" meta={`${prop.label} · ${prop.escalation}`} accent={ACC}>
          <div className="space-y-0.5">
            {prop.hops.map(h => (
              <div key={h.order} className="flex items-center gap-1.5 text-[9px]" style={{ opacity: h.status === 'latent' ? 0.42 : 1 }}>
                <span className="w-3 text-center font-mono text-ink-muted">{h.order}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{h.institution}{h.amplified ? <span style={{ color: C('alert') }}> ⤴</span> : null}</span>
                <span className="w-7 text-right font-mono tabular-nums" style={{ color: C(h.tone), textShadow: `0 0 6px color-mix(in srgb,${C(h.tone)} 50%,transparent)` }}>{h.magnitude}</span>
                <span className="w-9 text-right text-[7px] font-bold uppercase" style={{ color: C(h.tone) }}>{h.status}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <RuntimeQueue
        scope={`${id}:situation`}
        kind="incident"
        title="National command runtime — direct whole-of-nation health response"
        by="National Command"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
