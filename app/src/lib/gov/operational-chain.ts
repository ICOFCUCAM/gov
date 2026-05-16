// Operational Chain Simulation.
//
// The state is not a set of independent institutions — it is a coupled
// organism. When an institution fails, the consequence does not stop at
// its boundary: it propagates along the real dependency fabric, degrades
// dependents, escalates command tiers, spreads to the treasury, disrupts
// citizen services, and finally enters a recovery workflow. This engine
// simulates that full chain. Pure & deterministic; no React/DOM.

import type { ArchetypeKey, Ministry } from '@/lib/api/types';
import { seed, wave } from '@/lib/telemetry';
import { buildNationalFabric } from '@/lib/institution/national-fabric';
import { ministryOpState } from '@/lib/gov/ministry-ops';
import { blueprintFor } from '@/lib/institution/blueprint';
import { stateFabric } from '@/lib/gov/state-fabric';

export type ChainStageKey =
  | 'trigger' | 'dependency' | 'escalation' | 'treasury' | 'citizen' | 'recovery';

export interface ChainImpact {
  instId: string;
  instName: string;
  archetype: ArchetypeKey;
  severity: number;        // 0-100 degradation inflicted at this stage
  effect: string;
}
export interface ChainStage {
  key: ChainStageKey;
  label: string;
  tPlusMin: number;        // minutes after trigger
  severity: number;        // 0-100 stage intensity
  tone: 'ok' | 'warn' | 'alert';
  impacts: ChainImpact[];
  note: string;
}
export interface OperationalChain {
  origin: { id: string; name: string; archetype: ArchetypeKey };
  trigger: string;
  originSeverity: number;          // 0-100
  stages: ChainStage[];
  totalAffected: number;
  treasuryImpactPct: number;       // negative = GDP/fiscal drag
  citizenServicesDown: number;     // count of citizen-facing systems disrupted
  recoveryMins: number;
  containment: 'contained' | 'spreading' | 'critical';
}

const sev = (n: number): 'ok' | 'warn' | 'alert' => (n >= 65 ? 'alert' : n >= 40 ? 'warn' : 'ok');

// Failure modes by archetype — what "the institution fails" concretely means.
const FAILURE: Partial<Record<ArchetypeKey, string>> = {
  HEALTH: 'Hospital network capacity collapse',
  ENERGY: 'Grid generation / transmission failure',
  TRANSPORT: 'Corridor & logistics network seizure',
  FINANCE: 'Treasury liquidity & disbursement failure',
  INTERIOR: 'Civil-registry & internal-coordination outage',
  AGRICULTURE: 'Food-supply & distribution breakdown',
  EDUCATION: 'Examination & service continuity failure',
  ENVIRONMENT: 'Environmental-hazard containment failure',
  JUSTICE: 'Court & corrections continuity failure',
  LABOR: 'Social-insurance & payment failure',
  TRADE: 'Customs & trade-corridor stoppage',
  GENERIC: 'Core service continuity failure',
};

function citizenSystemCount(archetype: ArchetypeKey): number {
  return blueprintFor(archetype)
    .flatMap(g => g.systems)
    .filter(s => s.kind === 'citizen').length;
}

export function buildOperationalChain(
  mins: Ministry[],
  originId: string | null,
  t: number,
): OperationalChain | null {
  const active = mins.filter(m => m.status === 'active');
  if (active.length === 0) return null;

  const fabric = buildNationalFabric(mins);
  // Pick the origin: explicit, else the most operationally stressed.
  const withStress = active.map(m => {
    const op = ministryOpState(m.id, m.archetype, 60 + Math.round(seed(`oc:${m.id}`) * 35), t);
    const s = Math.round(Math.min(100, (100 - op.readiness) * 0.6 + op.publicPressure * 0.25 + op.budgetPressure * 0.15));
    return { m, s };
  });
  // No explicit origin → the state fabric's worst coupled domain drives
  // the chain (cross-system propagation), else most operationally stressed.
  const sf = stateFabric(mins, t);
  const domainArch: Record<string, ArchetypeKey> = { healthcare: 'HEALTH', treasury: 'FINANCE' };
  const sfArch = domainArch[sf.worst];
  const sfOrigin = sfArch ? withStress.find(x => x.m.archetype === sfArch) : undefined;
  const origin =
    (originId && withStress.find(x => x.m.id === originId)) ||
    sfOrigin ||
    [...withStress].sort((a, b) => b.s - a.s)[0]!;
  const oId = origin.m.id;
  // Severity reflects the coupled-domain instability when the fabric chose
  // the origin — the shock is as deep as the worst domain's stress.
  const sfDomain = sf.domains.find(d => domainArch[d.domain] === origin.m.archetype);
  const oSev = Math.max(45, origin.s, sfOrigin && sfDomain ? sfDomain.instability : 0);

  // Adjacency from the real dependency fabric (who depends on whom).
  const out = new Map<string, { to: string; w: number }[]>();
  for (const e of fabric.edges) {
    // degradation flows from a provider to its consumers/mutual partners
    const arr = out.get(e.fromId) ?? [];
    arr.push({ to: e.toId, w: e.weight / 100 });
    out.set(e.fromId, arr);
    if (e.direction === 'mutual') {
      const rev = out.get(e.toId) ?? [];
      rev.push({ to: e.fromId, w: (e.weight / 100) * 0.8 });
      out.set(e.toId, rev);
    }
  }
  const nameOf = (id: string) => active.find(m => m.id === id)?.name ?? id;
  const archOf = (id: string) => active.find(m => m.id === id)?.archetype ?? 'GENERIC';

  // BFS degradation propagation, depth-decayed.
  const degr = new Map<string, number>([[oId, oSev]]);
  let frontier = [oId];
  for (let depth = 1; depth <= 3 && frontier.length; depth++) {
    const next: string[] = [];
    const decay = 0.62 ** depth;
    for (const fid of frontier) {
      for (const edge of out.get(fid) ?? []) {
        if (!active.some(m => m.id === edge.to)) continue;
        const inflicted = Math.round((degr.get(fid) ?? 0) * edge.w * decay);
        if (inflicted < 8) continue;
        const prev = degr.get(edge.to) ?? 0;
        if (inflicted > prev) {
          degr.set(edge.to, Math.min(100, inflicted));
          next.push(edge.to);
        }
      }
    }
    frontier = [...new Set(next)];
  }

  const dependents = [...degr.entries()].filter(([id]) => id !== oId)
    .map(([id, s]) => ({ id, s }))
    .sort((a, b) => b.s - a.s);

  const directDeps = dependents.slice(0, 6);
  const secondOrder = dependents.filter(d => d.s < oSev * 0.55).slice(0, 5);

  // Treasury impact — FINANCE proximity amplifies fiscal drag.
  const financeHit = dependents.find(d => archOf(d.id) === 'FINANCE');
  const treasuryImpactPct = -Math.round(
    ((oSev * 0.03) + (financeHit ? financeHit.s * 0.04 : 0) + dependents.length * 0.4) * 10,
  ) / 10;

  // Citizen-service disruption — citizen systems of the origin + worst dependents.
  const citizenDown = [origin.m, ...directDeps.map(d => active.find(m => m.id === d.id)!)]
    .filter(Boolean)
    .reduce((a, m) => a + Math.round(citizenSystemCount(m.archetype) * (Math.min(100, degr.get(m.id) ?? 0) / 100)), 0);

  const totalAffected = degr.size;
  // A more tightly-coupled state (high systemic fabric stress) recovers
  // slower and escalates containment — cross-system propagation feedback.
  const coupling = sf.systemicStress;
  const recoveryMins = Math.round(45 + oSev * 1.6 + dependents.length * 12 + (financeHit ? 40 : 0) + coupling * 0.9);
  const containment: OperationalChain['containment'] =
    totalAffected >= 6 || oSev >= 80 || coupling >= 60 ? 'critical'
      : totalAffected >= 3 || coupling >= 40 ? 'spreading' : 'contained';

  const trig = FAILURE[origin.m.archetype] ?? FAILURE.GENERIC!;

  const mkImpacts = (list: { id: string; s: number }[], verb: string): ChainImpact[] =>
    list.map(d => ({
      instId: d.id, instName: nameOf(d.id), archetype: archOf(d.id) as ArchetypeKey,
      severity: d.s, effect: `${verb} · ${d.s}% degradation`,
    }));

  const stages: ChainStage[] = [
    {
      key: 'trigger', label: 'Trigger', tPlusMin: 0, severity: oSev, tone: sev(oSev),
      impacts: [{ instId: oId, instName: origin.m.name, archetype: origin.m.archetype, severity: oSev, effect: trig }],
      note: `${origin.m.name} enters failure: ${trig.toLowerCase()}.`,
    },
    {
      key: 'dependency', label: 'Dependency degradation', tPlusMin: 8,
      severity: directDeps[0]?.s ?? 0, tone: sev(directDeps[0]?.s ?? 0),
      impacts: mkImpacts(directDeps, 'Service degradation'),
      note: directDeps.length
        ? `${directDeps.length} dependent institutions degrade along the fabric.`
        : 'No first-order dependents — failure localised.',
    },
    {
      key: 'escalation', label: 'Escalation propagation', tPlusMin: 22,
      severity: Math.round(oSev * 0.7), tone: sev(oSev * 0.7),
      impacts: mkImpacts(secondOrder, 'Second-order strain'),
      note: containment === 'critical'
        ? 'Command escalates to national crisis tier; cabinet cell convened.'
        : 'Escalation contained at sector command tier.',
    },
    {
      key: 'treasury', label: 'Treasury impact spread', tPlusMin: 40,
      severity: Math.min(100, Math.abs(treasuryImpactPct) * 18), tone: sev(Math.abs(treasuryImpactPct) * 18),
      impacts: financeHit
        ? [{ instId: financeHit.id, instName: nameOf(financeHit.id), archetype: 'FINANCE', severity: financeHit.s, effect: 'Fiscal absorption · contingency draw' }]
        : [],
      note: `Projected fiscal drag ${treasuryImpactPct}% — contingency reserves engaged.`,
    },
    {
      key: 'citizen', label: 'Citizen-service disruption', tPlusMin: 55,
      severity: Math.min(100, citizenDown * 8), tone: sev(citizenDown * 8),
      impacts: [],
      note: `${citizenDown} citizen-facing systems disrupted across affected institutions.`,
    },
    {
      key: 'recovery', label: 'National recovery workflow', tPlusMin: recoveryMins,
      severity: Math.max(0, 100 - oSev), tone: 'ok',
      impacts: [],
      note: `Sequenced restoration · worst-degraded first · projected stabilisation T+${recoveryMins}m.`,
    },
  ];

  return {
    origin: { id: oId, name: origin.m.name, archetype: origin.m.archetype },
    trigger: trig,
    originSeverity: oSev,
    stages,
    totalAffected,
    treasuryImpactPct,
    citizenServicesDown: citizenDown,
    recoveryMins,
    containment,
  };
}

// Recovery doctrine — the executable workflow that drives the chain back
// to baseline. Deterministic; advisory (humans authorise & act).
export interface RecoveryStep { order: number; action: string; lead: ArchetypeKey | 'COORDINATION'; etaMin: number; restores: number }
export function recoveryWorkflow(chain: OperationalChain): RecoveryStep[] {
  const lead = chain.origin.archetype;
  const span = chain.recoveryMins;
  return [
    { order: 1, action: `Isolate ${chain.origin.name} · halt propagation paths`, lead, etaMin: Math.round(span * 0.15), restores: 22 },
    { order: 2, action: 'Activate mutual-aid from unaffected institutions', lead: 'COORDINATION', etaMin: Math.round(span * 0.35), restores: 26 },
    { order: 3, action: chain.treasuryImpactPct <= -2 ? 'Authorise contingency reserve draw' : 'Pre-stage contingency reserves', lead: 'FINANCE', etaMin: Math.round(span * 0.5), restores: 18 },
    { order: 4, action: 'Restore citizen-facing services · worst-degraded first', lead, etaMin: Math.round(span * 0.78), restores: 20 },
    { order: 5, action: 'After-action capture · doctrine update · stand down', lead: 'COORDINATION', etaMin: span, restores: 14 },
  ];
}
