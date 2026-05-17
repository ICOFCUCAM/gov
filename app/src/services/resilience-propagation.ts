// Resilience Propagation — fabric-graph contagion.
//
// RULE 2 + RULE 3: national resilience is not a snapshot average. A
// brittle provider drags every institution that depends on it through the
// REAL interoperability fabric. This service walks the live dependency
// mesh and propagates operational deficit along its edges to a
// deterministic fixed point, yielding each institution's *effective*
// resilience under contagion and a network-fragility verdict. The graph
// and every weight derive from real operational state and real contracts —
// nothing synthetic. Pure; server-safe; no React/DOM.

import type { Ministry } from '@/lib/api/types';
import { federationPosture } from '@/services/federation-aggregate';
import { interoperabilityFabric } from '@/services/interoperability-fabric';

export interface PropagatedNode {
  id: string;
  name: string;
  base: number;          // standalone operational resilience (0-100)
  effective: number;     // resilience after dependency contagion (0-100)
  contagion: number;     // base − effective (deficit absorbed from providers)
  inbound: number;       // number of provider dependencies
  tone: 'ok' | 'warn' | 'alert';
}
export interface ContagionEdge {
  provider: string;
  dependant: string;
  coupling: number;      // 0-1 failure coupling (tighter when contract stressed)
  transmitted: number;   // resilience points dragged across this edge
}
export interface ResiliencePropagation {
  nodes: PropagatedNode[];
  worst: PropagatedNode | null;
  hotPath: ContagionEdge | null;   // single most-transmitting dependency
  meanEffective: number;
  meanBase: number;
  amplification: number;           // meanBase − meanEffective (systemic drag)
  fragility: 'resilient' | 'coupled' | 'cascading';
}

// Deficit below this floor is what a provider transmits downstream.
const HEALTHY_FLOOR = 70;
// Base share of a provider's deficit a dependant absorbs at full coupling.
const ABSORPTION = 0.45;
// Fixed-point iterations — bounded for determinism & convergence.
const ROUNDS = 5;

interface Dep { provider: string; dependant: string; coupling: number }

export function resiliencePropagation(mins: Ministry[], t: number): ResiliencePropagation {
  const fp = federationPosture(mins, t);
  const fabric = interoperabilityFabric(mins, t);
  const base = new Map(fp.institutions.map(i => [i.id, i.operational]));
  const nameById = new Map(fp.institutions.map(i => [i.id, i.name]));

  // Provider → dependant pairs from the real fabric. A stressed contract
  // (low health) couples failure more tightly than a healthy one.
  const deps: Dep[] = [];
  for (const e of fabric.edges) {
    const coupling = Math.max(0, Math.min(1, (100 - e.health) / 100));
    if (e.direction === 'consumes' || e.direction === 'mutual') {
      // `from` consumes `to` → `to` is the provider, `from` depends on it.
      deps.push({ provider: e.to, dependant: e.from, coupling });
    }
    if (e.direction === 'provides' || e.direction === 'mutual') {
      // `from` provides to `to` → `from` is the provider, `to` depends on it.
      deps.push({ provider: e.from, dependant: e.to, coupling });
    }
  }

  // Fixed-point relaxation: a dependant's effective resilience is its base
  // minus the absorbed deficit of every provider's *effective* resilience.
  // Deterministically bounded iterations let multi-hop contagion settle.
  const eff = new Map(base);
  for (let r = 0; r < ROUNDS; r++) {
    const next = new Map(base);
    for (const id of base.keys()) {
      const b = base.get(id)!;
      let drag = 0;
      for (const d of deps) {
        if (d.dependant !== id) continue;
        const pe = eff.get(d.provider);
        if (pe == null) continue;
        const deficit = Math.max(0, HEALTHY_FLOOR - pe);
        drag += deficit * d.coupling * ABSORPTION;
      }
      next.set(id, Math.max(0, Math.min(100, Math.round(b - drag))));
    }
    for (const [k, v] of next) eff.set(k, v);
  }

  const inboundCount = new Map<string, number>();
  for (const d of deps) inboundCount.set(d.dependant, (inboundCount.get(d.dependant) ?? 0) + 1);

  const nodes: PropagatedNode[] = [...base.keys()].map((id): PropagatedNode => {
    const b = base.get(id)!;
    const e = eff.get(id)!;
    const contagion = b - e;
    return {
      id, name: nameById.get(id) ?? id,
      base: b, effective: e, contagion,
      inbound: inboundCount.get(id) ?? 0,
      tone: e >= 70 ? 'ok' : e >= 50 ? 'warn' : 'alert',
    };
  }).sort((a, b) => a.effective - b.effective);

  // Hottest transmitting edge — largest realised drag at the fixed point.
  let hotPath: ContagionEdge | null = null;
  for (const d of deps) {
    const pe = eff.get(d.provider);
    if (pe == null) continue;
    const transmitted = Math.round(Math.max(0, HEALTHY_FLOOR - pe) * d.coupling * ABSORPTION);
    if (transmitted > 0 && (!hotPath || transmitted > hotPath.transmitted)) {
      hotPath = {
        provider: nameById.get(d.provider) ?? d.provider,
        dependant: nameById.get(d.dependant) ?? d.dependant,
        coupling: Math.round(d.coupling * 100) / 100,
        transmitted,
      };
    }
  }

  const n = nodes.length || 1;
  const meanBase = Math.round([...base.values()].reduce((s, v) => s + v, 0) / n);
  const meanEffective = Math.round(nodes.reduce((s, v) => s + v.effective, 0) / n);
  const amplification = meanBase - meanEffective;
  const fragility: ResiliencePropagation['fragility'] =
    nodes.length === 0 ? 'resilient'
      : amplification >= 12 || meanEffective < 50 ? 'cascading'
        : amplification >= 5 || meanEffective < 70 ? 'coupled' : 'resilient';

  return {
    nodes,
    worst: nodes[0] ?? null,
    hotPath,
    meanEffective,
    meanBase,
    amplification,
    fragility,
  };
}
