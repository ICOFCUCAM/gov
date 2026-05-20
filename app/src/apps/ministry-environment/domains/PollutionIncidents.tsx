'use client';

// Environment domains — Pollution, Compliance & Climate Incident surfaces.

import * as React from 'react';
import { climateResilienceBoard } from '@/lib/gov/climate-resilience';
import { BiomeFrame, BiomeKpi, BiomeRule, BiomeIncidentRow, BiomeCallout, ENVIRONMENT_DS } from '@/apps/ministry-environment/design-system/environment-ds';
import { seed, wave } from '@/lib/telemetry';

export function PollutionRegister({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="pollution" code="PL-REG-13" title="Pollution Register"
      subtitle="air / water / hazmat violations">
      <BiomeKpi items={[
        { label: 'Air violations', value: board.pollution.airViolationsActive, tone: 'warn' },
        { label: 'Water violations', value: board.pollution.waterViolationsActive, tone: 'warn' },
        { label: 'Hazmat incidents', value: board.pollution.hazardousMaterialIncidents, tone: 'alert' },
        { label: 'Compliance index', value: `${board.pollution.complianceIdx}/100`, tone: 'ok' },
      ]} />
      <BiomeRule label="enforcement summary" />
      <div className="grid grid-cols-2 gap-2 text-[11px]" style={{ fontFamily: 'ui-monospace, monospace' }}>
        <div className="border px-2 py-1.5" style={{ borderColor: ENVIRONMENT_DS.rule }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.mut }}>enforcement actions</div>
          <div className="text-[14px] tabular-nums" style={{ color: ENVIRONMENT_DS.leaf }}>{board.pollution.enforcementActions}</div>
        </div>
        <div className="border px-2 py-1.5" style={{ borderColor: ENVIRONMENT_DS.rule }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.mut }}>emissions vs target</div>
          <div className="text-[14px] tabular-nums" style={{ color: board.pollution.emissionsVsTargetPct > 110 ? ENVIRONMENT_DS.coral : board.pollution.emissionsVsTargetPct > 100 ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.leaf }}>{board.pollution.emissionsVsTargetPct}%</div>
        </div>
      </div>
    </BiomeFrame>
  );
}

export function EmissionsTarget({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="pollution" code="PL-EMI-14" title="Emissions vs Target"
      subtitle="sector emissions vs national target">
      <BiomeKpi items={[
        { label: 'Sectors tracked', value: board.pollution.topEmitters.length },
        { label: 'On target', value: board.pollution.topEmitters.filter(e => e.tone === 'ok').length, tone: 'ok' },
        { label: 'Above target', value: board.pollution.topEmitters.filter(e => e.tone === 'alert').length, tone: 'alert' },
        { label: 'Composite vs target', value: `${board.pollution.emissionsVsTargetPct}%`, tone: board.pollution.emissionsVsTargetPct > 110 ? 'alert' : 'warn' },
      ]} />
      <BiomeRule label="top emitter ledger" />
      {board.pollution.topEmitters.map(e => (
        <div key={e.sector} className="grid grid-cols-[200px_1fr_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{e.sector}</span>
          <div className="h-1.5 self-center" style={{ background: ENVIRONMENT_DS.moss }}>
            <div className="h-full" style={{ width: `${Math.min(100, e.sharePct)}%`, background: e.tone === 'alert' ? ENVIRONMENT_DS.coral : e.tone === 'warn' ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.leaf }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{e.sharePct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: e.tone === 'alert' ? ENVIRONMENT_DS.coral : e.tone === 'warn' ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.leaf }}>● {e.tone}</span>
        </div>
      ))}
    </BiomeFrame>
  );
}

export function ComplianceBench({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const operators = ['Coastal Aggregates', 'Northern Spring Mining', 'Eastern Forestry SOE', 'Capital Petrochemical', 'Highland Hydro', 'Southern Waste Authority'];
  return (
    <BiomeFrame archetype="pollution" code="PL-CMP-15" title="Compliance Bench"
      subtitle="top-emitter compliance index">
      <BiomeKpi items={[
        { label: 'Operators tracked', value: operators.length },
        { label: 'Mean compliance', value: `${Math.round(wave(`cb:m:${id}`, ts, 64, 92))}%`, tone: 'ok' },
        { label: 'Enforcement open', value: Math.round(wave(`cb:e:${id}`, ts, 4, 38)), tone: 'warn' },
        { label: 'Fines (Bn)', value: (wave(`cb:f:${id}`, ts, 0.2, 4.8)).toFixed(2) },
      ]} />
      <BiomeRule label="operator compliance" />
      {operators.map((o, i) => {
        const k = `cb:${id}:${i}`;
        const idx = Math.round(wave(`${k}:c`, ts, 38, 98));
        return (
          <div key={o} className="grid grid-cols-[220px_1fr_80px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: ENVIRONMENT_DS.leaf }}>{o}</span>
            <div className="h-1.5 self-center" style={{ background: ENVIRONMENT_DS.moss }}>
              <div className="h-full" style={{ width: `${idx}%`, background: idx > 80 ? ENVIRONMENT_DS.leaf : idx > 60 ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.coral }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{idx}%</span>
          </div>
        );
      })}
    </BiomeFrame>
  );
}

export function ClimateIncidentLedger({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="incident" code="IN-LED-16" title="Climate Incident Ledger"
      subtitle="live climate incident catalogue">
      <BiomeKpi items={[
        { label: 'Logged incidents', value: board.incidents.length },
        { label: 'National severity', value: board.incidents.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Critical severity', value: board.incidents.filter(i => i.severity === 'critical').length, tone: 'alert' },
        { label: 'Hectares affected (k)', value: board.incidents.reduce((s, i) => s + i.hectaresAffectedK, 0).toFixed(0), tone: 'warn' },
      ]} />
      <BiomeRule label="incident roster" />
      {board.incidents.map(i => (
        <BiomeIncidentRow key={i.id} id={i.id} kind={i.kind} region={i.region}
          severity={i.severity} pathway={i.recoveryPathway}
          tail={`${i.populationExposedK}k exposed`} />
      ))}
      <BiomeCallout kicker="federated cascade" body="Every climate incident propagates through Interior, Health, Transport, Agriculture and Cabinet (§25.6). The cascade ledger is sealed to the Audit Vault." />
    </BiomeFrame>
  );
}

function incidentSurface(kinds: string[], code: string, title: string, subtitle: string) {
  return function IncidentSurface({ id, now }: { id: string; now: number }) {
    const board = climateResilienceBoard(now);
    void id;
    const filtered = board.incidents.filter(i => kinds.includes(i.kind));
    return (
      <BiomeFrame archetype="incident" code={code} title={title} subtitle={subtitle}>
        <BiomeKpi items={[
          { label: 'Active', value: filtered.length, tone: filtered.length > 0 ? 'warn' : 'ok' },
          { label: 'National severity', value: filtered.filter(i => i.severity === 'national').length, tone: 'alert' },
          { label: 'Population exposed (k)', value: filtered.reduce((s, i) => s + i.populationExposedK, 0).toFixed(0) },
          { label: 'Hectares affected (k)', value: filtered.reduce((s, i) => s + i.hectaresAffectedK, 0).toFixed(0) },
        ]} />
        <BiomeRule label="active operations" />
        {filtered.length === 0 ? (
          <p className="text-[10.5px] italic" style={{ color: ENVIRONMENT_DS.mut }}>
            No active incidents of this class. National posture: monitoring.
          </p>
        ) : filtered.map(i => (
          <BiomeIncidentRow key={i.id} id={i.id} kind={i.kind} region={i.region}
            severity={i.severity} pathway={i.recoveryPathway}
            tail={`${i.ageHours}h · ${i.populationExposedK}k`} />
        ))}
      </BiomeFrame>
    );
  };
}

export const WildfireResponse = incidentSurface(['wildfire'], 'IN-WFR-17', 'Wildfire Response', 'wildfire posture & containment');
export const FloodResponse    = incidentSurface(['flood', 'coastal-surge'], 'IN-FLD-18', 'Flood Response', 'flood posture & evacuation');
export const DroughtResponse  = incidentSurface(['drought', 'heatwave-emergency'], 'IN-DRG-19', 'Drought Response', 'drought severity & relief');

void seed;
