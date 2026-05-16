// Cascade propagation engine. The national fabric is a living system:
// when an institution it depends on degrades, stress propagates along
// dependency edges. Pure & deterministic; the health source is injected
// so the same engine drives static scoring and live telemetry.

import type { Ministry } from '@/lib/api/types';
import { subsystemHealth } from '@/lib/institution/operational-catalog';
import { ministryDependencies } from '@/lib/institution/ministry-fabric';

export interface CascadeNode {
  id: string;
  name: string;
  baseStress: number;       // 100 - intrinsic health
  inheritedStress: number;  // propagated from upstream providers
  totalStress: number;      // clamped base + inherited
  posture: 'stable' | 'watch' | 'strained' | 'critical';
  contributors: { name: string; via: string; amount: number }[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const DAMP = 0.55; // attenuation per dependency hop

export function buildCascade(
  mins: Ministry[],
  health: (id: string, archetype: Ministry['archetype']) => number = subsystemHealth,
): CascadeNode[] {
  const active = mins.filter(m => m.status === 'active');
  const byArch = new Map<Ministry['archetype'], Ministry>();
  for (const m of active) if (!byArch.has(m.archetype)) byArch.set(m.archetype, m);

  // Resolve "who does X depend on" → list of provider institutions.
  const providersOf = new Map<string, { m: Ministry; relation: string; weight: number }[]>();
  for (const m of active) {
    const list: { m: Ministry; relation: string; weight: number }[] = [];
    for (const dep of ministryDependencies(m.archetype)) {
      // m consumes/mutual → m depends on the dep archetype's institution
      if (dep.direction === 'provides') continue; // m provides to dep; not a dependency of m
      const prov = byArch.get(dep.archetype);
      if (prov && prov.id !== m.id) list.push({ m: prov, relation: dep.relation, weight: 0.5 + 0.5 * (dep.direction === 'mutual' ? 0.7 : 1) });
    }
    providersOf.set(m.id, list);
  }

  const base = new Map<string, number>();
  for (const m of active) base.set(m.id, clamp(100 - health(m.id, m.archetype)));

  return active.map(m => {
    const baseStress = base.get(m.id) ?? 0;
    const contributors: CascadeNode['contributors'] = [];
    let inherited = 0;
    // two-hop propagation, attenuated, deterministic order
    for (const p of providersOf.get(m.id) ?? []) {
      const direct = (base.get(p.m.id) ?? 0) * DAMP * p.weight;
      let second = 0;
      for (const pp of providersOf.get(p.m.id) ?? []) {
        second += (base.get(pp.m.id) ?? 0) * DAMP * DAMP * pp.weight * 0.5;
      }
      const amount = Math.round(direct + second);
      if (amount > 0) contributors.push({ name: p.m.name, via: p.relation, amount });
      inherited += direct + second;
    }
    contributors.sort((a, b) => b.amount - a.amount);
    const inheritedStress = clamp(inherited);
    const totalStress = clamp(baseStress + inherited);
    const posture: CascadeNode['posture'] = totalStress >= 70 ? 'critical' : totalStress >= 50 ? 'strained' : totalStress >= 30 ? 'watch' : 'stable';
    return { id: m.id, name: m.name, baseStress, inheritedStress, totalStress, posture, contributors: contributors.slice(0, 4) };
  }).sort((a, b) => b.totalStress - a.totalStress);
}
