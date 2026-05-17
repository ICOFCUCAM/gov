'use client';

// Domain 1 — National Health Command · Situation Room.
// Cabinet-level crisis chamber: KPI telemetry with live sparklines,
// critical-alert feed, national operations map, real-time outbreak
// surveillance, hospital-capacity distribution, ICU trend, regional
// pressure, live emergency-response timeline, resource availability,
// AI intervention engine and inter-ministry propagation / systemic risk.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { nationalSituation, hospitalDeepExecution, pharmaceuticalDeepExecution, diseaseEpidemiology } from '@/lib/gov/health-operations';
import { healthGeo } from '@/lib/gov/health-geo';
import { GeoMap } from '@/apps/_shared/GeoMap';
import { propagateNationalEvent } from '@/lib/gov/national-propagation';
import { aiAdvisory } from '@/shared/ai/advisory';
import { waveSeries } from '@/lib/telemetry';
import {
  CommandHeader, CommandPanel, KpiSpark, Donut, TrendChart, Stepper, RingGauge, ACCENT, type Tone,
} from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const C = (t: 'ok' | 'warn' | 'alert') => `rgb(var(--c-${t}))`;
const ACC = ACCENT.situation!;
const ALERTS = [
  { t: 'Dengue outbreak escalation', sub: 'Capital District · East Region', lvl: 4 },
  { t: 'ICU capacity critical', sub: 'Northern Region', lvl: 4 },
  { t: 'Medicine stockout imminent', sub: 'Highland Region', lvl: 3 },
  { t: 'Flood impact — health facilities', sub: 'Coastal Region', lvl: 3 },
  { t: 'Surge in respiratory cases', sub: 'Western Corridor', lvl: 2 },
];

export function NationalSituationRoom({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const ns = nationalSituation(id, ts);
  const prev = nationalSituation(id, ts - 3);
  const hd = hospitalDeepExecution(id, ts);
  const px = pharmaceuticalDeepExecution(id, ts);
  const ep = diseaseEpidemiology(id, ts);
  const geo = healthGeo(id, ts);
  const rr = geo.reroute;
  const sev = Math.min(100, Math.round(ns.regions[0]!.composite * (ns.disasterState === 'national-disaster' ? 1 : 0.85)));
  const prop = propagateNationalEvent(
    { trigger: ns.activeOutbreaks >= 1 ? 'outbreak' : ns.nationalIcuLoad >= 90 ? 'capacity-collapse' : 'mass-casualty', severity: sev, originRegion: ns.worstRegion },
    ts,
  );
  const pTone: 'ok' | 'warn' | 'alert' = ns.posture === 'crisis' ? 'alert' : ns.posture === 'elevated' ? 'warn' : 'ok';
  const adv = aiAdvisory('National Situation Room', [
    { label: 'National ICU load', value: ns.nationalIcuLoad, adverse: true },
    { label: 'Active outbreaks', value: Math.min(100, ns.activeOutbreaks * 22), adverse: true },
    { label: 'Medicine shortfalls', value: Math.min(100, ns.medicineShortfalls * 16), adverse: true },
  ]);
  const healthIndex = Math.max(0, Math.min(100, 100 - Math.round(ns.regions.reduce((s, r) => s + r.composite, 0) / ns.regions.length)));
  const prevIndex = Math.max(0, Math.min(100, 100 - Math.round(prev.regions.reduce((s, r) => s + r.composite, 0) / prev.regions.length)));
  const stockout = px.criticalDrugs >= 3 ? 42 : px.criticalDrugs >= 1 ? 29 : 14;
  const vax = 100 - Math.round(ep.pathogens[0]!.attackRatePer100k / 14);
  const erMin = Math.round(60 - ns.ambulanceCoverPct * 0.4);
  const systemicRisk = Math.min(0.99, Math.round(((ns.regions.reduce((s, r) => s + r.composite, 0) / ns.regions.length / 100) * 0.6 + prop.terminalMagnitude / 100 * 0.4) * 100) / 100);
  const sr12 = waveSeries(`sr:${id}`, ts, 16, systemicRisk * 60, systemicRisk * 100);

  const capacity = [
    { label: 'Normal', value: Math.round(hd.regions.length * 28), tone: 'ok' as Tone },
    { label: 'High load', value: Math.round(hd.regions.length * 18), tone: 'warn' as Tone },
    { label: 'Critical', value: hd.regions.filter(r => r.surge === 'divert').length * 8 + 12, tone: 'alert' as Tone },
    { label: 'Offline', value: 6 + (hd.blockedBeds > 300 ? 9 : 3), tone: 'info' as Tone },
  ];
  const totalHosp = capacity.reduce((s, c) => s + c.value, 0);
  const erSteps = [
    { label: 'Reported', meta: '0 min', reached: true, tone: 'ok' as Tone },
    { label: 'Dispatch', meta: '2–4m', reached: true, tone: 'ok' as Tone },
    { label: 'En route', meta: '6–10m', reached: erMin >= 6, tone: 'warn' as Tone },
    { label: 'On scene', meta: '12–18m', reached: erMin >= 12, tone: erMin >= 18 ? 'alert' : 'warn' as Tone },
    { label: 'At facility', meta: '20–30m', reached: erMin >= 20, tone: erMin >= 23 ? 'alert' : 'ok' as Tone },
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#04070c', boxShadow: 'inset 0 0 80px rgba(0,0,0,0.7)' }}>
      <CommandHeader index={1} title="National Health Command" subtitle="Situation Room"
        postureLabel={`DISASTER · ${ns.disasterState}`}
        postureTone={ns.disasterState === 'national-disaster' || ns.disasterState === 'emergency' ? 'alert' : ns.disasterState === 'watch' ? 'warn' : 'ok'}
        now={now} role={role} accent={ACC} />

      {/* KPI telemetry strip with live sparklines */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        <KpiSpark label="National health index" value={`${healthIndex}`} unit="/100" delta={healthIndex - prevIndex} tone={healthIndex >= 70 ? 'ok' : healthIndex >= 45 ? 'warn' : 'alert'} points={waveSeries(`nhi:${id}`, ts, 14, healthIndex - 6, healthIndex + 4)} />
        <KpiSpark label="Critical alerts" value={`${ALERTS.filter(a => a.lvl >= 3).length}`} tone="alert" />
        <KpiSpark label="Hospital occupancy" value={`${ns.nationalBedPressure}%`} delta={ns.nationalBedPressure - prev.nationalBedPressure} deltaSuffix="%" tone={ns.nationalBedPressure >= 92 ? 'alert' : ns.nationalBedPressure >= 82 ? 'warn' : 'ok'} points={waveSeries(`ho:${id}`, ts, 14, ns.nationalBedPressure - 8, ns.nationalBedPressure + 4)} />
        <KpiSpark label="ICU occupancy" value={`${ns.nationalIcuLoad}%`} delta={ns.nationalIcuLoad - prev.nationalIcuLoad} deltaSuffix="%" tone={ns.nationalIcuLoad >= 95 ? 'alert' : ns.nationalIcuLoad >= 85 ? 'warn' : 'ok'} points={waveSeries(`icu:${id}`, ts, 14, ns.nationalIcuLoad - 6, ns.nationalIcuLoad + 6)} />
        <KpiSpark label="Emergency response" value={`${erMin}`} unit="min" delta={erMin - Math.round(60 - prev.ambulanceCoverPct * 0.4)} tone={erMin >= 23 ? 'alert' : erMin >= 15 ? 'warn' : 'ok'} />
        <KpiSpark label="Outbreak risk" value={ns.activeOutbreaks >= 2 ? 'HIGH' : ns.activeOutbreaks ? 'MED' : 'LOW'} unit={`L${Math.min(4, 1 + ns.activeOutbreaks)}`} tone={ns.activeOutbreaks >= 2 ? 'alert' : ns.activeOutbreaks ? 'warn' : 'ok'} />
        <KpiSpark label="Medicine stockout risk" value={`${stockout}%`} delta={px.criticalDrugs - prev.medicineShortfalls} tone={stockout >= 40 ? 'alert' : stockout >= 25 ? 'warn' : 'ok'} points={waveSeries(`ms:${id}`, ts, 14, stockout - 6, stockout + 8)} />
        <KpiSpark label="Vaccination coverage" value={`${vax}%`} delta={1} deltaSuffix="%" tone={vax >= 70 ? 'ok' : vax >= 55 ? 'warn' : 'alert'} points={waveSeries(`vx:${id}`, ts, 14, vax - 3, vax + 2)} />
      </div>

      {/* Critical alerts | National map | Real-time outbreaks */}
      <div className="grid gap-2 xl:grid-cols-4">
        <CommandPanel title="Critical alerts" meta={`${ALERTS.length} active`} accent={ACC} live>
          <div className="space-y-1">
            {ALERTS.map(a => {
              const tn: Tone = a.lvl >= 4 ? 'alert' : a.lvl >= 3 ? 'warn' : 'ok';
              return (
                <div key={a.t} className="rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1" style={{ borderLeft: `3px solid ${C(tn === 'alert' ? 'alert' : tn === 'warn' ? 'warn' : 'ok')}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium text-ink">{a.t}</span>
                    <span className="text-[7.5px] font-bold uppercase tracking-wider" style={{ color: C(tn === 'alert' ? 'alert' : tn === 'warn' ? 'warn' : 'ok') }}>L{a.lvl}</span>
                  </div>
                  <div className="text-[8px] text-ink-muted">{a.sub}</div>
                </div>
              );
            })}
          </div>
        </CommandPanel>
        <div className="xl:col-span-2">
          <CommandPanel title="National health map" meta="heatmap · outbreaks · facilities · routes" accent={ACC} live>
            <GeoMap geo={geo} metric="pressure" title="" height={280} />
          </CommandPanel>
        </div>
        <CommandPanel title="Real-time outbreaks" meta="Rt · 14-day trend" accent={ACC} live>
          <div className="space-y-1.5">
            {ep.pathogens.slice(0, 4).map(p => (
              <div key={p.pathogen} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] text-ink">{p.pathogen}</div>
                  <div className="text-[8px] text-ink-muted">Rt {p.rt}</div>
                </div>
                <svg width="42" height="16" viewBox="0 0 42 16" className="shrink-0">
                  <polyline points={waveSeries(`ob:${id}:${p.pathogen}`, ts, 12, 2, 14).map((v, i) => `${(i / 11) * 42},${16 - v}`).join(' ')}
                    fill="none" stroke={C(p.tone)} strokeWidth="1.1" />
                </svg>
                <span className="w-12 shrink-0 text-right text-[7.5px] font-bold uppercase" style={{ color: C(p.tone) }}>{p.phase === 'epidemic' ? 'high' : p.phase === 'cluster' ? 'med' : 'low'}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      {/* Capacity donut | ICU trend | regional pressure */}
      <div className="grid gap-2 xl:grid-cols-3">
        <CommandPanel title="Hospital capacity overview" meta="real-time" accent={ACC}>
          <Donut segments={capacity} total={totalHosp} label="hospitals" />
        </CommandPanel>
        <CommandPanel title="ICU capacity trend" meta="7-day · national · regions" accent={ACC} live>
          <TrendChart height={120}
            series={[
              { name: 'National', points: waveSeries(`tn:${id}`, ts, 14, 55, 88), tone: 'alert' },
              { name: 'Capital', points: waveSeries(`tc:${id}`, ts, 14, 45, 78), tone: 'warn' },
              { name: 'Northern', points: waveSeries(`tnr:${id}`, ts, 14, 30, 62), tone: 'ok' },
            ]} />
        </CommandPanel>
        <CommandPanel title="Health system pressure" meta="by region" accent={ACC}>
          <div className="space-y-0.5">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-1 text-[7px] font-bold uppercase tracking-wider text-ink-muted">
              <span>Region</span><span>Risk</span><span>Hosp</span><span>ICU</span>
            </div>
            {ns.regions.map(r => (
              <div key={r.region} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2 rounded-[2px] px-1 py-0.5 text-[9px]" style={{ background: r.tone === 'alert' ? 'color-mix(in srgb,rgb(var(--c-alert)) 8%,transparent)' : 'transparent' }}>
                <span className="truncate text-ink-soft">{r.region}</span>
                <span className="text-[7.5px] font-bold uppercase" style={{ color: C(r.tone) }}>{r.state}</span>
                <span className="font-mono tabular-nums text-ink-muted">{r.bedPressure}%</span>
                <span className="font-mono tabular-nums" style={{ color: C(r.tone) }}>{r.icuPressure}% {r.icuPressure >= 80 ? '↑' : r.icuPressure >= 60 ? '→' : '↓'}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      {/* Emergency response timeline */}
      <CommandPanel title="Emergency response timeline" meta={`national avg ${erMin}m · target < 20m`} accent={ACC} live>
        <div className="py-1"><Stepper steps={erSteps} /></div>
      </CommandPanel>

      {/* Resources | AI interventions | Propagation & systemic risk */}
      <div className="grid gap-2 xl:grid-cols-3">
        <CommandPanel title="Resource availability" accent={ACC}>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {[
              { l: 'Ambulances', v: '1,243', d: 6, t: 'ok' as Tone },
              { l: 'Ventilators', v: '6,312', d: 4, t: 'ok' as Tone },
              { l: 'ICU beds', v: `${2187}`, d: -1, t: 'warn' as Tone },
              { l: 'Blood units', v: '18,765', d: 8, t: 'ok' as Tone },
              { l: 'Oxygen MT', v: '312', d: 3, t: 'ok' as Tone },
            ].map(x => (
              <div key={x.l} className="rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1.5">
                <div className="text-[7px] uppercase tracking-wider text-ink-muted">{x.l}</div>
                <div className="font-mono text-[13px] tabular-nums text-ink">{x.v}</div>
                <div className="font-mono text-[8px] tabular-nums" style={{ color: x.d >= 0 ? C('ok') : C('warn') }}>{x.d >= 0 ? '▲' : '▼'}{Math.abs(x.d)}%</div>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="AI intervention recommendations" meta="priority actions" accent={ACC} live>
          <div className="space-y-1">
            {[{ x: rr.active ? rr.text : `Sustain surge readiness — ${ns.worstRegion}`, p: rr.active ? 'High' : 'Med' },
              ...prop.recommended.slice(0, 3).map((r, i) => ({ x: r, p: i === 0 ? 'High' : 'Med' }))].map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1">
                <span className="min-w-0 flex-1 text-[9.5px] text-ink-soft">{r.x}</span>
                <span className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb,${C(r.p === 'High' ? 'alert' : 'warn')} 18%,transparent)`, color: C(r.p === 'High' ? 'alert' : 'warn') }}>{r.p}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Propagation & systemic risk" meta="inter-ministry impact" accent={ACC}>
          <div className="flex items-center gap-3">
            <RingGauge value={systemicRisk * 100} label="systemic risk" tone={systemicRisk >= 0.65 ? 'alert' : systemicRisk >= 0.4 ? 'warn' : 'ok'} size={92} sub="index" />
            <div className="min-w-0 flex-1 space-y-0.5">
              {prop.hops.slice(1, 5).map(h => (
                <div key={h.order} className="flex items-center gap-1.5 text-[8.5px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">Health → {h.institution}</span>
                  <span className="font-mono tabular-nums" style={{ color: C(h.tone) }}>{(h.magnitude / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
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
