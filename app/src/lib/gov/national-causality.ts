// lib/gov/national-causality.ts
//
// The sovereign National Digital Twin & systemic-causality engine. The
// nation is one federated constitutional organism: strain in one shell
// propagates causally to others (with delay + amplification or
// stabilization), cascades are detected, systemic collapse is forecast,
// and stabilization is orchestrated — all constitutionally bounded
// (cross-shell exchange is posture-only, justified, logged, auditable).
// Pure & deterministic; composed from the economy + temporal + procedural
// + constitutional engines so it stays one connected sovereign runtime.

import { seed } from '@/lib/telemetry';
import { economyBoard } from '@/lib/gov/institutional-economy';
import { temporalBoard } from '@/lib/gov/temporal-intelligence';
import { canAccess } from '@/lib/gov/constitutional-governance';
import type { Agency } from '@/lib/gov/sovereign-observability';

export type ShellKey =
  | 'POLICE' | 'IMMIGRATION' | 'EMERGENCY' | 'CIVIL_REGISTRY' | 'MUNICIPAL'
  | 'CORRECTIONS' | 'REGIONAL' | 'HEALTH' | 'TREASURY' | 'LABOUR'
  | 'EDUCATION' | 'TRANSPORT';

interface ShellDef { key: ShellKey; label: string; kind: 'interior' | 'external'; agencies: Agency[] }

export const SHELLS: ShellDef[] = [
  { key: 'POLICE', label: 'Police', kind: 'interior', agencies: ['POLICE'] },
  { key: 'IMMIGRATION', label: 'Immigration & Borders', kind: 'interior', agencies: ['IMMIGRATION', 'BORDER'] },
  { key: 'EMERGENCY', label: 'Emergency Operations', kind: 'interior', agencies: ['EMERGENCY'] },
  { key: 'CIVIL_REGISTRY', label: 'Civil Registry', kind: 'interior', agencies: ['CIVIL_REGISTRY', 'NATIONAL_ID'] },
  { key: 'MUNICIPAL', label: 'Municipal Systems', kind: 'interior', agencies: ['MUNICIPAL'] },
  { key: 'CORRECTIONS', label: 'Corrections', kind: 'interior', agencies: ['CORRECTIONS'] },
  { key: 'REGIONAL', label: 'Regional Administration', kind: 'interior', agencies: ['REGIONAL', 'CITIZEN_SERVICES', 'PERMITS', 'LICENSING'] },
  { key: 'HEALTH', label: 'Health', kind: 'external', agencies: [] },
  { key: 'TREASURY', label: 'Treasury', kind: 'external', agencies: [] },
  { key: 'LABOUR', label: 'Labour', kind: 'external', agencies: [] },
  { key: 'EDUCATION', label: 'Education', kind: 'external', agencies: [] },
  { key: 'TRANSPORT', label: 'Transport', kind: 'external', agencies: [] },
];

export type EdgeKind = 'amplify' | 'stabilize';
export interface CausalEdge { from: ShellKey; to: ShellKey; kind: EdgeKind; delayEpochs: number; factor: number; mechanism: string }

// Sovereign causality topology (directive §1 examples).
export const CAUSAL_EDGES: CausalEdge[] = [
  { from: 'IMMIGRATION', to: 'CIVIL_REGISTRY', kind: 'amplify', delayEpochs: 1, factor: 0.55, mechanism: 'migration surge → registry pressure' },
  { from: 'CIVIL_REGISTRY', to: 'MUNICIPAL', kind: 'amplify', delayEpochs: 2, factor: 0.4, mechanism: 'registry backlog → municipal strain' },
  { from: 'MUNICIPAL', to: 'POLICE', kind: 'amplify', delayEpochs: 2, factor: 0.38, mechanism: 'municipal failure → civil congestion' },
  { from: 'TREASURY', to: 'LABOUR', kind: 'amplify', delayEpochs: 1, factor: 0.5, mechanism: 'economic instability → labour pressure' },
  { from: 'LABOUR', to: 'REGIONAL', kind: 'amplify', delayEpochs: 2, factor: 0.42, mechanism: 'labour pressure → permit/admin backlog' },
  { from: 'EMERGENCY', to: 'HEALTH', kind: 'amplify', delayEpochs: 0, factor: 0.6, mechanism: 'disaster → healthcare overflow' },
  { from: 'HEALTH', to: 'REGIONAL', kind: 'amplify', delayEpochs: 2, factor: 0.36, mechanism: 'health overflow → regional instability' },
  { from: 'EDUCATION', to: 'CIVIL_REGISTRY', kind: 'amplify', delayEpochs: 1, factor: 0.45, mechanism: 'enrollment surge → identity delays' },
  { from: 'POLICE', to: 'CORRECTIONS', kind: 'amplify', delayEpochs: 1, factor: 0.5, mechanism: 'custody inflow → corrections saturation' },
  { from: 'TRANSPORT', to: 'MUNICIPAL', kind: 'amplify', delayEpochs: 2, factor: 0.3, mechanism: 'transport disruption → municipal load' },
  { from: 'REGIONAL', to: 'MUNICIPAL', kind: 'stabilize', delayEpochs: 1, factor: 0.28, mechanism: 'regional reinforcement → municipal relief' },
  { from: 'TREASURY', to: 'EMERGENCY', kind: 'stabilize', delayEpochs: 1, factor: 0.3, mechanism: 'fiscal backing → emergency continuity' },
];

export interface ShellState {
  key: ShellKey;
  label: string;
  kind: 'interior' | 'external';
  baseStrain: number;        // 0..160
  inbound: number;           // net propagated (amplify − stabilize)
  effectiveStrain: number;
  fracture: boolean;         // crosses fracture threshold
  posture: 'stable' | 'strained' | 'overloaded' | 'fracturing';
}

const FRACTURE = 115;

function externalStrain(key: ShellKey, epoch: number): number {
  return Math.round(40 + seed(`nc:ext:${key}:${Math.floor(epoch / 6)}`) * 70 + seed(`nc:ext2:${key}:${epoch}`) * 20);
}

export type NationalContinuityMode =
  | 'stable-governance' | 'rising-national-strain' | 'multi-shell-overload'
  | 'regional-instability' | 'constitutional-pressure' | 'sovereign-continuity-risk'
  | 'stabilization-deployment' | 'adaptive-recovery' | 'restored-continuity';

export interface CascadeChain { path: ShellKey[]; mechanism: string[]; peakStrain: number }

export interface CrossShellExchange {
  from: ShellKey; to: ShellKey; purpose: string;
  dataClass: 'posture-only'; justified: boolean; logged: boolean;
  auditable: boolean; jurisdictionBounded: boolean;
}

export interface DigitalTwin {
  epoch: number;
  shells: ShellState[];
  edges: (CausalEdge & { magnitude: number })[];
  cascades: CascadeChain[];
  continuity: NationalContinuityMode;
  meanStrain: number;
  fractureCount: number;
  collapse: { probabilityPct: number; timeToInstabilityEpochs: number | null; direction: string[]; constitutionalImpact: 'low' | 'elevated' | 'severe' };
  stabilization: { kind: string; detail: string; advisory: true }[];
  exchanges: CrossShellExchange[];
  memory: { recurringCrisisCycle: string; chronicFailureShells: string[]; recoveryEffectivenessPct: number };
}

export function digitalTwin(now: number): DigitalTwin {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const eco = economyBoard(now);
  const tmp = temporalBoard(now);

  // Base strain per shell: interior shells from the live economy board;
  // external ministries from federated posture only (constitutional
  // boundary — no internal data crosses the shell line).
  const base = new Map<ShellKey, number>();
  for (const s of SHELLS) {
    if (s.kind === 'interior') {
      const mapped = eco.agencies.filter(a => s.agencies.includes(a.agency));
      const v = mapped.length ? mapped.reduce((x, a) => x + a.utilPct, 0) / mapped.length : 60;
      base.set(s.key, Math.round(v));
    } else {
      base.set(s.key, externalStrain(s.key, epoch));
    }
  }

  // Single-pass causal propagation (sources use base strain; delay
  // attenuates the contribution — deterministic and non-circular).
  const inbound = new Map<ShellKey, number>();
  const edges = CAUSAL_EDGES.map(e => {
    const src = base.get(e.from)!;
    const excess = Math.max(0, src - 90);
    const attenuation = 1 / (1 + e.delayEpochs * 0.45);
    const raw = excess * e.factor * attenuation;
    const magnitude = Math.round(e.kind === 'amplify' ? raw : -raw);
    inbound.set(e.to, (inbound.get(e.to) ?? 0) + magnitude);
    return { ...e, magnitude };
  });

  const shells: ShellState[] = SHELLS.map(s => {
    const b = base.get(s.key)!;
    const inb = inbound.get(s.key) ?? 0;
    const eff = Math.max(0, Math.min(180, b + inb));
    const posture: ShellState['posture'] =
      eff >= FRACTURE ? 'fracturing' : eff >= 100 ? 'overloaded' : eff >= 80 ? 'strained' : 'stable';
    return { key: s.key, label: s.label, kind: s.kind, baseStrain: b, inbound: inb, effectiveStrain: eff, fracture: eff >= FRACTURE, posture };
  });
  const byKey = new Map(shells.map(s => [s.key, s]));

  // Cascade detection: amplifying chains where each hop is itself strained.
  const cascades: CascadeChain[] = [];
  const amp = edges.filter(e => e.kind === 'amplify' && e.magnitude > 0);
  for (const start of amp) {
    if ((byKey.get(start.from)?.effectiveStrain ?? 0) < 100) continue;
    const path: ShellKey[] = [start.from]; const mech: string[] = [];
    let cur: ShellKey = start.from; let peak = byKey.get(cur)!.effectiveStrain;
    for (let hop = 0; hop < 4; hop++) {
      const next = amp.find(e => e.from === cur && !path.includes(e.to) && (byKey.get(e.to)?.effectiveStrain ?? 0) >= 95);
      if (!next) break;
      path.push(next.to); mech.push(next.mechanism);
      peak = Math.max(peak, byKey.get(next.to)!.effectiveStrain);
      cur = next.to;
    }
    if (path.length >= 3) cascades.push({ path, mechanism: mech, peakStrain: peak });
  }

  const meanStrain = Math.round(shells.reduce((s, x) => s + x.effectiveStrain, 0) / shells.length);
  const fractureCount = shells.filter(s => s.fracture).length;
  const constitutionalImpact: 'low' | 'elevated' | 'severe' =
    eco.suspiciousCount >= 3 || fractureCount >= 4 ? 'severe'
      : eco.suspiciousCount >= 1 || fractureCount >= 2 ? 'elevated' : 'low';

  const continuity: NationalContinuityMode =
    fractureCount >= 5 ? 'sovereign-continuity-risk'
      : constitutionalImpact === 'severe' ? 'constitutional-pressure'
        : fractureCount >= 3 ? 'multi-shell-overload'
          : shells.filter(s => s.kind === 'interior' && s.posture !== 'stable').length >= 4 ? 'regional-instability'
            : tmp.continuity.degradationProbPct >= 55 ? 'rising-national-strain'
              : tmp.resilience === 'recovery-adaptation' ? 'adaptive-recovery'
                : eco.stabilization.length > 0 ? 'stabilization-deployment'
                  : eco.meanFatigue < 40 && meanStrain < 80 ? 'restored-continuity' : 'stable-governance';

  // Systemic collapse forecast (merges temporal + causal).
  const collapsingShells = shells.filter(s => s.effectiveStrain >= FRACTURE).length;
  const tEta = tmp.warnings.length ? Math.min(...tmp.warnings.map(w => w.etaEpochs)) : null;
  const collapse = {
    probabilityPct: Math.min(99, Math.round((collapsingShells / shells.length) * 100 + tmp.continuity.degradationProbPct * 0.4)),
    timeToInstabilityEpochs: collapsingShells > 0 ? (tEta ?? 1) : tEta,
    direction: [...edges].filter(e => e.kind === 'amplify' && e.magnitude > 0)
      .sort((a, b) => b.magnitude - a.magnitude).slice(0, 4)
      .map(e => `${e.from}→${e.to}`),
    constitutionalImpact,
  };

  // Sovereign stabilization orchestration — advisory, constitutionally bounded.
  const weakest = [...shells].sort((a, b) => b.effectiveStrain - a.effectiveStrain)[0]!;
  const strongest = [...shells].sort((a, b) => a.effectiveStrain - b.effectiveStrain)[0]!;
  const stabilization: { kind: string; detail: string; advisory: true }[] = [];
  if (weakest.effectiveStrain >= 100) {
    stabilization.push({ kind: 'reinforce-shell', detail: `Reinforce ${weakest.label} (strain ${weakest.effectiveStrain}) from ${strongest.label} (${strongest.effectiveStrain})`, advisory: true });
  }
  if (cascades.length > 0) {
    stabilization.push({ kind: 'contain-propagation', detail: `Contain ${cascades.length} cascade chain(s) — interdict amplifying edge ${cascades[0]!.path.join('→')}`, advisory: true });
  }
  if (continuity === 'sovereign-continuity-risk' || continuity === 'constitutional-pressure') {
    stabilization.push({ kind: 'activate-continuity-reserves', detail: 'Activate national continuity reserves & emergency coordination', advisory: true });
  }
  if (eco.suspiciousCount > 0) {
    stabilization.push({ kind: 'stabilize-corruption-hotspots', detail: `Escalate ${eco.suspiciousCount} suspicious-obstruction hotspots to anti-corruption oversight`, advisory: true });
  }

  // Cross-shell exchanges — posture-only, justified, logged, auditable,
  // jurisdiction-bounded (constitutional separation preserved).
  const exchanges: CrossShellExchange[] = CAUSAL_EDGES.map(e => {
    const targetAgency = (SHELLS.find(s => s.key === e.to)?.agencies[0]) as Agency | undefined;
    const bounded = targetAgency ? canAccess('commander', targetAgency, 'operational').allowed : true;
    return {
      from: e.from, to: e.to, purpose: e.mechanism,
      dataClass: 'posture-only', justified: true, logged: true,
      auditable: true, jurisdictionBounded: bounded,
    };
  });

  return {
    epoch, shells, edges, cascades, continuity, meanStrain, fractureCount,
    collapse, stabilization, exchanges,
    memory: {
      recurringCrisisCycle: tmp.memory.annualCollapseCycle,
      chronicFailureShells: shells.filter(s => s.effectiveStrain >= 100).slice(0, 3).map(s => s.label),
      recoveryEffectivenessPct: tmp.memory.recoveryEffectivenessPct,
    },
  };
}
