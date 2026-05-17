'use client';

// Domain 1 — National Health Command · Situation Room. Rebuilt to the
// sovereign command benchmark: 8-metric command strip, a dominant national
// health map flanked by a critical-alert feed and a real-time
// outbreak/pressure/response intelligence column, then a capacity +
// resource + AI-intervention + inter-ministry propagation deck. Live
// deterministic engine state; executable runtime retained.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { GeoMap } from '@/apps/_shared/GeoMap';
import { healthGeo } from '@/lib/gov/health-geo';
import { CommandHeader, CommandPanel, KpiSpark, Sparkline, Donut, TrendChart, Stepper, sc, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import { diseaseIntel, hospitalOps } from '@/lib/gov/health-systems';
import { emergencyMedical, healthCommand, pharmaceuticalDeepExecution } from '@/lib/gov/health-operations';
import { propagateNationalEvent, type PropagationTrigger } from '@/lib/gov/national-propagation';
import { aiAdvisory } from '@/shared/ai/advisory';
import { wave, waveSeries } from '@/lib/telemetry';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = ACCENT.command!;
const MAP_TABS = [['Heatmap', 'pressure'], ['Outbreaks', 'outbreakHeat'], ['Facilities', 'icuLoad'], ['Routes', 'pressure']] as const;

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
  const sp = (k: string, lo = 35, hi = 88) => waveSeries(`hcc:${k}`, ts, 16, lo, hi);

  const sev: Record<PropagationTrigger, number> = {
    outbreak: Math.min(100, Math.round(Math.max(0, (di.nationalRt - 1) * 90) + hc.outbreakAlerts * 12 + di.mortality7d / 6)),
    'mass-casualty': Math.min(100, Math.round((em.disasterPosture === 'major' ? 70 : em.disasterPosture === 'elevated' ? 42 : 14) + em.hospitalDivert * 6 + em.activeDispatches * 0.6)),
    'drug-shortage': Math.min(100, Math.round(px.criticalDrugs * 20 + (px.posture === 'shortage' ? 38 : px.posture === 'strained' ? 18 : 0) + Math.max(0, 30 - px.nationalCoverDays))),
    'capacity-collapse': Math.min(100, Math.round(Math.max(0, hosp.beds.occupancyPct - 70) * 1.6 + Math.max(0, hosp.icu.occupancyPct - 80) * 1.4)),
  };
  const dominant = (Object.keys(sev) as PropagationTrigger[]).sort((a, b) => sev[b] - sev[a])[0]!;
  const prop = propagateNationalEvent({ trigger: dominant, severity: sev[dominant], originRegion: di.worstRegion }, ts);
  const pTone: Tone = hc.posture === 'crisis' ? 'alert' : hc.posture === 'elevated' ? 'warn' : 'ok';
  const adv = aiAdvisory('Health Command', [
    { label: 'Dominant shock severity', value: sev[dominant], adverse: true },
    { label: 'Cascade reach', value: Math.min(100, prop.reach * 14), adverse: true },
    { label: 'National Rt', value: Math.min(100, Math.round((di.nationalRt - 0.6) * 70)), adverse: true },
  ]);

  const nhi = Math.max(40, Math.round(100 - hosp.mortalityIndex - hosp.beds.occupancyPct * 0.18));
  const critAlertN = hc.regionalEscalations.filter(r => r.level === 'critical').length + di.outbreaks.filter(o => o.severity === 'critical').length;
  const stockoutRisk = Math.min(99, Math.max(4, Math.round(100 - px.nationalCoverDays * 2 + px.criticalDrugs * 6)));
  const [tab, setTab] = React.useState(0);

  const kpis: { l: string; v: string; u?: string; s: string; t: Tone; k: string }[] = [
    { l: 'NATIONAL HEALTH INDEX', v: `${nhi}`, u: '/100', s: `▲ ${(nhi / 34).toFixed(1)}`, t: nhi >= 70 ? 'ok' : nhi >= 55 ? 'warn' : 'alert', k: 'nhi' },
    { l: 'CRITICAL ALERTS', v: `${critAlertN}`, s: 'Active now', t: critAlertN ? 'alert' : 'ok', k: 'alr' },
    { l: 'HOSPITAL OCCUPANCY', v: `${hosp.beds.occupancyPct}%`, s: '▲ 4%', t: hosp.beds.occupancyPct >= 90 ? 'alert' : hosp.beds.occupancyPct >= 78 ? 'warn' : 'ok', k: 'hos' },
    { l: 'ICU OCCUPANCY', v: `${hosp.icu.occupancyPct}%`, s: '▲ 5%', t: hosp.icu.occupancyPct >= 90 ? 'alert' : hosp.icu.occupancyPct >= 78 ? 'warn' : 'ok', k: 'icu' },
    { l: 'EMERGENCY RESPONSE', v: `${em.meanResponseMin}`, u: 'min', s: 'National avg ▼ 3m', t: em.meanResponseMin >= 25 ? 'alert' : em.meanResponseMin >= 18 ? 'warn' : 'ok', k: 'ers' },
    { l: 'OUTBREAK RISK', v: hc.outbreakAlerts >= 5 ? 'HIGH' : hc.outbreakAlerts >= 2 ? 'MED' : 'LOW', s: `Level ${Math.min(4, 1 + hc.outbreakAlerts)}`, t: hc.outbreakAlerts >= 5 ? 'alert' : hc.outbreakAlerts >= 2 ? 'warn' : 'ok', k: 'obr' },
    { l: 'MEDICINE STOCKOUT RISK', v: `${stockoutRisk}%`, s: '▲ 6%', t: stockoutRisk >= 25 ? 'alert' : stockoutRisk >= 12 ? 'warn' : 'ok', k: 'mst' },
    { l: 'VACCINATION COVERAGE', v: `${di.vaccinationCoverage}%`, s: '▲ 1.8%', t: di.vaccinationCoverage >= 75 ? 'ok' : di.vaccinationCoverage >= 60 ? 'warn' : 'alert', k: 'vac' },
  ];

  const alerts = [
    ...di.outbreaks.filter(o => o.severity !== 'contained')
      .map(o => ({ title: `${o.disease} Outbreak ${o.severity === 'critical' ? 'Escalation' : 'Active'}`, region: o.region, lvl: o.severity === 'critical' ? 4 : 3, tone: (o.severity === 'critical' ? 'alert' : 'warn') as Tone })),
    ...hc.regionalEscalations.filter(r => r.level !== 'nominal')
      .map(r => ({ title: r.level === 'critical' ? 'ICU Capacity Critical' : 'System Pressure Rising', region: r.region, lvl: r.level === 'critical' ? 4 : 2, tone: r.tone })),
  ].sort((a, b) => b.lvl - a.lvl).slice(0, 6);

  const outbreaks = [...di.outbreaks].sort((a, b) => b.rt - a.rt).slice(0, 4)
    .map(o => ({ ...o, tone: (o.severity === 'critical' ? 'alert' : o.severity === 'active' ? 'warn' : 'ok') as Tone }));

  const pressure = hc.regionalEscalations.map(r => {
    const base = r.level === 'critical' ? 90 : r.level === 'watch' ? 72 : 52;
    const ho = Math.min(99, base + Math.round(wave(`po:${r.region}`, ts, 0, 8)));
    const iu = Math.min(99, base + 4 + Math.round(wave(`pi:${r.region}`, ts, 0, 7)));
    return { region: r.region, level: r.level, tone: r.tone, ho, iu, trend: r.level === 'critical' ? '↗' : r.level === 'watch' ? '→' : '↘' };
  });

  const totalHosp = geo.regions.length * 41;
  const hcap = [
    { label: 'Normal', value: Math.round(totalHosp * 0.43), tone: 'ok' as Tone },
    { label: 'High Load', value: Math.round(totalHosp * 0.36), tone: 'warn' as Tone },
    { label: 'Critical', value: Math.round(totalHosp * 0.15), tone: 'alert' as Tone },
    { label: 'Offline', value: Math.round(totalHosp * 0.06), tone: 'ok' as Tone },
  ];

  const resources = [
    { l: 'Ambulances', v: em.ambulanceFleet.toLocaleString(), d: '▲ 6%', t: 'ok' as Tone },
    { l: 'Ventilators', v: hosp.icu.ventilators.toLocaleString(), d: '▲ 4%', t: 'ok' as Tone },
    { l: 'ICU Beds', v: Math.max(0, Math.round(hosp.icu.ventilators * 0.35)).toLocaleString(), d: '▼ 1%', t: 'warn' as Tone },
    { l: 'Blood Units', v: (3200 + Math.round(wave('blood', ts, 0, 900))).toLocaleString(), d: '▲ 8%', t: 'ok' as Tone },
    { l: 'Oxygen (MT)', v: `${300 + Math.round(wave('o2', ts, 0, 60))}`, d: '▲ 3%', t: 'ok' as Tone },
  ];

  const sysRisk = (Math.min(99, prop.terminalMagnitude + prop.reach * 4) / 100).toFixed(2);

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#040b16', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)' }}>
      <CommandHeader index={1} title="National Health Command" subtitle="National Operations Centre · Situation Room"
        postureLabel={`${hc.posture.toUpperCase()} · ${prop.escalation.toUpperCase()}`} postureTone={pTone}
        now={now} role={role} accent={ACC} />

      {/* 8-metric command strip */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {kpis.map(m => (
          <div key={m.l} className="flex flex-col justify-between rounded-[4px] border px-2 py-1.5" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(8,18,32,0.6)' }}>
            <div className="truncate text-[7px] font-bold uppercase tracking-[0.12em] text-ink-muted">{m.l}</div>
            <div className="mt-0.5 flex items-end justify-between gap-1">
              <span className="flex items-baseline gap-0.5">
                <span className="font-mono text-[24px] font-bold leading-none tabular-nums" style={{ color: sc(m.t), textShadow: `0 0 12px color-mix(in srgb,${sc(m.t)} 45%,transparent)` }}>{m.v}</span>
                {m.u ? <span className="text-[8px] text-ink-muted">{m.u}</span> : null}
              </span>
              <Sparkline points={sp(m.k, m.t === 'alert' ? 55 : 30, m.t === 'alert' ? 95 : 80)} tone={m.t} width={44} height={16} />
            </div>
            <div className="truncate text-[7px]" style={{ color: m.s.includes('▲') && m.t === 'alert' ? sc('alert') : 'rgb(var(--c-ink-muted))' }}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* critical alerts | national health map | real-time intelligence */}
      <div className="grid gap-2 xl:grid-cols-4">
        <CommandPanel title="Critical Alerts" meta={`View all (${alerts.length})`} accent={ACC} live>
          <div className="flex h-full flex-col justify-between gap-1">
            {alerts.map((a, i) => (
              <div key={i} className="flex flex-1 flex-col justify-center rounded-[3px] border px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `3px solid ${sc(a.tone)}`, background: 'rgba(20,32,46,0.3)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-[9.5px] font-semibold text-ink">{a.title}</span>
                  <span className="shrink-0 font-mono text-[7.5px] text-ink-muted">{2 + i * 3}m ago</span>
                </div>
                <div className="flex items-center justify-between text-[8px] text-ink-muted">
                  <span className="truncate">{a.region}</span>
                  <span className="shrink-0 rounded-[2px] px-1 py-0.5 font-bold uppercase" style={{ background: `color-mix(in srgb,${sc(a.tone)} 18%,transparent)`, color: sc(a.tone) }}>Level {a.lvl}</span>
                </div>
              </div>
            ))}
          </div>
        </CommandPanel>

        <div className="xl:col-span-2">
          <CommandPanel title="National Health Map" accent={ACC} live
            meta={MAP_TABS.map(t => t[0]).join(' · ')}>
            <div className="mb-1 flex flex-wrap gap-1">
              {MAP_TABS.map(([label], i) => (
                <button key={label} onClick={() => setTab(i)}
                  className="focus-ring rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                  style={{ borderColor: tab === i ? ACC : 'rgb(var(--c-line))', color: tab === i ? ACC : 'rgb(var(--c-ink-muted))', background: tab === i ? `color-mix(in srgb,${ACC} 14%,transparent)` : 'transparent' }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="overflow-hidden rounded-[4px] border" style={{ borderColor: 'rgba(90,170,255,0.18)' }}>
              <GeoMap geo={geo} metric={MAP_TABS[tab]![1]} title={MAP_TABS[tab]![0]} height={300} accent={ACC} />
            </div>
          </CommandPanel>
        </div>

        <div className="space-y-2">
          <CommandPanel title="Real-Time Outbreaks" meta="View all" accent={ACC} live>
            <div className="space-y-1">
              {outbreaks.map(o => (
                <div key={`${o.disease}-${o.region}`} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sc(o.tone) }} />
                  <div className="min-w-0 flex-1"><div className="truncate text-[9px] font-medium text-ink">{o.disease}</div><div className="truncate text-[7.5px] text-ink-muted">{o.region}</div></div>
                  <span className="shrink-0 font-mono text-[8px] text-ink-muted">Rt {o.rt}</span>
                  <Sparkline points={sp(`ob:${o.region}`, 30, 80)} tone={o.tone} width={36} height={13} />
                  <span className="w-12 shrink-0 text-right text-[7px] font-bold uppercase" style={{ color: sc(o.tone) }}>{o.severity === 'critical' ? 'High' : o.severity === 'active' ? 'Medium' : 'Low'}</span>
                </div>
              ))}
            </div>
          </CommandPanel>
          <CommandPanel title="Health System Pressure" meta="by region" accent={ACC}>
            <div className="space-y-0.5 text-[7.5px]">
              <div className="flex items-center gap-1 border-b pb-0.5 font-bold uppercase tracking-wider text-ink-muted" style={{ borderColor: 'rgba(90,170,255,0.14)' }}>
                <span className="min-w-0 flex-1">Region</span><span className="w-14">Risk</span><span className="w-10 text-right">Hosp</span><span className="w-10 text-right">ICU</span><span className="w-5 text-center">T</span>
              </div>
              {pressure.map(p => (
                <div key={p.region} className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{p.region}</span>
                  <span className="w-14 font-bold uppercase" style={{ color: sc(p.tone) }}>{p.level === 'critical' ? 'Critical' : p.level === 'watch' ? 'High' : 'Low'}</span>
                  <span className="w-10 text-right font-mono tabular-nums" style={{ color: sc(p.tone) }}>{p.ho}%</span>
                  <span className="w-10 text-right font-mono tabular-nums" style={{ color: sc(p.tone) }}>{p.iu}%</span>
                  <span className="w-5 text-center" style={{ color: sc(p.tone) }}>{p.trend}</span>
                </div>
              ))}
            </div>
          </CommandPanel>
          <CommandPanel title="Emergency Response Timeline" meta="live" accent={ACC} live>
            <Stepper steps={[
              { label: 'Reported', meta: '0 min', reached: true, tone: 'ok' },
              { label: 'Dispatch', meta: '2–4 min', reached: em.meanResponseMin > 4, tone: 'ok' },
              { label: 'En Route', meta: '6–10 min', reached: em.meanResponseMin > 10, tone: 'warn' },
              { label: 'On Scene', meta: '12–18 min', reached: em.meanResponseMin > 18, tone: 'warn' },
              { label: 'At Facility', meta: '20–30 min', reached: em.meanResponseMin > 22, tone: em.meanResponseMin >= 25 ? 'alert' : 'ok' },
            ]} />
            <div className="mt-1 flex items-center justify-between text-[8px] text-ink-muted">
              <span>National Average <span className="font-mono text-ink-soft">{em.meanResponseMin} min</span></span>
              <span>Target <span className="font-mono" style={{ color: sc('ok') }}>&lt; 20 min</span></span>
            </div>
          </CommandPanel>
        </div>
      </div>

      {/* capacity + ICU trend | resources + AI interventions | propagation & systemic risk */}
      <div className="grid gap-2 xl:grid-cols-3">
        <CommandPanel title="Hospital Capacity Overview" meta="real-time" accent={ACC}>
          <div className="flex items-center gap-3">
            <Donut total={totalHosp} label="hospitals" size={104} segments={hcap} />
          </div>
          <div className="mt-2 border-t pt-1.5" style={{ borderColor: 'rgba(90,170,255,0.14)' }}>
            <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.14em] text-ink-soft">ICU Capacity Trend · 7 days</div>
            <TrendChart height={70} labels={['May 10', 'May 13', 'May 16']} series={[
              { name: 'National', points: sp('icn', 55, 85), tone: 'alert' },
              { name: 'Capital', points: sp('icc', 60, 92), tone: 'warn' },
              { name: 'Northern', points: sp('icnr', 45, 78), tone: 'ok' },
            ]} />
          </div>
        </CommandPanel>

        <CommandPanel title="Resource Availability & AI Interventions" accent={ACC}>
          <div className="grid grid-cols-5 gap-1">
            {resources.map(r => (
              <div key={r.l} className="rounded-[3px] border px-1 py-1 text-center" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(20,32,46,0.3)' }}>
                <div className="font-mono text-[12px] font-bold tabular-nums text-ink">{r.v}</div>
                <div className="truncate text-[6.5px] uppercase text-ink-muted">{r.l}</div>
                <div className="text-[6.5px]" style={{ color: r.d.includes('▼') ? sc('warn') : sc('ok') }}>{r.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[8px] font-bold uppercase tracking-[0.14em] text-ink-soft">AI Intervention Recommendations</div>
          <div className="mt-1 space-y-1">
            {[...prop.recommended.slice(0, 2), ...adv.recommended.slice(0, 2)].map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-[3px] border px-2 py-1 text-[8.5px]" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', borderLeft: `2px solid ${sc(i < 2 ? 'alert' : 'warn')}`, background: 'rgba(20,32,46,0.3)' }}>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{r}</span>
                <span className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[6.5px] font-bold uppercase" style={{ border: `1px solid ${sc(i < 2 ? 'alert' : 'warn')}`, color: sc(i < 2 ? 'alert' : 'warn') }}>{i < 2 ? 'High' : 'Medium'}</span>
              </div>
            ))}
          </div>
        </CommandPanel>

        <CommandPanel title="Propagation & Systemic Risk" meta="inter-ministry impact" accent={ACC} live>
          <div className="flex items-center justify-between rounded-[3px] border px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)', background: 'rgba(20,32,46,0.3)' }}>
            <div><div className="text-[7px] uppercase tracking-wider text-ink-muted">Systemic Risk Index</div><div className="font-mono text-[20px] font-bold tabular-nums" style={{ color: sc(+sysRisk >= 0.6 ? 'alert' : +sysRisk >= 0.4 ? 'warn' : 'ok') }}>{sysRisk}</div></div>
            <Sparkline points={sp('sri', 40, 92)} tone={+sysRisk >= 0.6 ? 'alert' : 'warn'} width={70} height={26} />
          </div>
          <div className="mt-1.5 space-y-1">
            {prop.hops.slice(0, 5).map(h => (
              <div key={h.order} className="flex items-center gap-2 text-[8.5px]">
                <span className="w-3 shrink-0 text-center font-mono text-[7px] text-ink-muted">{h.order}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">Health → {h.institution}</span>
                <span className="h-1 w-10 shrink-0 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full" style={{ width: `${h.magnitude}%`, background: sc(h.tone) }} /></span>
                <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(h.tone) }}>{(h.magnitude / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
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
