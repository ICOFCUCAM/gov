// Archetype Operations — generalized deep operational engine.
//
// HEALTH and FINANCE have bespoke worlds; every other archetype is also a
// sovereign sub-platform. This engine generates an archetype-tailored
// operational environment for ANY institution — command centre, operations
// centre, registries/workflows, citizen services, personnel, logistics,
// intelligence and regional operations — from the archetype profile,
// subsystem catalog and op-state. Pure & deterministic; no React/DOM.

import type { ArchetypeKey } from '@/lib/api/types';
import { seed, wave } from '@/lib/telemetry';
import { profileFor } from '@/lib/archetype-profiles';
import { subsystemsFor, subsystemOpPct } from '@/lib/institution/operational-catalog';
import { ministryOpState } from '@/lib/gov/ministry-ops';
import { serviceReadings } from '@/lib/gov/ministry-services';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
type Tone = 'ok' | 'warn' | 'alert';
const toneHi = (v: number, hi = 80, mid = 60): Tone => (v >= hi ? 'ok' : v >= mid ? 'warn' : 'alert');
const toneLo = (v: number, lo = 30, mid = 60): Tone => (v <= lo ? 'ok' : v <= mid ? 'warn' : 'alert');

export interface OpsKpi { label: string; value: string; tone: Tone }
export interface OpsQueue { label: string; depth: number; slaHrs: number; oldestHrs: number; breaching: boolean }
export interface OpsUnit { label: string; deployed: number; total: number; tone: Tone }
export interface OpsRegion { region: string; opPct: number; load: number; tone: Tone }
export interface OpsSignal { label: string; level: 'info' | 'watch' | 'risk'; detail: string }
export interface OpsInventory { name: string; unit: string; count: number; opPct: number; tone: Tone }

export interface ArchetypeOperations {
  command: {
    posture: string; postureTone: Tone;
    escalationTier: 0 | 1 | 2 | 3;
    directives: number;
    decisionLatencyMin: number;
    readiness: number;
    aiAdvisory: string;
    chain: string[]; // escalation chain
  };
  kpis: OpsKpi[];
  queues: OpsQueue[];
  citizen: { openRequests: number; slaMetPct: number; satisfactionPct: number; portalUptime: number };
  personnel: { staffedPct: number; onDuty: number; vacanciesPct: number; units: OpsUnit[] };
  logistics: { stockCoverDays: number; inTransit: number; disruptions: number; tone: Tone };
  intelligence: OpsSignal[];
  finance: { budgetPressure: number; auditChainPct: number; procurementIntegrity: number };
  regional: OpsRegion[];
  inventory: OpsInventory[];
  meanOperational: number;
}

export function archetypeOperations(instId: string, archetype: ArchetypeKey, t: number): ArchetypeOperations {
  const profile = profileFor(archetype);
  const op = ministryOpState(instId, archetype, 55 + Math.round(seed(`ao:p:${instId}`) * 35), t);
  const svc = serviceReadings(instId, archetype, t);
  const subs = subsystemsFor(archetype);

  const kpis: OpsKpi[] = svc.slice(0, 8).map(r => ({ label: r.l, value: `${r.value}${r.unit}`, tone: r.tone }));

  const queues: OpsQueue[] = [0, 1, 2].map(i => {
    const depth = Math.round(wave(`ao:q:${instId}:${i}`, t, 20, 480));
    const slaHrs = [48, 72, 120][i]!;
    const oldestHrs = Math.round(wave(`ao:qo:${instId}:${i}`, t, 4, 200));
    return {
      label: i === 0 ? profile.queueTitle : i === 1 ? `${profile.queueSubject} review` : 'Inspections & compliance',
      depth, slaHrs, oldestHrs, breaching: oldestHrs > slaHrs,
    };
  });

  const units: OpsUnit[] = profile.fieldUnits.map((u, i) => {
    const total = 40 + Math.round(seed(`ao:u:${instId}:${i}`) * 360);
    const deployed = Math.round(total * wave(`ao:ud:${instId}:${i}`, t, 0.3, 0.85));
    return { label: u.label, deployed, total, tone: toneHi(Math.round((deployed / total) * 100), 75, 45) };
  });

  const intelligence: OpsSignal[] = profile.incidentTypes.map((it, i) => {
    const active = wave(`ao:i:${instId}:${i}`, t, 0, 1) < it.likelihood + (op.publicPressure / 200);
    return {
      label: it.label,
      level: !active ? 'info' : it.severity === 'sev1' ? 'risk' : it.severity === 'sev2' ? 'watch' : 'info',
      detail: it.detail,
    };
  });

  const regional: OpsRegion[] = REGIONS.map((region, i) => {
    const opPct = subsystemOpPct(instId, `${region}:${i}`);
    return { region, opPct, load: Math.round(wave(`ao:rl:${instId}:${i}`, t, 120, 980)), tone: toneHi(opPct, 78, 55) };
  });

  const inventory: OpsInventory[] = subs.map(s => {
    const opPct = subsystemOpPct(instId, s.name);
    const count = Math.round(s.scale * (0.7 + seed(`ao:inv:${instId}:${s.name}`) * 0.5));
    return { name: s.name, unit: s.unit, count, opPct, tone: toneHi(opPct, 78, 55) };
  });

  const meanOperational = Math.round(regional.reduce((a, r) => a + r.opPct, 0) / regional.length);

  return {
    command: {
      posture: op.escalationTier >= 2 ? 'CRISIS' : op.escalationTier === 1 ? 'ELEVATED' : 'NOMINAL',
      postureTone: op.escalationTier >= 2 ? 'alert' : op.escalationTier === 1 ? 'warn' : 'ok',
      escalationTier: op.escalationTier,
      directives: Math.round(wave(`ao:d:${instId}`, t, 0, 12)),
      decisionLatencyMin: Math.round(wave(`ao:dl:${instId}`, t, 2, 34)),
      readiness: op.readiness,
      aiAdvisory: op.aiAdvisory,
      chain: profile.escalation,
    },
    kpis,
    queues,
    citizen: {
      openRequests: Math.round(wave(`ao:cr:${instId}`, t, 200, 9400)),
      slaMetPct: op.slaCompliance,
      satisfactionPct: Math.round(wave(`ao:cs:${instId}`, t, 54, 92)),
      portalUptime: Math.round(wave(`ao:cu:${instId}`, t, 96, 100) * 100) / 100,
    },
    personnel: {
      staffedPct: op.staffingFilled,
      onDuty: units.reduce((a, u) => a + u.deployed, 0),
      vacanciesPct: Math.max(0, 100 - op.staffingFilled),
      units,
    },
    logistics: {
      stockCoverDays: Math.round(wave(`ao:ls:${instId}`, t, 8, 90)),
      inTransit: Math.round(wave(`ao:lt:${instId}`, t, 20, 640)),
      disruptions: Math.round(seed(`ao:ld:${instId}:${Math.floor(t / 8)}`) * 12),
      tone: toneLo(op.budgetPressure, 35, 60),
    },
    intelligence,
    finance: {
      budgetPressure: op.budgetPressure,
      auditChainPct: Math.round(wave(`ao:ac:${instId}`, t, 98, 100) * 100) / 100,
      procurementIntegrity: Math.round(wave(`ao:pi:${instId}`, t, 74, 99)),
    },
    regional,
    inventory,
    meanOperational,
  };
}
