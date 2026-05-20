'use client';

// Energy domains — Command, Generation, Transmission surfaces.

import * as React from 'react';
import { energyGridBoard } from '@/lib/gov/energy-grid';
import { GridFrame, GridKpi, GridRule, LineDiagramRow, ENERGY_DS, GridCallout } from '@/apps/ministry-energy/design-system/energy-ds';
import { seed, wave } from '@/lib/telemetry';

export function PostureBoard({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  void id;
  return (
    <GridFrame archetype="command" code="CM-PST-02" title="Grid Posture Board"
      subtitle="per-region demand vs supply"
      posture={board.command.posture}>
      <GridKpi items={[
        { label: 'Total demand', value: `${board.command.totalDemandGw.toFixed(1)} GW`, tone: 'info' },
        { label: 'Total supply', value: `${board.command.totalSupplyGw.toFixed(1)} GW`, tone: 'ok' },
        { label: 'Reserve margin', value: `${board.command.reserveMarginPct}%`, tone: board.command.reserveMarginPct >= 12 ? 'ok' : board.command.reserveMarginPct >= 6 ? 'warn' : 'alert' },
        { label: 'Stress zones', value: board.command.regions.filter(r => r.stressZone).length, tone: 'warn' },
      ]} />
      <GridRule label="regional load" />
      {board.command.regions.map(r => (
        <LineDiagramRow key={r.region}
          label={r.region}
          pct={Math.round((r.supplyGw / Math.max(0.1, r.demandGw)) * 100)}
          tone={r.loadShedRisk === 'imminent' ? 'alert' : r.loadShedRisk === 'monitor' ? 'warn' : 'ok'}
          tail={`d ${r.demandGw.toFixed(1)} / s ${r.supplyGw.toFixed(1)} GW`} />
      ))}
    </GridFrame>
  );
}

export function FrequencyBoard({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  const freqDev = Math.abs(board.command.frequencyHz - 50);
  void id;
  return (
    <GridFrame archetype="command" code="CM-FRQ-03" title="Frequency Stability"
      subtitle="frequency, reserve margin & blackout prevention"
      posture={board.command.posture}>
      <GridKpi items={[
        { label: 'Frequency', value: `${board.command.frequencyHz.toFixed(2)} Hz`, tone: freqDev <= 0.2 ? 'ok' : freqDev <= 0.4 ? 'warn' : 'alert' },
        { label: 'Deviation', value: `${freqDev.toFixed(2)} Hz`, tone: freqDev <= 0.2 ? 'ok' : 'warn' },
        { label: 'Reserve margin', value: `${board.command.reserveMarginPct}%`, tone: board.command.reserveMarginPct >= 12 ? 'ok' : 'warn' },
        { label: 'Blackout prevention', value: `${board.command.blackoutPreventionPct}%`, tone: 'info' },
      ]} />
      <GridCallout kicker="frequency doctrine" body="±0.2 Hz is operational; ±0.5 Hz triggers automatic load shedding under the equitable doctrine; ±1 Hz triggers an Emergency Response cascade." />
    </GridFrame>
  );
}

export function RenewableFleet({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  void id;
  const renewables = board.generation.filter(g => g.source === 'Solar' || g.source === 'Wind');
  return (
    <GridFrame archetype="generation" code="GN-RNW-05" title="Renewable Fleet"
      subtitle="solar, wind & small-hydro output">
      <GridKpi items={[
        { label: 'Renewable units', value: renewables.length },
        { label: 'Capacity', value: `${renewables.reduce((s, g) => s + g.capacityGw, 0).toFixed(1)} GW`, tone: 'info' },
        { label: 'Current output', value: `${renewables.reduce((s, g) => s + g.outputGw, 0).toFixed(1)} GW`, tone: 'ok' },
        { label: 'Mean utilisation', value: `${Math.round(renewables.reduce((s, g) => s + g.outputPct, 0) / Math.max(1, renewables.length))}%`, tone: 'ok' },
      ]} />
      <GridRule label="renewable units" />
      {renewables.map(g => (
        <LineDiagramRow key={g.source}
          label={g.source}
          pct={g.outputPct}
          tone={g.tone === 'alert' ? 'alert' : g.tone === 'warn' ? 'warn' : 'ok'}
          tail={`${g.outputGw.toFixed(1)} GW · forecast ${g.forecastGw.toFixed(1)} GW`} />
      ))}
    </GridFrame>
  );
}

export function BaseloadFleet({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  void id;
  const baseload = board.generation.filter(g => g.source === 'Hydro' || g.source === 'Gas' || g.source === 'Nuclear');
  return (
    <GridFrame archetype="generation" code="GN-BLD-06" title="Baseload Fleet"
      subtitle="hydro, gas & nuclear output">
      <GridKpi items={[
        { label: 'Baseload units', value: baseload.length },
        { label: 'Capacity', value: `${baseload.reduce((s, g) => s + g.capacityGw, 0).toFixed(1)} GW`, tone: 'info' },
        { label: 'Current output', value: `${baseload.reduce((s, g) => s + g.outputGw, 0).toFixed(1)} GW`, tone: 'ok' },
        { label: 'Maintenance live', value: baseload.filter(g => g.maintenance === 'live' || g.maintenance === 'unscheduled').length, tone: 'warn' },
      ]} />
      <GridRule label="baseload units" />
      {baseload.map(g => (
        <LineDiagramRow key={g.source}
          label={`${g.source} · ${g.maintenance}`}
          pct={g.outputPct}
          tone={g.tone === 'alert' ? 'alert' : g.tone === 'warn' ? 'warn' : 'ok'}
          tail={`${g.outputGw.toFixed(1)} / ${g.capacityGw.toFixed(1)} GW`} />
      ))}
    </GridFrame>
  );
}

export function GenerationMix({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  void id;
  const total = board.generation.reduce((s, g) => s + g.outputGw, 0);
  return (
    <GridFrame archetype="generation" code="GN-MIX-07" title="Generation Mix"
      subtitle="national output composition">
      <GridKpi items={[
        { label: 'Total output', value: `${total.toFixed(1)} GW`, tone: 'ok' },
        { label: 'Sources', value: board.generation.length },
        { label: 'Renewable share', value: `${Math.round((board.generation.filter(g => g.source === 'Solar' || g.source === 'Wind' || g.source === 'Hydro').reduce((s, g) => s + g.outputGw, 0) / Math.max(0.1, total)) * 100)}%`, tone: 'info' },
        { label: 'Carbon-emitting share', value: `${Math.round((board.generation.filter(g => g.source === 'Gas').reduce((s, g) => s + g.outputGw, 0) / Math.max(0.1, total)) * 100)}%`, tone: 'warn' },
      ]} />
      <GridRule label="mix" />
      {board.generation.map(g => (
        <LineDiagramRow key={g.source}
          label={g.source}
          pct={Math.round((g.outputGw / Math.max(0.1, total)) * 100)}
          tone={g.tone === 'alert' ? 'alert' : g.tone === 'warn' ? 'warn' : 'ok'}
          tail={`${g.outputGw.toFixed(1)} GW`} />
      ))}
    </GridFrame>
  );
}

export function CorridorBoard({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  void id;
  return (
    <GridFrame archetype="transmission" code="TR-COR-09" title="Corridor Board"
      subtitle="per-corridor utilisation & faults">
      <GridKpi items={[
        { label: 'Corridors', value: board.corridors.length },
        { label: 'Overloaded (>90%)', value: board.corridors.filter(c => c.utilPct > 90).length, tone: 'alert' },
        { label: 'Active faults', value: board.corridors.reduce((s, c) => s + c.faults, 0), tone: 'warn' },
        { label: 'Repair dispatched', value: board.corridors.filter(c => c.repairDispatched).length, tone: 'info' },
      ]} />
      <GridRule label="corridors" />
      {board.corridors.map(c => (
        <div key={c.id} className="grid grid-cols-[140px_1fr_80px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{c.id}</span>
          <span style={{ color: ENERGY_DS.ink }}>{c.from} → {c.to}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>{c.utilPct}%</span>
          <span className="text-right tabular-nums" style={{ color: c.transformerHealth > 80 ? ENERGY_DS.lime : c.transformerHealth > 60 ? ENERGY_DS.amber : ENERGY_DS.coral }}>{c.transformerHealth}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.tone === 'alert' ? ENERGY_DS.coral : c.tone === 'warn' ? ENERGY_DS.amber : ENERGY_DS.lime }}>● {c.tone}</span>
        </div>
      ))}
    </GridFrame>
  );
}

export function TransformerHealth({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <GridFrame archetype="transmission" code="TR-TFM-10" title="Transformer Health"
      subtitle="substation transformer fleet">
      <GridKpi items={[
        { label: 'Substations', value: board.corridors.length * 2 },
        { label: 'Mean health', value: `${Math.round(board.corridors.reduce((s, c) => s + c.transformerHealth, 0) / Math.max(1, board.corridors.length))}/100`, tone: 'ok' },
        { label: 'Pending maintenance', value: Math.round(wave(`tf:m:${id}`, ts, 4, 48)), tone: 'warn' },
        { label: 'Mean age (yr)', value: Math.round(wave(`tf:a:${id}`, ts, 14, 38)), tone: 'mute' },
      ]} />
      <GridRule label="health by corridor" />
      {board.corridors.map(c => (
        <LineDiagramRow key={c.id}
          label={`${c.id} · ${c.from}-${c.to}`}
          pct={c.transformerHealth}
          tone={c.transformerHealth > 80 ? 'ok' : c.transformerHealth > 60 ? 'warn' : 'alert'}
          tail={`${c.faults} faults`} />
      ))}
      <GridCallout kicker="condition-based maintenance" body="Transformers below 60% health enter mandatory inspection. Concealment of grid incidents is constitutionally prohibited." />
    </GridFrame>
  );
}

export function IndustrialAllocation({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  void id;
  return (
    <GridFrame archetype="demand" code="DM-IND-11" title="Industrial Allocation"
      subtitle="industrial continuity & protected allocation">
      <GridKpi items={[
        { label: 'Sectors', value: board.industry.length },
        { label: 'Emergency allocation', value: board.industry.filter(s => s.emergencyAllocation).length, tone: 'warn' },
        { label: 'Mean continuity', value: `${Math.round(board.industry.reduce((s, x) => s + x.continuityPct, 0) / Math.max(1, board.industry.length))}%`, tone: 'ok' },
        { label: 'Total consumption', value: `${board.industry.reduce((s, x) => s + x.consumptionGw, 0).toFixed(1)} GW`, tone: 'info' },
      ]} />
      <GridRule label="sector allocation" />
      {board.industry.map(s => (
        <LineDiagramRow key={s.sector}
          label={s.sector}
          pct={s.continuityPct}
          tone={s.continuityPct > 88 ? 'ok' : s.continuityPct > 70 ? 'warn' : 'alert'}
          tail={`${s.consumptionGw.toFixed(1)} / ${s.protectedAllocationGw.toFixed(1)} GW`} />
      ))}
    </GridFrame>
  );
}

export function LoadShedDoctrine({ id, now }: { id: string; now: number }) {
  void id; void now;
  const tiers = [
    { tier: 'Tier 0 — never shed', services: 'Hospitals, water treatment, sovereign data, ATC' },
    { tier: 'Tier 1 — protected',   services: 'Schools, telecom, transport signalling, banks' },
    { tier: 'Tier 2 — managed',     services: 'Industrial baseload, cold-chain' },
    { tier: 'Tier 3 — flexible',    services: 'Commercial buildings, public lighting' },
    { tier: 'Tier 4 — first to shed', services: 'Discretionary residential & industrial' },
  ];
  return (
    <GridFrame archetype="demand" code="DM-LSH-12" title="Load-Shed Doctrine"
      subtitle="equitable load-shedding tiers">
      <GridKpi items={[
        { label: 'Tiers defined', value: tiers.length },
        { label: 'Tier 0 always-on', value: '✓', tone: 'ok' },
        { label: 'Doctrine reviewable', value: '✓', tone: 'ok' },
        { label: 'Discriminatory shedding', value: '✗', tone: 'ok' },
      ]} />
      <GridRule label="protection tiers" />
      {tiers.map(t => (
        <div key={t.tier} className="grid grid-cols-[220px_1fr] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{t.tier}</span>
          <span style={{ color: ENERGY_DS.ink }}>{t.services}</span>
        </div>
      ))}
      <GridCallout kicker="constitutional doctrine" body="Load-shedding is equitable, transparent and reviewable. Discriminatory disconnection is constitutionally prohibited; affected citizens have a 24h notification and appeal pathway." />
    </GridFrame>
  );
}

export function PeakDemandForecast({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <GridFrame archetype="demand" code="DM-PKF-13" title="Peak Demand Forecast"
      subtitle="short-horizon forecast (next 48h)">
      <GridKpi items={[
        { label: 'Horizons', value: board.forecast.horizonHrs.length },
        { label: 'Max demand', value: `${Math.max(...board.forecast.demandGw).toFixed(1)} GW`, tone: 'warn' },
        { label: 'Cascading risk', value: `${board.forecast.cascadingFailureRisk}/100`, tone: board.forecast.cascadingFailureRisk > 60 ? 'alert' : 'warn' },
        { label: 'Blackout ETA', value: board.forecast.blackoutEtaHrs === null ? 'none' : `${board.forecast.blackoutEtaHrs}h`, tone: board.forecast.blackoutEtaHrs === null ? 'ok' : 'alert' },
      ]} />
      <GridRule label="horizon trajectories" />
      <div className="grid grid-cols-1 gap-1" style={{ fontFamily: 'ui-monospace, monospace' }}>
        {board.forecast.horizonHrs.map((h, i) => {
          const d = board.forecast.demandGw[i] ?? 0;
          const s = board.forecast.supplyGw[i] ?? 0;
          const w = board.forecast.weatherStress[i] ?? 0;
          return (
            <div key={h} className="grid grid-cols-[60px_1fr_80px_80px_80px] gap-3 border-b py-1 text-[11px]"
              style={{ borderColor: ENERGY_DS.ruleSoft }}>
              <span style={{ color: ENERGY_DS.amber }}>{h}h</span>
              <div className="h-1.5 self-center" style={{ background: ENERGY_DS.carbonDeep }}>
                <div className="h-full" style={{ width: `${Math.min(100, (d / Math.max(0.1, s)) * 50)}%`, background: d > s ? ENERGY_DS.coral : ENERGY_DS.lime }} />
              </div>
              <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>{d.toFixed(1)} GW</span>
              <span className="text-right tabular-nums" style={{ color: ENERGY_DS.electric }}>{s.toFixed(1)} GW</span>
              <span className="text-right tabular-nums" style={{ color: w > 60 ? ENERGY_DS.coral : ENERGY_DS.mut }}>w {w}</span>
            </div>
          );
        })}
      </div>
      {void ts}
    </GridFrame>
  );
}

void seed;
