'use client';

// Energy domains — Reserve, Emergency Operations & Intelligence surfaces.

import * as React from 'react';
import { energyGridBoard } from '@/lib/gov/energy-grid';
import { energyExtendedBoard } from '@/lib/gov/energy-extended';
import { GridFrame, GridKpi, GridRule, LineDiagramRow, ENERGY_DS, GridCallout } from '@/apps/ministry-energy/design-system/energy-ds';
import { seed, wave } from '@/lib/telemetry';

export function StrategicReserve({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  void id;
  return (
    <GridFrame archetype="reserve" code="RS-STR-14" title="Strategic Reserve"
      subtitle="multi-fuel strategic reserve">
      <GridKpi items={[
        { label: 'Buckets', value: board.reserves.length },
        { label: 'Mean cover', value: `${Math.round(board.reserves.reduce((s, r) => s + r.daysCover, 0) / Math.max(1, board.reserves.length))} d`, tone: 'ok' },
        { label: 'Emergency-release eligible', value: board.reserves.filter(r => r.emergencyReleaseEligible).length, tone: 'info' },
        { label: 'High geopolitical exposure', value: board.reserves.filter(r => r.geopoliticalExposure > 65).length, tone: 'warn' },
      ]} />
      <GridRule label="reserve composition" />
      {board.reserves.map(r => (
        <LineDiagramRow key={r.bucket}
          label={r.bucket}
          pct={r.capacityFillPct}
          tone={r.daysCover >= 30 ? 'ok' : r.daysCover >= 14 ? 'warn' : 'alert'}
          tail={`${r.daysCover}d cover · ${r.survivabilityDays}d survival`} />
      ))}
    </GridFrame>
  );
}

export function FuelStockpile({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  void id;
  const fuel = board.reserves.filter(r => r.bucket === 'Diesel' || r.bucket === 'Natural Gas' || r.bucket === 'Coal');
  return (
    <GridFrame archetype="reserve" code="RS-FUE-15" title="Fuel Stockpile"
      subtitle="diesel, natural gas & coal">
      <GridKpi items={[
        { label: 'Fuel buckets', value: fuel.length },
        { label: 'Mean fill', value: `${Math.round(fuel.reduce((s, r) => s + r.capacityFillPct, 0) / Math.max(1, fuel.length))}%`, tone: 'ok' },
        { label: 'Mean exposure', value: `${Math.round(fuel.reduce((s, r) => s + r.geopoliticalExposure, 0) / Math.max(1, fuel.length))}/100`, tone: 'warn' },
        { label: 'Mean cover', value: `${Math.round(fuel.reduce((s, r) => s + r.daysCover, 0) / Math.max(1, fuel.length))} d` },
      ]} />
      <GridRule label="fuel buckets" />
      {fuel.map(r => (
        <LineDiagramRow key={r.bucket}
          label={r.bucket}
          pct={r.capacityFillPct}
          tone={r.geopoliticalExposure > 65 ? 'alert' : r.geopoliticalExposure > 35 ? 'warn' : 'ok'}
          tail={`exp ${r.geopoliticalExposure}`} />
      ))}
    </GridFrame>
  );
}

export function BatteryStack({ id, now }: { id: string; now: number }) {
  const board = energyGridBoard(now);
  const ts = now / 4000;
  void id;
  const battery = board.reserves.find(r => r.bucket === 'Battery Stack');
  const sites = ['Capital battery cluster', 'Northern utility-scale', 'Coastal grid battery', 'Highland micro-grid stack', 'Eastern distribution-side', 'Western firming reserve'];
  return (
    <GridFrame archetype="reserve" code="RS-BAT-16" title="Battery Stack"
      subtitle="national battery storage">
      <GridKpi items={[
        { label: 'Sites', value: sites.length },
        { label: 'Total capacity', value: `${(wave(`bs:c:${id}`, ts, 2.4, 18)).toFixed(1)} GWh`, tone: 'info' },
        { label: 'Current SoC', value: `${battery?.capacityFillPct ?? Math.round(wave(`bs:s:${id}`, ts, 38, 92))}%`, tone: 'ok' },
        { label: 'Charging cycles (24h)', value: Math.round(wave(`bs:cy:${id}`, ts, 12, 480)) },
      ]} />
      <GridRule label="battery sites" />
      {sites.map((s, i) => {
        const k = `bs:${id}:${i}`;
        const soc = Math.round(wave(`${k}:s`, ts, 32, 96));
        return (
          <LineDiagramRow key={s}
            label={s}
            pct={soc}
            tone={soc > 70 ? 'ok' : soc > 40 ? 'warn' : 'alert'}
            tail={`${(wave(`${k}:c`, ts, 0.2, 3.4)).toFixed(2)} GWh`} />
        );
      })}
    </GridFrame>
  );
}

export function BlackoutLedger({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="emergency" code="EM-BLK-18" title="Blackout Ledger"
      subtitle="live blackout incidents"
      posture={ext.emergency.posture === 'national-recovery' ? 'critical' : ext.emergency.posture === 'major-restoration' ? 'strained' : ext.emergency.posture === 'engaged' ? 'engaged' : 'stable'}>
      <GridKpi items={[
        { label: 'Active blackouts', value: ext.emergency.blackouts.length, tone: ext.emergency.blackouts.length > 0 ? 'warn' : 'ok' },
        { label: 'Population affected (k)', value: ext.emergency.blackouts.reduce((s, b) => s + b.populationAffectedK, 0).toFixed(0), tone: 'warn' },
        { label: 'Industrial facilities out', value: ext.emergency.blackouts.reduce((s, b) => s + b.industrialFacilitiesOut, 0) },
        { label: 'Mean restoration', value: `${ext.emergency.meanRestorationHrs} h`, tone: 'info' },
      ]} />
      <GridRule label="incident ledger" />
      {ext.emergency.blackouts.map(b => (
        <div key={b.id} className="grid grid-cols-[110px_140px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{b.id}</span>
          <span style={{ color: ENERGY_DS.ink }}>{b.cause}</span>
          <span style={{ color: ENERGY_DS.mut }}>{b.region}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>{b.populationAffectedK.toFixed(0)}k aff</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: b.phase === 'stabilised' ? ENERGY_DS.lime : b.phase === 'restoration' || b.phase === 'energisation' ? ENERGY_DS.amber : ENERGY_DS.coral }}>● {b.phase}</span>
        </div>
      ))}
    </GridFrame>
  );
}

export function RestorationCrews({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="emergency" code="EM-CRW-19" title="Restoration Crews"
      subtitle="crew deployment & status">
      <GridKpi items={[
        { label: 'Crews', value: ext.emergency.crews.length },
        { label: 'Members deployed', value: ext.emergency.crews.reduce((s, c) => s + c.membersDeployed, 0), tone: 'info' },
        { label: 'Vehicles active', value: ext.emergency.crews.reduce((s, c) => s + c.vehiclesActive, 0) },
        { label: 'Load restored', value: `${ext.emergency.loadRestoredNationalPct}%`, tone: 'ok' },
      ]} />
      <GridRule label="crews" />
      {ext.emergency.crews.map(c => (
        <div key={c.id} className="grid grid-cols-[110px_180px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{c.id}</span>
          <span style={{ color: ENERGY_DS.ink }}>{c.crewKind}</span>
          <span style={{ color: ENERGY_DS.mut }}>{c.region}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>{c.membersDeployed}/{c.membersDeployed + c.membersAvailable}</span>
          <span className="text-right" style={{ color: ENERGY_DS.electric }}>→ {c.enRouteTo}</span>
        </div>
      ))}
    </GridFrame>
  );
}

export function CriticalServicesBackup({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="emergency" code="EM-CRS-20" title="Critical Services Backup"
      subtitle="hospital / water / data-centre backup">
      <GridKpi items={[
        { label: 'Critical services', value: ext.emergency.criticalServicesOnBackup.length },
        { label: 'Fuel-critical', value: ext.emergency.criticalServicesOnBackup.filter(s => s.status === 'critical').length, tone: 'alert' },
        { label: 'Low fuel', value: ext.emergency.criticalServicesOnBackup.filter(s => s.status === 'low-fuel').length, tone: 'warn' },
        { label: 'Fuel-ok', value: ext.emergency.criticalServicesOnBackup.filter(s => s.status === 'fuel-ok').length, tone: 'ok' },
      ]} />
      <GridRule label="backup posture" />
      {ext.emergency.criticalServicesOnBackup.map(s => (
        <div key={s.service} className="grid grid-cols-[300px_1fr_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{s.service}</span>
          <span className="text-right tabular-nums" style={{ color: s.status === 'critical' ? ENERGY_DS.coral : s.status === 'low-fuel' ? ENERGY_DS.amber : ENERGY_DS.lime }}>{s.backupHrsRemaining}h fuel</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: s.status === 'critical' ? ENERGY_DS.coral : s.status === 'low-fuel' ? ENERGY_DS.amber : ENERGY_DS.lime }}>● {s.status}</span>
        </div>
      ))}
      <GridCallout kicker="constitutional protection" body="Critical services (hospitals, water, sovereign data) have first-priority restoration and protected fuel allocations. Blackout without protocol is constitutionally void." />
    </GridFrame>
  );
}

void seed;
