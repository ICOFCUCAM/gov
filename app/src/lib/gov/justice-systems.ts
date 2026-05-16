// Justice Ministry Systems — deep operational engine (JUSTICE archetype).
// Legal aid, public registries, corrections and court-liaison as live
// operational environments (distinct from the Judiciary branch). Pure.

import { seed, wave } from '@/lib/telemetry';

export interface JusticeOps {
  legalAid: { centres: number; openMatters: number; representedPct: number; backlog: number };
  registries: { recordsM: number; verificationsPerHr: number; integrityPct: number; backlog: number };
  corrections: { facilities: number; population: number; capacity: number; occupancyPct: number; rehabActive: number };
  courtLiaison: { casesCoordinated: number; transfersPending: number; slaMetPct: number };
  accessToJusticeIndex: number;
}

export function justiceOps(id: string, t: number): JusticeOps {
  const cap = 60000 + Math.round(seed(`js:cp:${id}`) * 40000);
  const pop = Math.round(cap * wave(`js:po:${id}`, t, 0.7, 1.3));
  return {
    legalAid: {
      centres: 80 + Math.round(seed(`js:lc:${id}`) * 90),
      openMatters: Math.round(wave(`js:lm:${id}`, t, 400, 14000)),
      representedPct: Math.round(wave(`js:lr:${id}`, t, 42, 88)),
      backlog: Math.round(wave(`js:lb:${id}`, t, 100, 6200)),
    },
    registries: {
      recordsM: Math.round(wave(`js:rr:${id}`, t, 4, 18) * 10) / 10,
      verificationsPerHr: Math.round(wave(`js:rv:${id}`, t, 200, 7000)),
      integrityPct: Math.round(wave(`js:ri:${id}`, t, 92, 100) * 100) / 100,
      backlog: Math.round(wave(`js:rb:${id}`, t, 50, 3800)),
    },
    corrections: {
      facilities: 60 + Math.round(seed(`js:cf:${id}`) * 40),
      population: pop,
      capacity: cap,
      occupancyPct: Math.round((pop / cap) * 100),
      rehabActive: Math.round(wave(`js:ra:${id}`, t, 200, 9000)),
    },
    courtLiaison: {
      casesCoordinated: Math.round(wave(`js:cc:${id}`, t, 200, 8200)),
      transfersPending: Math.round(wave(`js:tp:${id}`, t, 20, 900)),
      slaMetPct: Math.round(wave(`js:sl:${id}`, t, 58, 94)),
    },
    accessToJusticeIndex: Math.round(wave(`js:aj:${id}`, t, 44, 90)),
  };
}

export function justiceInstability(id: string, t: number): number {
  const o = justiceOps(id, t);
  const v =
    Math.max(0, (o.corrections.occupancyPct - 100) * 1.2) +
    Math.max(0, (80 - o.accessToJusticeIndex)) * 1.0 +
    Math.max(0, (85 - o.legalAid.representedPct)) * 0.5 +
    Math.max(0, (90 - o.courtLiaison.slaMetPct)) * 0.6;
  return Math.round(Math.max(0, Math.min(100, v)));
}
