// lib/gov/institutional-economy.ts
//
// The Ministry of Interior institutional economy & national-strain core.
// Institutions are finite: every agency operates under capacity, staffing,
// infrastructure and queue limits. Pressure propagates across the national
// mesh, fatigue accumulates, corruption opportunity emerges from overload,
// and the runtime drops into resilience modes that change governance
// behaviour. Pure & deterministic; built over the observability +
// procedural ledgers so it stays one connected sovereign runtime.

import { seed, wave } from '@/lib/telemetry';
import { observabilityLedger, AGENCIES, AGENCY_LABEL, type Agency } from '@/lib/gov/sovereign-observability';
import { proceduralBoard } from '@/lib/gov/procedural-execution';

export const ECON_REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export type OverloadState = 'nominal' | 'strained' | 'overloaded' | 'saturated';
export type CorruptionMode = 'clean' | 'lawful-overload' | 'suspicious-obstruction';

export interface AgencyEconomy {
  agency: Agency;
  label: string;
  capacity: number;
  load: number;
  baseUtilPct: number;
  utilPct: number;          // after inbound pressure propagation
  overload: OverloadState;
  efficiencyPct: number;
  fatiguePct: number;
  staffing: { established: number; present: number; absentPct: number; overtimePct: number; shortagePct: number };
  infra: { facilityHealthPct: number; commLatencyMs: number; outageRiskPct: number; syncStabilityPct: number };
  queue: { backlog: number; growthVel: number; collapseAt: number; collapseEtaEpochs: number | null; citizenImpact: 'low' | 'moderate' | 'severe'; spreadRiskPct: number };
  corruption: { pressure: number; mode: CorruptionMode; selectiveAccel: boolean; queueDivergence: number };
  inboundPressure: number;
}

export interface PressureEdge { from: Agency; to: Agency; kind: string; magnitude: number }

// Realistic propagation topology (directive §2).
const EDGES: { from: Agency; to: Agency; kind: string; w: number }[] = [
  { from: 'IMMIGRATION', to: 'CIVIL_REGISTRY', kind: 'surge → registry pressure', w: 0.6 },
  { from: 'IMMIGRATION', to: 'NATIONAL_ID', kind: 'surge → ID issuance', w: 0.45 },
  { from: 'BORDER', to: 'IMMIGRATION', kind: 'frontier load', w: 0.5 },
  { from: 'POLICE', to: 'CORRECTIONS', kind: 'custody inflow', w: 0.55 },
  { from: 'POLICE', to: 'CITIZEN_SERVICES', kind: 'overload → service delay', w: 0.4 },
  { from: 'EMERGENCY', to: 'PERMITS', kind: 'disaster → permit delay', w: 0.5 },
  { from: 'EMERGENCY', to: 'MUNICIPAL', kind: 'response → municipal strain', w: 0.5 },
  { from: 'MUNICIPAL', to: 'REGIONAL', kind: 'failure → regional backlog', w: 0.65 },
  { from: 'REGIONAL', to: 'CONTRACTS', kind: 'backlog → contract stall', w: 0.4 },
  { from: 'PAYMENTS', to: 'CONTRACTS', kind: 'payment hold → contract', w: 0.45 },
];

function overloadOf(util: number): OverloadState {
  return util >= 130 ? 'saturated' : util >= 100 ? 'overloaded' : util >= 80 ? 'strained' : 'nominal';
}

function baseAgency(agency: Agency, epoch: number, load: number, meanRisk: number, breachCount: number): Omit<AgencyEconomy, 'utilPct' | 'overload' | 'inboundPressure'> {
  const k = `ie:${agency}`;
  const capacity = 4 + Math.floor(seed(`${k}:cap`) * 5);
  const baseUtilPct = Math.round((load / capacity) * 100);
  const fatiguePct = Math.max(0, Math.min(100, Math.round(
    24 + Math.max(0, baseUtilPct - 80) * 0.55 + wave(`${k}:fa`, epoch / 9, 0, 34),
  )));
  const efficiencyPct = Math.max(8, Math.min(100, Math.round(
    100 - Math.max(0, baseUtilPct - 70) * 0.6 - fatiguePct * 0.3,
  )));
  const established = capacity * (3 + Math.floor(seed(`${k}:rost`) * 3));
  const absentPct = Math.round(4 + seed(`${k}:abs`) * 16);
  const overtimePct = Math.round(Math.max(0, baseUtilPct - 70) * 0.4 + seed(`${k}:ot`) * 12);
  const shortagePct = Math.round(seed(`${k}:short`) * 22);
  const present = Math.round(established * (1 - absentPct / 100) * (1 - shortagePct / 100));

  const facilityHealthPct = Math.round(70 + seed(`${k}:fh`) * 28 - fatiguePct * 0.15);
  const commLatencyMs = Math.round(40 + Math.max(0, baseUtilPct - 90) * 2.4 + wave(`${k}:cl`, epoch / 7, 0, 60));
  const outageRiskPct = Math.round(Math.max(0, baseUtilPct - 100) * 0.4 + seed(`${k}:or`) * 14);
  const syncStabilityPct = Math.max(20, Math.round(100 - outageRiskPct * 1.4 - Math.max(0, baseUtilPct - 100) * 0.3));

  const backlog = Math.round(load * 1.8 + breachCount * 4 + seed(`${k}:bl`) * 30);
  const growthVel = Math.round(wave(`${k}:gv`, epoch / 5, -6, 20) + Math.max(0, baseUtilPct - 100) * 0.2);
  const collapseAt = capacity * 8;
  const collapseEtaEpochs = growthVel > 0 ? Math.max(0, Math.round((collapseAt - backlog) / growthVel)) : null;
  const citizenImpact: 'low' | 'moderate' | 'severe' =
    backlog > collapseAt * 0.75 ? 'severe' : backlog > collapseAt * 0.45 ? 'moderate' : 'low';
  const spreadRiskPct = Math.min(100, Math.round(Math.max(0, baseUtilPct - 85) * 0.7 + seed(`${k}:sr`) * 24));

  // Corruption emerges from overload — but the engine must separate
  // lawful overload (risk explained by load) from suspicious obstruction
  // (high risk WITHOUT load: the bribery signature).
  const pressure = Math.min(100, Math.round(meanRisk * 0.6 + Math.max(0, baseUtilPct - 90) * 0.5 + shortagePct * 0.4));
  const selectiveAccel = seed(`${k}:sa`) > 0.84 && pressure >= 35;
  const queueDivergence = Math.round(seed(`${k}:qd`) * 45 + (selectiveAccel ? 25 : 0));
  const mode: CorruptionMode =
    pressure < 30 ? 'clean'
      : baseUtilPct >= 95 ? 'lawful-overload'
        : 'suspicious-obstruction';

  return {
    agency, label: AGENCY_LABEL[agency], capacity, load, baseUtilPct,
    efficiencyPct, fatiguePct,
    staffing: { established, present, absentPct, overtimePct, shortagePct },
    infra: { facilityHealthPct, commLatencyMs, outageRiskPct, syncStabilityPct },
    queue: { backlog, growthVel, collapseAt, collapseEtaEpochs, citizenImpact, spreadRiskPct },
    corruption: { pressure, mode, selectiveAccel, queueDivergence },
  };
}

export type ResilienceMode =
  | 'nominal' | 'strained' | 'overloaded' | 'degraded-sync'
  | 'regional-emergency' | 'national-emergency' | 'constitutional-continuity' | 'recovery';

export interface StabilizationAction {
  kind: 'staffing-reallocation' | 'workflow-rerouting' | 'continuity-reserve' | 'judicial-protection';
  detail: string;
  advisory: true;
}

export interface RegionStrain {
  region: string;
  strainPct: number;
  fatiguePct: number;
  suspicious: number;
  resilienceScore: number;
}

export interface EconomyBoard {
  agencies: AgencyEconomy[];
  edges: PressureEdge[];
  regions: RegionStrain[];
  resilience: ResilienceMode;
  meanUtil: number;
  meanFatigue: number;
  overloadedCount: number;
  suspiciousCount: number;
  stabilization: StabilizationAction[];
  memory: { chronicOverload: string[]; chronicCorruptionZones: string[]; topResilientRegion: string };
}

export function economyBoard(now: number): EconomyBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const txns = observabilityLedger(now);

  // Base economy per agency from real ledger load.
  const base = AGENCIES.map(agency => {
    const a = txns.filter(t => t.agency === agency);
    const load = a.length;
    const meanRisk = a.length ? a.reduce((s, t) => s + t.corruptionRisk, 0) / a.length : 0;
    const breachCount = a.filter(t => t.constitutional === 'breach').length;
    return baseAgency(agency, epoch, load, meanRisk, breachCount);
  });
  const byKey = new Map(base.map(b => [b.agency, b]));

  // Pressure propagation across the mesh.
  const inbound = new Map<Agency, number>();
  const edges: PressureEdge[] = EDGES.map(e => {
    const src = byKey.get(e.from)!;
    const excess = Math.max(0, src.baseUtilPct - 90);
    const magnitude = Math.round(excess * e.w);
    inbound.set(e.to, (inbound.get(e.to) ?? 0) + magnitude);
    return { from: e.from, to: e.to, kind: e.kind, magnitude };
  });

  const agencies: AgencyEconomy[] = base.map(b => {
    const inb = inbound.get(b.agency) ?? 0;
    const utilPct = b.baseUtilPct + inb;
    return { ...b, inboundPressure: inb, utilPct, overload: overloadOf(utilPct) };
  });

  const meanUtil = Math.round(agencies.reduce((s, a) => s + a.utilPct, 0) / agencies.length);
  const meanFatigue = Math.round(agencies.reduce((s, a) => s + a.fatiguePct, 0) / agencies.length);
  const overloadedCount = agencies.filter(a => a.overload === 'overloaded' || a.overload === 'saturated').length;
  const suspiciousCount = agencies.filter(a => a.corruption.mode === 'suspicious-obstruction').length;
  const breachFrac = txns.filter(t => t.constitutional === 'breach').length / Math.max(1, txns.length);
  const pcont = proceduralBoard(now).continuity;

  const resilience: ResilienceMode =
    breachFrac > 0.5 || pcont === 'constitutional-emergency' ? 'constitutional-continuity'
      : meanUtil >= 135 ? 'national-emergency'
        : overloadedCount >= 6 ? 'regional-emergency'
          : agencies.some(a => a.infra.syncStabilityPct < 45) ? 'degraded-sync'
            : meanUtil >= 105 ? 'overloaded'
              : meanUtil >= 85 ? 'strained'
                : meanFatigue > 62 ? 'recovery' : 'nominal';

  // Regions: strain aggregated from the txns physically located there.
  const regions: RegionStrain[] = ECON_REGIONS.map(region => {
    const r = txns.filter(t => t.region === region);
    const strainPct = r.length ? Math.min(160, Math.round((r.length / 6) * 100 + r.filter(t => t.escalation !== 'nominal').length * 6)) : 0;
    const fatiguePct = Math.round(meanFatigue * (0.7 + seed(`ie:rf:${region}`) * 0.6));
    const suspicious = r.filter(t => t.riskFlags.includes('invisible-delay') || t.riskFlags.includes('unauthorized-hold')).length;
    const resilienceScore = Math.max(0, Math.min(100, Math.round(100 - strainPct * 0.4 - fatiguePct * 0.3 - suspicious * 3)));
    return { region, strainPct, fatiguePct, suspicious, resilienceScore };
  }).sort((a, b) => b.strainPct - a.strainPct);

  // Sovereign resource orchestration — advisory only.
  const stabilization: StabilizationAction[] = [];
  const worst = [...agencies].sort((a, b) => b.utilPct - a.utilPct)[0]!;
  const slack = [...agencies].sort((a, b) => a.utilPct - b.utilPct)[0]!;
  if (worst.overload === 'overloaded' || worst.overload === 'saturated') {
    stabilization.push({ kind: 'staffing-reallocation', detail: `Redeploy reserve staffing ${slack.label} → ${worst.label} (util ${slack.utilPct}% → ${worst.utilPct}%)`, advisory: true });
    stabilization.push({ kind: 'workflow-rerouting', detail: `Reroute overflow from ${worst.label} via regional fallback`, advisory: true });
  }
  if (resilience === 'regional-emergency' || resilience === 'national-emergency') {
    stabilization.push({ kind: 'continuity-reserve', detail: 'Activate national continuity reserves & emergency coordination', advisory: true });
  }
  if (suspiciousCount > 0) {
    stabilization.push({ kind: 'judicial-protection', detail: `Escalate ${suspiciousCount} suspicious-obstruction agencies for judicial protection`, advisory: true });
  }

  const chronicOverload = [...agencies].sort((a, b) => b.fatiguePct - a.fatiguePct).slice(0, 3).map(a => a.label);
  const chronicCorruptionZones = regions.filter(r => r.suspicious > 0).slice(0, 3).map(r => r.region);
  const topResilientRegion = [...regions].sort((a, b) => b.resilienceScore - a.resilienceScore)[0]?.region ?? ECON_REGIONS[0]!;

  return {
    agencies, edges, regions, resilience, meanUtil, meanFatigue,
    overloadedCount, suspiciousCount, stabilization,
    memory: { chronicOverload, chronicCorruptionZones, topResilientRegion },
  };
}
