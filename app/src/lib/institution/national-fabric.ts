// National Interoperability Fabric. Aggregates every active institution's
// dependency graph into a whole-of-government mesh: nodes (institutions),
// edges (cross-ministry dependencies), and cascade weighting. Pure &
// deterministic; live link health is layered on in the view.

import type { ArchetypeKey, Ministry } from '@/lib/api/types';
import { seed } from '@/lib/telemetry';
import { ministryDependencies } from '@/lib/institution/ministry-fabric';

export interface FabricNode { id: string; name: string; archetype: ArchetypeKey; external: boolean }
export interface FabricEdge {
  id: string;
  fromId: string; fromName: string;
  toId: string; toName: string;
  relation: string;
  direction: 'consumes' | 'provides' | 'mutual';
  weight: number; // cascade weight 0..100 (criticality of the link)
}
export interface NationalFabric {
  nodes: FabricNode[];
  edges: FabricEdge[];
  /** institutions ranked by how many others depend on them (systemic risk) */
  systemic: { id: string; name: string; inbound: number; weight: number }[];
  stats: { institutions: number; links: number; mutual: number; consumes: number; provides: number; meanWeight: number };
}

export function buildNationalFabric(mins: Ministry[]): NationalFabric {
  const active = mins.filter(m => m.status === 'active');
  const byArch = new Map<ArchetypeKey, Ministry>();
  for (const m of active) if (!byArch.has(m.archetype)) byArch.set(m.archetype, m);

  const nodes = new Map<string, FabricNode>();
  for (const m of active) nodes.set(m.id, { id: m.id, name: m.name, archetype: m.archetype, external: false });

  const edges: FabricEdge[] = [];
  for (const m of active) {
    for (const dep of ministryDependencies(m.archetype)) {
      const target = byArch.get(dep.archetype);
      const toId = target ? target.id : `ext:${dep.archetype}`;
      const toName = target ? target.name : `${dep.archetype} (capability)`;
      if (!nodes.has(toId)) nodes.set(toId, { id: toId, name: toName, archetype: dep.archetype, external: !target });
      const weight = 45 + Math.round(seed(`fw:${m.archetype}:${dep.archetype}:${dep.relation}`) * 54);
      edges.push({
        id: `${m.id}->${toId}:${dep.relation}`,
        fromId: m.id, fromName: m.name, toId, toName,
        relation: dep.relation, direction: dep.direction, weight,
      });
    }
  }

  const inbound = new Map<string, { n: number; w: number }>();
  for (const e of edges) {
    const cur = inbound.get(e.toId) ?? { n: 0, w: 0 };
    cur.n += 1; cur.w += e.weight;
    inbound.set(e.toId, cur);
  }
  const systemic = [...inbound.entries()]
    .map(([id, v]) => ({ id, name: nodes.get(id)?.name ?? id, inbound: v.n, weight: Math.round(v.w / v.n) }))
    .sort((a, b) => b.inbound * b.weight - a.inbound * a.weight)
    .slice(0, 8);

  const mutual = edges.filter(e => e.direction === 'mutual').length;
  const consumes = edges.filter(e => e.direction === 'consumes').length;
  const provides = edges.filter(e => e.direction === 'provides').length;
  const meanWeight = edges.length ? Math.round(edges.reduce((a, e) => a + e.weight, 0) / edges.length) : 0;

  return {
    nodes: [...nodes.values()],
    edges,
    systemic,
    stats: { institutions: active.length, links: edges.length, mutual, consumes, provides, meanWeight },
  };
}
