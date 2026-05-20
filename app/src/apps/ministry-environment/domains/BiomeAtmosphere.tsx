'use client';

// Environment domains — Biome, Atmosphere, Hydrosphere surfaces.

import * as React from 'react';
import { climateResilienceBoard } from '@/lib/gov/climate-resilience';
import { environmentalGovernanceBoard } from '@/lib/gov/environmental-governance';
import { BiomeFrame, BiomeKpi, BiomeRule, EcoregionRow, BiomeCallout, ENVIRONMENT_DS } from '@/apps/ministry-environment/design-system/environment-ds';
import { seed, wave } from '@/lib/telemetry';

export function EcoregionStress({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="biome" code="BM-ECO-02" title="Ecoregion Stress Board"
      subtitle="composite stress per ecoregion"
      posture={board.command.posture}>
      <BiomeKpi items={[
        { label: 'Ecoregions tracked', value: board.command.ecoregions.length },
        { label: 'Tipping classification', value: board.command.ecoregions.filter(e => e.classification === 'tipping').length, tone: 'alert' },
        { label: 'Critical classification', value: board.command.ecoregions.filter(e => e.classification === 'critical').length, tone: 'alert' },
        { label: 'Continuity index', value: `${board.command.ecologicalContinuityIdx}/100`, tone: 'ok' },
      ]} />
      <BiomeRule label="composite stress" />
      {board.command.ecoregions.map(e => (
        <EcoregionRow key={e.ecoregion} name={e.ecoregion} stress={e.compositeStress} classification={e.classification}
          tail={`thermal ${e.thermalStressIdx} · hydro ${e.hydroStressIdx}`} />
      ))}
    </BiomeFrame>
  );
}

export function BiomeCommand({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="biome" code="BM-CMD-03" title="Biome Command"
      subtitle="live continuity & survivability"
      posture={board.command.posture}>
      <BiomeKpi items={[
        { label: 'Climate-risk posture', value: `${board.command.climateRiskPostureIdx}/100`, tone: 'info' },
        { label: 'Adaptation readiness', value: `${board.command.adaptationReadinessIdx}/100`, tone: 'ok' },
        { label: 'Ecological continuity', value: `${board.command.ecologicalContinuityIdx}/100`, tone: 'ok' },
        { label: 'Civilizational survivability', value: `${board.command.civilizationalSurvivabilityIdx}/100`, tone: 'ok' },
      ]} />
      <BiomeRule label="ministry engagement" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {board.ministriesEngaged.map(m => (
          <div key={m.ministry} className="border px-2 py-1.5"
            style={{ borderColor: ENVIRONMENT_DS.rule, fontFamily: 'ui-monospace, monospace' }}>
            <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.mut }}>{m.ministry}</div>
            <div className="text-[12px] tabular-nums" style={{ color: ENVIRONMENT_DS.leaf }}>{m.engaged} engagements</div>
          </div>
        ))}
      </div>
      <BiomeCallout kicker="federation cascade" body="Every incident in §25.6 propagates through Interior, Health, Transport, Agriculture and Cabinet. The cascade ledger is sealed to the Audit Vault." />
    </BiomeFrame>
  );
}

export function ProtectedRegions({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="ecosystem" code="EC-PRR-05" title="Protected Regions"
      subtitle="integrity & ranger coverage">
      <BiomeKpi items={[
        { label: 'Protected regions', value: board.biosphere.protectedRegions.length },
        { label: 'Degrading', value: board.biosphere.protectedRegions.filter(p => p.status === 'degrading').length, tone: 'alert' },
        { label: 'Mean integrity', value: `${Math.round(board.biosphere.protectedRegions.reduce((s, p) => s + p.integrityPct, 0) / Math.max(1, board.biosphere.protectedRegions.length))}%`, tone: 'ok' },
        { label: 'Forest cover', value: `${board.biosphere.forestCoverPct}%`, tone: 'ok' },
      ]} />
      <BiomeRule label="region register" />
      {board.biosphere.protectedRegions.map(r => (
        <div key={r.id} className="grid grid-cols-[180px_1fr_100px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{r.region}</span>
          <div className="h-1.5 self-center" style={{ background: ENVIRONMENT_DS.moss }}>
            <div className="h-full" style={{ width: `${r.integrityPct}%`, background: r.integrityPct > 80 ? ENVIRONMENT_DS.leaf : r.integrityPct > 60 ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.coral }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{r.hectaresK}k ha</span>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{r.speciesUnderProtection} sp</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.status === 'degrading' ? ENVIRONMENT_DS.coral : r.status === 'pressured' ? ENVIRONMENT_DS.amber : r.status === 'monitored' ? ENVIRONMENT_DS.sky : ENVIRONMENT_DS.leaf }}>● {r.status}</span>
        </div>
      ))}
    </BiomeFrame>
  );
}

export function SpeciesConservation({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const board = climateResilienceBoard(now);
  void id;
  const families = ['Mammalia (large)', 'Aves (migratory)', 'Reptilia & Amphibia', 'Marine vertebrates', 'Pollinator insects', 'Endemic flora'];
  return (
    <BiomeFrame archetype="ecosystem" code="EC-SPC-06" title="Species Conservation"
      subtitle="endangered species register">
      <BiomeKpi items={[
        { label: 'Endangered species', value: board.biosphere.endangeredSpecies, tone: 'alert' },
        { label: 'Biodiversity index', value: `${board.biosphere.biodiversityIdx}/100`, tone: 'ok' },
        { label: 'Reforestation rate', value: `${board.biosphere.reforestationRatePctYr}%/y`, tone: 'ok' },
        { label: 'Habitat loss / yr', value: `${board.biosphere.habitatLossYrPct}%`, tone: 'warn' },
      ]} />
      <BiomeRule label="family conservation lanes" />
      {families.map((f, i) => {
        const k = `sp:${id}:${i}`;
        const idx = Math.round(wave(`${k}:i`, ts, 38, 84));
        return (
          <div key={f} className="grid grid-cols-[200px_1fr_80px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: ENVIRONMENT_DS.leaf }}>{f}</span>
            <div className="h-1.5 self-center" style={{ background: ENVIRONMENT_DS.moss }}>
              <div className="h-full" style={{ width: `${idx}%`, background: idx > 65 ? ENVIRONMENT_DS.leaf : idx > 45 ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.coral }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{idx}</span>
          </div>
        );
      })}
    </BiomeFrame>
  );
}

export function AirQualityBoard({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="atmosphere" code="AT-AIR-08" title="Air Quality Board"
      subtitle="AQI, anomalies & monitoring">
      <BiomeKpi items={[
        { label: 'Air quality index', value: board.atmosphere.airQualityIndex, tone: board.atmosphere.airQualityIndex > 120 ? 'alert' : board.atmosphere.airQualityIndex > 80 ? 'warn' : 'ok' },
        { label: 'Temperature anomaly', value: `${board.atmosphere.meanTemperatureAnomalyC > 0 ? '+' : ''}${board.atmosphere.meanTemperatureAnomalyC.toFixed(1)}°C`, tone: 'warn' },
        { label: 'Precipitation anomaly', value: `${board.atmosphere.precipitationAnomalyPct > 0 ? '+' : ''}${board.atmosphere.precipitationAnomalyPct}%`, tone: 'info' },
        { label: 'Monitoring online', value: `${board.atmosphere.monitoringOnlinePct}%`, tone: 'ok' },
      ]} />
      <BiomeRule label="anomalies" />
      <div className="grid grid-cols-2 gap-2 text-[11px]" style={{ fontFamily: 'ui-monospace, monospace' }}>
        <div className="border px-2 py-1.5" style={{ borderColor: ENVIRONMENT_DS.rule }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.mut }}>active anomalies</div>
          <div className="text-[14px] tabular-nums" style={{ color: ENVIRONMENT_DS.amber }}>{board.atmosphere.anomaliesDetected}</div>
        </div>
        <div className="border px-2 py-1.5" style={{ borderColor: ENVIRONMENT_DS.rule }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.mut }}>active events</div>
          <div className="text-[14px] tabular-nums" style={{ color: ENVIRONMENT_DS.leaf }}>{board.atmosphere.activeEvents.length}</div>
        </div>
      </div>
    </BiomeFrame>
  );
}

export function WeatherEventFeed({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="atmosphere" code="AT-WEA-09" title="Weather Event Feed"
      subtitle="live weather-event posture">
      <BiomeKpi items={[
        { label: 'Active events', value: board.atmosphere.activeEvents.length },
        { label: 'Emergency severity', value: board.atmosphere.activeEvents.filter(e => e.severity === 'emergency').length, tone: 'alert' },
        { label: 'Warning severity', value: board.atmosphere.activeEvents.filter(e => e.severity === 'warning').length, tone: 'warn' },
        { label: 'Population exposed (k)', value: board.atmosphere.activeEvents.reduce((s, e) => s + e.populationExposedK, 0).toFixed(0), tone: 'info' },
      ]} />
      <BiomeRule label="event ledger" />
      {board.atmosphere.activeEvents.map(e => (
        <div key={e.id} className="grid grid-cols-[110px_180px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{e.id}</span>
          <span style={{ color: ENVIRONMENT_DS.ink }}>{e.kind}</span>
          <span style={{ color: ENVIRONMENT_DS.mut }}>{e.region}</span>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{e.startedHrsAgo}h ago</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: e.severity === 'emergency' ? ENVIRONMENT_DS.coral : e.severity === 'warning' ? ENVIRONMENT_DS.amber : e.severity === 'watch' ? ENVIRONMENT_DS.sky : ENVIRONMENT_DS.leaf }}>● {e.severity}</span>
        </div>
      ))}
    </BiomeFrame>
  );
}

export function RiverBasins({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="hydrosphere" code="HY-RIV-10" title="River Basins"
      subtitle="basin flow & contamination">
      <BiomeKpi items={[
        { label: 'Basins tracked', value: board.rivers.length },
        { label: 'Healthy', value: board.rivers.filter(r => r.status === 'healthy').length, tone: 'ok' },
        { label: 'Contaminated', value: board.rivers.filter(r => r.status === 'contaminated').length, tone: 'alert' },
        { label: 'Stressed', value: board.rivers.filter(r => r.status === 'stressed').length, tone: 'warn' },
      ]} />
      <BiomeRule label="basin posture" />
      {board.rivers.map(r => (
        <div key={r.id} className="grid grid-cols-[200px_1fr_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{r.basin}</span>
          <div className="h-1.5 self-center" style={{ background: ENVIRONMENT_DS.moss }}>
            <div className="h-full" style={{ width: `${r.flowIdx}%`, background: r.flowIdx > 70 ? ENVIRONMENT_DS.leaf : r.flowIdx > 40 ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.coral }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>flow {r.flowIdx}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.status === 'contaminated' ? ENVIRONMENT_DS.coral : r.status === 'stressed' ? ENVIRONMENT_DS.amber : r.status === 'thinning' ? ENVIRONMENT_DS.sky : ENVIRONMENT_DS.leaf }}>● {r.status}</span>
        </div>
      ))}
    </BiomeFrame>
  );
}

export function OceanicReadout({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="hydrosphere" code="HY-OCN-11" title="Oceanic Readout"
      subtitle="coastal resilience & marine ecosystem">
      <BiomeKpi items={[
        { label: 'Coastal resilience', value: `${board.ocean.coastalResilienceIdx}/100`, tone: 'ok' },
        { label: 'Sea-level rise', value: `${board.ocean.seaLevelRiseMmYr.toFixed(1)} mm/y`, tone: 'warn' },
        { label: 'Marine ecosystem', value: `${board.ocean.marineEcosystemIdx}/100`, tone: 'info' },
        { label: 'Bleaching events', value: board.ocean.bleachingEventsActive, tone: 'alert' },
      ]} />
      <BiomeRule label="coastal exposure" />
      <div className="text-[11px]" style={{ color: ENVIRONMENT_DS.mut, fontFamily: 'ui-monospace, monospace' }}>
        Floodplain exposure: <span style={{ color: ENVIRONMENT_DS.amber }}>{board.ocean.floodplainExposurePct}%</span>
      </div>
    </BiomeFrame>
  );
}

export function WaterAllocation({ id, now }: { id: string; now: number }) {
  const board = environmentalGovernanceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="hydrosphere" code="HY-ALL-12" title="Water Allocation"
      subtitle="allocation budget & ecological reserve">
      <BiomeKpi items={[
        { label: 'Basins under budget', value: board.resources.waterAllocations.length },
        { label: 'Within budget', value: board.resources.waterAllocations.filter(w => w.status === 'within-budget').length, tone: 'ok' },
        { label: 'Critical depletion', value: board.resources.waterAllocations.filter(w => w.status === 'critical-depletion').length, tone: 'alert' },
        { label: 'Stewardship index', value: `${board.resources.intergenerationalStewardshipIdx}/100`, tone: 'info' },
      ]} />
      <BiomeRule label="allocation register" />
      {board.resources.waterAllocations.map(w => (
        <div key={w.basin} className="grid grid-cols-[200px_1fr_80px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{w.basin}</span>
          <div className="h-1.5 self-center" style={{ background: ENVIRONMENT_DS.moss }}>
            <div className="h-full" style={{ width: `${Math.min(100, w.withdrawalPct)}%`, background: w.withdrawalPct > 95 ? ENVIRONMENT_DS.coral : w.withdrawalPct > 80 ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.leaf }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{w.withdrawalPct}%</span>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>res {w.ecologicalReservePct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: w.status === 'critical-depletion' ? ENVIRONMENT_DS.coral : w.status === 'over-allocation' ? ENVIRONMENT_DS.coral : w.status === 'observant' ? ENVIRONMENT_DS.sky : ENVIRONMENT_DS.leaf }}>● {w.status}</span>
        </div>
      ))}
      <BiomeCallout kicker="ecological reserve doctrine" body="A minimum ecological reserve is non-negotiable. Allocations cannot exceed budget without an EIA and Council vote — concealment of pollution data is constitutionally void." />
    </BiomeFrame>
  );
}

void seed;
