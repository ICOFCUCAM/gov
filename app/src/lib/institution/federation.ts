// Canonical Sovereign Federation — single source of truth.
//
// The federation is not a set of cards over an empty store. These are the
// institutions that ALWAYS exist, with stable deterministic ids, so every
// institutional route resolves to a real operational surface on first
// paint — no empty seed, no 404, no registry-lookup dead-end, no infinite
// loader. The data store seeds from this; any client can resolve an
// institution by id/slug WITHOUT a network round-trip. Pure; no React/DOM.

import type { Ministry, ArchetypeKey } from '@/lib/api/types';
import { blueprintFor } from '@/lib/institution/blueprint';

interface FedSpec { slug: string; name: string; archetype: ArchetypeKey }

// The standing institutional federation. Health is the template; the rest
// are instantiated from the same archetype factory.
const SPECS: FedSpec[] = [
  { slug: 'health', name: 'Ministry of Health', archetype: 'HEALTH' },
  { slug: 'treasury', name: 'Treasury & Finance', archetype: 'FINANCE' },
  { slug: 'education', name: 'Ministry of Education', archetype: 'EDUCATION' },
  { slug: 'transport', name: 'Ministry of Transport', archetype: 'TRANSPORT' },
  { slug: 'energy', name: 'Ministry of Energy', archetype: 'ENERGY' },
  { slug: 'justice', name: 'Ministry of Justice', archetype: 'JUSTICE' },
  { slug: 'interior', name: 'Ministry of Interior', archetype: 'INTERIOR' },
  { slug: 'agriculture', name: 'Ministry of Agriculture', archetype: 'AGRICULTURE' },
  { slug: 'environment', name: 'Ministry of Environment', archetype: 'ENVIRONMENT' },
  { slug: 'labour', name: 'Ministry of Labour', archetype: 'LABOR' },
  { slug: 'trade', name: 'Ministry of Trade & Industry', archetype: 'TRADE' },
];

export const federationId = (slug: string) => `min-${slug}`;

// Deterministic, descending createdAt so list order is stable across
// reloads/SSR (no Date.now in the seed).
const BASE = Date.UTC(2026, 0, 1);

export function federationSeed(): Ministry[] {
  return SPECS.map((s, i): Ministry => {
    const groups = blueprintFor(s.archetype);
    return {
      id: federationId(s.slug),
      slug: s.slug,
      name: s.name,
      archetype: s.archetype,
      status: 'active',
      createdAt: new Date(BASE - i * 86_400_000).toISOString(),
      departments: groups.map(g => ({ id: `dep-${s.slug}-${g.key}`, name: g.name })),
      modules: [],
    };
  });
}

/**
 * Resolve an institution from an id OR slug without any network call, so a
 * route can render a real operational surface on first paint. An unknown
 * id falls back to the Health template — never a blank page.
 */
export function resolveInstitution(idOrSlug: string): Ministry {
  const seeds = federationSeed();
  return (
    seeds.find(m => m.id === idOrSlug || m.slug === idOrSlug) ??
    seeds.find(m => idOrSlug.endsWith(`-${m.slug}`) || idOrSlug.includes(m.slug)) ??
    seeds[0]!
  );
}
