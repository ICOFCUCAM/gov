'use client';

// Environment — Atmospheric & Hydrological Systems. Atmospheric event
// feed at top; river basin flow streams in the middle; oceanic
// horizon bars at the foot. Wind-arc separators and water-current
// flow strokes. No riveted frames, no chamber.

import * as React from 'react';
import { climateResilienceBoard, type AtmosphericEvent, type RiverBasin } from '@/lib/gov/climate-resilience';

const FOREST_DEEP = '#152721';
const PANEL = '#1a221f';
const ATMOS = '#6a7d8a';
const ATMOS_DARK = '#2a3a48';
const SKY = '#314050';
const SKY_LIGHT = '#5a8db0';
const GLACIER = '#e5e8e6';
const AMBER = '#b88b3a';
const CANOPY = '#4f7a5e';
const INK = '#d6dad3';
const MUT = '#7d8881';
const ALERT = '#a04030';

const EVENT_COL: Record<AtmosphericEvent['severity'], string> = {
  advisory: ATMOS, watch: AMBER, warning: '#a05538', emergency: ALERT,
};

const RIVER_COL: Record<RiverBasin['status'], string> = {
  healthy: SKY_LIGHT, thinning: AMBER, stressed: '#a05538', contaminated: ALERT,
};

const KIND_GLYPH: Record<AtmosphericEvent['kind'], string> = {
  heatwave: '☀', 'cold-snap': '❄', 'severe-storm': '⛈', 'wind-event': '⤴', 'air-quality-spike': '◌', 'pollen-surge': '✿',
};

function WindArc() {
  return (
    <svg width="100%" height="32" viewBox="0 0 800 32" preserveAspectRatio="none" className="block" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => {
        const y = 6 + i * 5;
        return <path key={i} d={`M0 ${y} Q200 ${y - 6} 400 ${y} T800 ${y + (i % 2 ? -3 : 3)}`} stroke={ATMOS} strokeOpacity={0.32} strokeWidth={0.8} fill="none" />;
      })}
    </svg>
  );
}

function RiverFlow({ r }: { r: RiverBasin }) {
  const w = 360, h = 48;
  const amplitude = 8 + (r.flowIdx / 100) * 8;
  const segments = 7;
  const path = Array.from({ length: segments + 1 }, (_, i) => {
    const x = (i / segments) * w;
    const y = h / 2 + Math.sin(i * 0.9) * amplitude * (r.status === 'contaminated' ? 0.4 : 1);
    return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
      {/* banks */}
      <line x1={0} y1={6} x2={w} y2={6} stroke="rgba(214,218,211,0.08)" />
      <line x1={0} y1={h - 6} x2={w} y2={h - 6} stroke="rgba(214,218,211,0.08)" />
      {/* contamination flecks */}
      {r.contaminationIdx > 30 && Array.from({ length: Math.round(r.contaminationIdx / 8) }).map((_, i) => (
        <circle key={i} cx={20 + i * 22} cy={h / 2 + (i % 2 ? 4 : -4)} r={1.4} fill={ALERT} fillOpacity={0.7} />
      ))}
      {/* current */}
      <path d={path} stroke={RIVER_COL[r.status]} strokeWidth={2.2} fill="none" />
      {/* under-shadow */}
      <path d={path} stroke={RIVER_COL[r.status]} strokeOpacity={0.25} strokeWidth={5} fill="none" />
    </svg>
  );
}

export function AtmosphericHydrologicalSystems({ id, now }: { id: string; now: number }) {
  void id;
  const b = climateResilienceBoard(now);
  const a = b.atmosphere;
  const o = b.ocean;
  return (
    <div style={{ background: FOREST_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      {/* Atmospheric horizon */}
      <header className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${ATMOS_DARK} 0%, ${SKY} 100%)` }}>
        <div className="px-8 py-5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GLACIER, opacity: 0.7 }}>Atmospheric &amp; Hydrological Systems</div>
              <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: GLACIER }}>{a.anomaliesDetected} anomalies detected · {a.activeEvents.length} active atmospheric events</h2>
            </div>
            <div className="grid grid-cols-3 gap-x-6 text-right text-[9px] uppercase tracking-[0.24em]" style={{ color: GLACIER, opacity: 0.8 }}>
              <div>
                <div>Temp anomaly</div>
                <div className="mt-1 tabular-nums text-[16px] not-italic" style={{ color: a.meanTemperatureAnomalyC > 1.5 ? ALERT : a.meanTemperatureAnomalyC > 0.5 ? AMBER : GLACIER }}>
                  {a.meanTemperatureAnomalyC > 0 ? '+' : ''}{a.meanTemperatureAnomalyC}°C
                </div>
              </div>
              <div>
                <div>Precipitation</div>
                <div className="mt-1 tabular-nums text-[16px] not-italic" style={{ color: GLACIER }}>{a.precipitationAnomalyPct > 0 ? '+' : ''}{a.precipitationAnomalyPct}%</div>
              </div>
              <div>
                <div>Air quality</div>
                <div className="mt-1 tabular-nums text-[16px] not-italic" style={{ color: a.airQualityIndex > 100 ? ALERT : a.airQualityIndex > 60 ? AMBER : CANOPY }}>{a.airQualityIndex}</div>
              </div>
            </div>
          </div>
        </div>
        <WindArc />
      </header>

      {/* Atmospheric event feed */}
      <section className="px-8 py-5" style={{ background: PANEL }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GLACIER }}>☁ Active atmospheric event feed</h3>
          <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>monitoring online · {a.monitoringOnlinePct}%</span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          {a.activeEvents.map(ev => (
            <article key={ev.id} className="px-4 py-3" style={{ background: FOREST_DEEP, borderTop: `2px solid ${EVENT_COL[ev.severity]}` }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[18px] leading-none" style={{ color: EVENT_COL[ev.severity] }}>{KIND_GLYPH[ev.kind]}</span>
                <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: EVENT_COL[ev.severity] }}>{ev.severity}</span>
              </div>
              <div className="mt-2 text-[12px]" style={{ color: GLACIER }}>{ev.kind.replace(/-/g, ' ')}</div>
              <div className="text-[9.5px]" style={{ color: MUT }}>{ev.region} · {ev.startedHrsAgo}h ago</div>
              <div className="mt-2 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: AMBER }}>
                {ev.populationExposedK.toLocaleString()}K exposed
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Hydrological currents */}
      <section className="px-8 py-6" style={{ background: FOREST_DEEP, borderTop: '1px solid rgba(229,232,230,0.06)' }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GLACIER }}>≋ River basin currents</h3>
          <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>flow · contamination · status</span>
        </div>
        <div className="space-y-2">
          {b.rivers.map(r => (
            <div key={r.id} className="grid grid-cols-[200px_360px_1fr_100px] items-center gap-4 px-4 py-2" style={{ background: PANEL, border: '1px solid rgba(229,232,230,0.05)' }}>
              <div>
                <div className="text-[12px]" style={{ color: GLACIER }}>{r.basin}</div>
                <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>· {r.status}</div>
              </div>
              <RiverFlow r={r} />
              <div className="flex items-center gap-3 text-[10px]">
                <span style={{ color: MUT }}>flow</span>
                <span className="tabular-nums" style={{ color: RIVER_COL[r.status] }}>{r.flowIdx}%</span>
                <span style={{ color: MUT }}>·</span>
                <span style={{ color: MUT }}>contam</span>
                <span className="tabular-nums" style={{ color: r.contaminationIdx >= 50 ? ALERT : r.contaminationIdx >= 30 ? AMBER : MUT }}>{r.contaminationIdx}</span>
              </div>
              <span className="text-right text-[9px] uppercase tracking-[0.24em]" style={{ color: RIVER_COL[r.status] }}>● {r.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Oceanic horizon bars */}
      <section className="px-8 py-6" style={{ background: PANEL, borderTop: '1px solid rgba(229,232,230,0.06)' }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GLACIER }}>⌒ Oceanic readout</h3>
          <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>coastal · marine · floodplain</span>
        </div>
        <div className="grid grid-cols-1 gap-px md:grid-cols-5" style={{ background: 'rgba(229,232,230,0.06)' }}>
          {[
            { l: 'Coastal resilience', v: o.coastalResilienceIdx, c: o.coastalResilienceIdx >= 75 ? CANOPY : o.coastalResilienceIdx >= 55 ? ATMOS : ALERT, suffix: '' },
            { l: 'Marine ecosystem', v: o.marineEcosystemIdx, c: o.marineEcosystemIdx >= 70 ? CANOPY : ATMOS, suffix: '' },
            { l: 'Sea-level rise', v: o.seaLevelRiseMmYr, c: o.seaLevelRiseMmYr > 5 ? ALERT : o.seaLevelRiseMmYr > 3 ? AMBER : ATMOS, suffix: 'mm/yr' },
            { l: 'Bleaching events', v: o.bleachingEventsActive, c: o.bleachingEventsActive ? AMBER : CANOPY, suffix: '' },
            { l: 'Floodplain exposure', v: o.floodplainExposurePct, c: o.floodplainExposurePct >= 25 ? ALERT : o.floodplainExposurePct >= 15 ? AMBER : CANOPY, suffix: '%' },
          ].map(x => (
            <div key={x.l} className="px-5 py-4" style={{ background: PANEL }}>
              <div className="text-[8.5px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</span>
                <span className="text-[10px]" style={{ color: MUT }}>{x.suffix}</span>
              </div>
              <div className="mt-2 h-[2px]" style={{ background: 'rgba(48,64,80,0.7)' }}>
                <div className="h-full" style={{ width: `${Math.min(100, (typeof x.v === 'number' ? x.v : 0) * (x.suffix === '%' ? 3 : x.suffix === 'mm/yr' ? 10 : 1))}%`, background: x.c }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
