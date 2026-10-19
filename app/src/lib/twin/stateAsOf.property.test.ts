// Property tests for the twin's as-of query (lib/twin/register.ts stateAsOf),
// over randomised observation sets from a seeded PRNG (reproducible; no extra
// dependencies). For every query the answer must be, per entity and metric,
// the observation with the latest validFrom (then the latest recordedAt)
// among those true by asOf, recorded by knownAt, not superseded by knownAt and
// not ended by asOf — whether it sits in the live register or the archive.

import { describe, it, expect, beforeEach } from 'vitest';
import { resetTwin, stateAsOf, type Observation } from './register';
import { twinDb } from './db';
import { archive } from './archive';

/** mulberry32: a small seeded PRNG. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
const START = Date.UTC(2000, 0, 1);
const SPAN = 30 * 365 * DAY;
const iso = (t: number) => new Date(t).toISOString();
const day = (t: number) => iso(t).slice(0, 10);

interface World { obs: (Observation & { archived: boolean })[] }

function world(rand: () => number, n: number): World {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const entities = ['place:A', 'place:B', 'place:C', 'nation:X'];
  const metrics = ['population', 'beds', 'rate'];
  const obs: World['obs'] = [];
  for (let i = 0; i < n; i++) {
    const valid = START + Math.floor(rand() * SPAN);
    // Recorded after it was true (usually), at a unique millisecond so ties are not ambiguous.
    const recorded = valid + Math.floor(rand() * 3 * 365 * DAY) + i;
    const o: Observation & { archived: boolean } = {
      entityId: pick(entities), metric: pick(metrics), value: Math.round(rand() * 1e6), unit: '1',
      validFrom: day(valid), recordedAt: iso(recorded), sourceId: 'SRC-P', runId: `RUN-${i % 7}`, archived: rand() < 0.4,
    };
    if (rand() < 0.2) o.validTo = day(valid + (1 + Math.floor(rand() * 4 * 365)) * DAY);
    if (rand() < 0.15) o.supersededAt = iso(recorded + Math.floor(rand() * 5 * 365 * DAY) + 1);
    obs.push(o);
  }
  return { obs };
}

/** The answer by definition, by brute force. */
function oracle(w: World, q: { asOf: number; knownAt: number; metric?: string; entityId?: string }): Map<string, Observation> {
  const d = day(q.asOf), k = iso(q.knownAt);
  const best = new Map<string, Observation>();
  for (const o of w.obs) {
    if (q.metric && o.metric !== q.metric) continue;
    if (q.entityId && o.entityId !== q.entityId) continue;
    if (o.validFrom > d || o.recordedAt > k) continue;
    if (o.supersededAt && o.supersededAt <= k) continue;
    if (o.validTo && o.validTo <= d) continue;
    const key = `${o.entityId}|${o.metric}`;
    const cur = best.get(key);
    if (!cur || o.validFrom > cur.validFrom || (o.validFrom === cur.validFrom && o.recordedAt > cur.recordedAt)) best.set(key, o);
  }
  return best;
}

const strip = ({ archived: _a, ...o }: Observation & { archived?: boolean }): Observation => o;

describe('stateAsOf properties (seeded random observation sets)', () => {
  beforeEach(() => { resetTwin(); });

  for (const seed of [1, 7, 42, 2024, 31337, 99991]) {
    it(`agrees with the definition for every query (seed ${seed})`, () => {
      const rand = prng(seed);
      const w = world(rand, 150 + Math.floor(rand() * 250));
      const live = w.obs.filter(o => !o.archived).map(strip);
      const old = w.obs.filter(o => o.archived).map(strip);
      twinDb().observations.push(...live);
      archive(old, [], iso(START + SPAN));

      for (let q = 0; q < 60; q++) {
        const asOf = START + Math.floor(rand() * (SPAN + 4 * 365 * DAY));
        const strictly = rand() < 0.5;
        const knownAt = strictly ? asOf : asOf + Math.floor(rand() * 6 * 365 * DAY);
        const metric = rand() < 0.5 ? ['population', 'beds', 'rate'][Math.floor(rand() * 3)] : undefined;
        const entityId = rand() < 0.3 ? ['place:A', 'place:B', 'place:C', 'nation:X'][Math.floor(rand() * 4)] : undefined;
        const got = stateAsOf({ asOf: iso(asOf), knownAt: iso(knownAt), metric, entityId });
        const want = oracle(w, { asOf, knownAt, metric, entityId });

        // Same answer as the definition.
        expect(new Map(got.map(o => [`${o.entityId}|${o.metric}`, o]))).toEqual(new Map([...want].map(([k, o]) => [k, strip(o)])));
        // And each property on its own, so a failure says which one broke.
        const keys = new Set<string>();
        for (const o of got) {
          expect(o.validFrom <= day(asOf)).toBe(true);
          expect(o.recordedAt <= iso(knownAt)).toBe(true);
          expect(!o.supersededAt || o.supersededAt > iso(knownAt)).toBe(true);
          expect(!o.validTo || o.validTo > day(asOf)).toBe(true);
          if (metric) expect(o.metric).toBe(metric);
          if (entityId) expect(o.entityId).toBe(entityId);
          const key = `${o.entityId}|${o.metric}`;
          expect(keys.has(key)).toBe(false);
          keys.add(key);
        }
      }
    });
  }

  it('reads the archive: moving observations there never changes an answer', () => {
    const rand = prng(5);
    const w = world(rand, 300);
    const all = w.obs.map(strip);
    twinDb().observations.push(...all);
    const queries = Array.from({ length: 40 }, () => {
      const asOf = START + Math.floor(rand() * SPAN);
      return { asOf: iso(asOf), knownAt: iso(asOf + Math.floor(rand() * 3 * 365 * DAY)) };
    });
    const sorted = (xs: Observation[]) => [...xs].sort((a, b) => `${a.entityId}|${a.metric}`.localeCompare(`${b.entityId}|${b.metric}`));
    const before = queries.map(q => sorted(stateAsOf(q)));
    archive(twinDb().observations.splice(0, 200), [], iso(START + SPAN));
    expect(queries.map(q => sorted(stateAsOf(q)))).toEqual(before);
  });

  it('a withdrawal never changes what was known before it', () => {
    const rand = prng(11);
    const w = world(rand, 250);
    const all = w.obs.map(strip).map(o => { const { supersededAt: _s, ...rest } = o; return rest as Observation; });
    twinDb().observations.push(...all);
    const T = START + Math.floor(SPAN * 0.7);
    const sorted = (xs: Observation[]) => [...xs].sort((a, b) => `${a.entityId}|${a.metric}`.localeCompare(`${b.entityId}|${b.metric}`));
    const queries = Array.from({ length: 40 }, () => {
      const asOf = START + Math.floor(rand() * SPAN);
      return { asOf: iso(asOf), knownAt: iso(Math.min(T - 1, asOf + Math.floor(rand() * 5 * 365 * DAY))) };
    });
    const before = queries.map(q => sorted(stateAsOf(q)));
    for (const o of twinDb().observations) if (rand() < 0.3) o.supersededAt = iso(T);
    expect(queries.map(q => sorted(stateAsOf(q)))).toEqual(before);
    // From T on, no superseded observation is ever an answer.
    for (let i = 0; i < 30; i++) {
      const asOf = START + Math.floor(rand() * SPAN);
      for (const o of stateAsOf({ asOf: iso(asOf), knownAt: iso(T + i * DAY) })) expect(o.supersededAt).toBeUndefined();
    }
  });
});
