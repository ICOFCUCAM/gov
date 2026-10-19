// The twin read API for the client engines (review M3, R18; register 16.3).
//
// The engines in lib/gov/* are pure functions that run in the browser on the
// reference model. They read a figure here instead of using their generated
// value directly: readTwin() answers synchronously with the twin's observed
// value when the browser holds it, and otherwise with the engine's own value
// marked 'sample'. Pages that show those engines call useTwinPrimed() (or
// useTwinFigure()) once, which fetches the observed values from the twin
// (/api/twin/state, /api/twin/entities, /api/twin/sources) and re-renders when
// they arrive, so engines keep their exported shapes and stay deterministic in
// tests (no cache, sample values).
//
// Server code reads through lib/twin/read-server.ts (twinFigure), which uses
// the register directly and the same rule (figureFrom).
//
// The cache lives in module memory only (never under a __civicos key, so it is
// not persisted) and holds observations only: samples and scenarios are never
// cached as facts. A derived metric (lib/twin/derived.ts: a formula over
// observed metrics) is cached and answered as modelled, with its formula as the
// source, never as observed.

import * as React from 'react';
import { REFERENCE_MODEL, type Signal, type SignalKind } from './signal';

/** What the twin says about a figure: an observed value with its source and date, or nothing. */
export interface ObservedFigure { value: number | null; unit?: string; source: string; asOf?: string; kind?: SignalKind }

export interface ReadOptions {
  /** A twin entity id (place:KE-30) … */
  entityId?: string;
  /** … or one of the nation's operational regions by name. */
  region?: string;
  /** Unit of the sample value (the engine's own). */
  unit?: string;
  /** Where the sample comes from (default: the reference model). */
  source?: string;
  /** Divide an observed value by this to match the engine's unit (e.g. 1e6 for millions). */
  scale?: number;
}

/**
 * The one rule: an observed value when the twin has one (or, for a derived
 * metric, the value computed from observed inputs, kept modelled), otherwise
 * the engine's value marked as a sample. Used by the client cache and the server.
 */
export function figureFrom(observed: ObservedFigure | null | undefined, sampleValue: number, opts: Pick<ReadOptions, 'unit' | 'source' | 'scale'> = {}): Signal<number> {
  const kind = observed?.kind ?? 'observed';
  if (observed && observed.value !== null && Number.isFinite(observed.value) && (kind === 'observed' || kind === 'modelled')) {
    const scale = opts.scale ?? 1;
    return { value: observed.value / scale, unit: scale === 1 ? observed.unit : opts.unit ?? observed.unit, kind, source: observed.source, ...(observed.asOf ? { asOf: observed.asOf } : {}) };
  }
  return { value: sampleValue, ...(opts.unit ? { unit: opts.unit } : {}), kind: 'sample', source: opts.source ?? REFERENCE_MODEL };
}

// ── Client cache ──────────────────────────────────────────────────────────

interface Cached { national: ObservedFigure | null; byEntity: Map<string, ObservedFigure> }
const cache = new Map<string, Cached>();
let regionIds = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;
const inflight = new Map<string, Promise<void>>();

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Forget everything read (tests; a change of nation). */
export function resetTwinRead(): void { cache.clear(); regionIds = new Map(); inflight.clear(); version++; listeners.forEach(l => l()); }

/** A figure for an engine: observed from the twin when the browser holds it, else the sample, marked. Synchronous. */
export function readTwin(metric: string, sampleValue: number, opts: ReadOptions = {}): Signal<number> {
  const c = cache.get(metric);
  const entity = opts.entityId ?? (opts.region ? regionIds.get(fold(opts.region)) : undefined);
  const observed = !c ? null : opts.entityId || opts.region ? (entity ? c.byEntity.get(entity) ?? null : null) : c.national;
  return figureFrom(observed, sampleValue, opts);
}

/** The number alone, for engines whose exported shapes hold plain numbers. */
export const readTwinValue = (metric: string, sampleValue: number, opts: ReadOptions = {}): number => readTwin(metric, sampleValue, opts).value ?? sampleValue;

type Fetcher = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** Fetch the twin's observed values of these metrics into the cache (once per metric until reset); listeners re-render. */
export function primeTwin(metrics: string[], fetcher: Fetcher = (u => fetch(u, { cache: 'no-store' })) as Fetcher): Promise<void> {
  const todo = metrics.filter(m => !cache.has(m) && !inflight.has(m));
  if (!todo.length) return Promise.all(metrics.map(m => inflight.get(m)).filter(Boolean)).then(() => undefined);
  const get = async <T,>(url: string): Promise<T | null> => { try { const r = await fetcher(url); return r.ok ? (await r.json()) as T : null; } catch { return null; } };
  const job = (async () => {
    const [entities, sources] = await Promise.all([
      regionIds.size ? null : get<{ entities: { id: string; name: string; region?: boolean }[] }>('/api/twin/entities?kind=place'),
      get<{ sources: { id: string; name: string }[] }>('/api/twin/sources'),
    ]);
    if (entities) regionIds = new Map(entities.entities.filter(e => e.region).map(e => [fold(e.name), e.id]));
    const names = new Map((sources?.sources ?? []).map(s => [s.id, s.name]));
    await Promise.all(todo.map(async metric => {
      const st = await get<{ observations: { entityId: string; value: number; unit: string; validFrom: string; sourceId?: string; kind?: string; formula?: string }[]; national?: ObservedFigure | null; derived?: { formula: string } }>(`/api/twin/state?metric=${encodeURIComponent(metric)}`);
      if (!st) return;
      // A derived metric stays modelled (its formula is the source); everything else the twin returns is observed.
      const kind = st.derived ? 'modelled' as const : 'observed' as const;
      cache.set(metric, {
        national: st.national && st.national.value !== null && (st.national.kind === 'observed' || st.national.kind === 'modelled') ? { ...st.national, kind } : null,
        byEntity: new Map(st.observations.map(o => [o.entityId, { value: o.value, unit: o.unit, source: st.derived ? `Derived: ${o.formula ?? st.derived.formula}` : names.get(o.sourceId ?? '') ?? o.sourceId ?? '', asOf: o.validFrom, kind }])),
      });
    }));
    version++;
    listeners.forEach(l => l());
  })();
  for (const m of todo) inflight.set(m, job);
  return job;
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Fetch these metrics once and re-render when they arrive; returns a number that changes when the cache does. */
export function useTwinPrimed(metrics: string[]): number {
  const key = metrics.join('|');
  React.useEffect(() => { void primeTwin(key.split('|').filter(Boolean)); }, [key]);
  return React.useSyncExternalStore(subscribe, () => version, () => 0);
}

/** One figure for a component: observed from the twin when it is known, else the sample, marked. */
export function useTwinFigure(metric: string, sampleValue: number, opts: ReadOptions = {}): Signal<number> {
  useTwinPrimed([metric]);
  return readTwin(metric, sampleValue, opts);
}
