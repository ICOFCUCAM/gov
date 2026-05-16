// Interoperability Fabric — emergent federation service.
//
// RULE 2: dependency graphs must derive from real interoperability, not
// fabricated values. This service computes the inter-institution
// dependency mesh from the ACTIVE federation — each institution's
// archetype interoperability contracts, weighted by the live operational
// posture of provider and consumer. Pure; server-safe; no React/DOM.

import type { Ministry, ArchetypeKey } from '@/lib/api/types';
import { ministryDependencies } from '@/lib/institution/ministry-fabric';
import { federationPosture } from '@/services/federation-aggregate';

export interface FabricEdge {
  from: string;            // provider institution id
  fromName: string;
  to: string;              // consumer institution id
  toName: string;
  relation: string;
  direction: 'consumes' | 'provides' | 'mutual';
  /** 0-100 contract health (lower = stressed dependency) */
  health: number;
  tone: 'ok' | 'warn' | 'alert';
}
export interface InteroperabilityFabric {
  edges: FabricEdge[];
  nodes: number;
  stressedLinks: number;   // edges with health < 60
  meanHealth: number;
  posture: 'cohesive' | 'strained' | 'fragmented';
}

export function interoperabilityFabric(mins: Ministry[], t: number): InteroperabilityFabric {
  const active = mins.filter(m => m.status === 'active');
  const fp = federationPosture(mins, t);
  const opById = new Map(fp.institutions.map(i => [i.id, i.operational]));
  const byArchetype = new Map<ArchetypeKey, Ministry>();
  for (const m of active) if (!byArchetype.has(m.archetype)) byArchetype.set(m.archetype, m);

  const edges: FabricEdge[] = [];
  for (const m of active) {
    const deps = ministryDependencies(m.archetype);
    for (const d of deps) {
      const partner = byArchetype.get(d.archetype);
      if (!partner || partner.id === m.id) continue;
      // Contract health emerges from both endpoints' real operational state.
      const a = opById.get(m.id) ?? 60;
      const b = opById.get(partner.id) ?? 60;
      const health = Math.round(a * 0.5 + b * 0.5);
      edges.push({
        from: m.id, fromName: m.name,
        to: partner.id, toName: partner.name,
        relation: d.relation, direction: d.direction,
        health,
        tone: health >= 70 ? 'ok' : health >= 55 ? 'warn' : 'alert',
      });
    }
  }
  // De-duplicate mirrored edges (keep the lower-health view).
  const seen = new Map<string, FabricEdge>();
  for (const e of edges) {
    const key = [e.from, e.to].sort().join('|') + e.relation;
    const prev = seen.get(key);
    if (!prev || e.health < prev.health) seen.set(key, e);
  }
  const finalEdges = [...seen.values()].sort((a, b) => a.health - b.health);

  const stressedLinks = finalEdges.filter(e => e.health < 60).length;
  const meanHealth = finalEdges.length
    ? Math.round(finalEdges.reduce((s, e) => s + e.health, 0) / finalEdges.length)
    : 100;
  const posture: InteroperabilityFabric['posture'] =
    meanHealth < 55 || stressedLinks >= 4 ? 'fragmented'
      : meanHealth < 72 || stressedLinks >= 1 ? 'strained' : 'cohesive';

  return { edges: finalEdges, nodes: active.length, stressedLinks, meanHealth, posture };
}
