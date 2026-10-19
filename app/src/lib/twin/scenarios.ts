// Scenarios on the twin (register 16.7). A scenario applies stated assumptions
// ("population in region X grows 3%") to what the twin knew on a date, and
// keeps the result as a modelled figure next to the observed one. Every
// version is kept: who made it, when, the assumptions, the exact observations
// it started from (with source and import run) and a SHA-256 evidence hash
// over all of them, so a directive that cites a scenario version can be
// checked later against the same inputs. Nothing here changes an observation.

import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { stateAsOf, getEntity, regionEntities, isoDate, onObservations } from './register';
import { getMetric } from './metrics';
import { resolveNation, releaseFor } from '@/lib/data/updates';
import { sourceCommit } from '@/lib/data/supply-chain';
import { touch } from '@/lib/data/repo/track';

export interface Assumption {
  /** An entity id, or "*" for every entity with a value. */
  entityId: string;
  /** Change in percent, e.g. 3 or -12.5. */
  changePct: number;
  /** The range the change could plausibly take, in percent (low ≤ changePct ≤ high); carried to the results as an interval. */
  range?: { low: number; high: number };
  note?: string;
}

export interface ScenarioInput { entityId: string; value: number; unit: string; validFrom: string; sourceId: string; runId: string }
export interface ScenarioResult {
  entityId: string; name: string; baseline: number; projected: number; unit: string;
  /** The projection at the low and high ends of the assumptions' ranges (modelled), when any assumption states a range. */
  interval?: { low: number; high: number };
}

export interface ScenarioVersion {
  version: number;
  at: string;
  by: string;
  metric: string;
  /** The date the observed state was taken from (true on that date, as known when the version was made). */
  asOf: string;
  assumptions: Assumption[];
  note?: string;
  inputs: ScenarioInput[];
  results: ScenarioResult[];
  /** The regions combined as the metric says (sum or mean), only when every region has a value in one unit. */
  national: { baseline: number; projected: number; unit: string; interval?: { low: number; high: number } } | null;
  /** Why there is no national figure, when there is none. */
  nationalNote?: string;
  evidenceHash: string;
  /** The date the projection is for; when a value true for it is later observed, the error is logged (calibration). */
  horizon?: string;
  /** The model that computed the results (MODELS); absent on versions made before the registry (their hash is v1). */
  model?: ScenarioModelRef;
  /** The platform build that ran the model: its source commit (from the build environment or the Update Center's installed release). */
  build?: ScenarioBuild;
}

export interface ScenarioModelRef { id: string; version: string }
export interface ScenarioBuild { commit?: string; release?: string; source: 'environment' | 'update-center' | 'unknown' }

export interface Scenario { id: string; name: string; createdBy: string; createdAt: string; versions: ScenarioVersion[] }

/**
 * A projection checked against what was later observed: recorded once per
 * scenario version, entity and observing import, when a value true for the
 * version's horizon arrives. error = observed − projected.
 */
export interface CalibrationEntry {
  scenarioId: string; version: number; entityId: string; metric: string; horizon: string;
  projected: number; observed: number; error: number; errorPct: number | null;
  /** Whether the observed value fell inside the version's modelled interval (when it had one). */
  withinInterval?: boolean;
  observedValidFrom: string; observedRunId: string; recordedAt: string;
}

interface Db { scenarios: Scenario[]; seq: number; calibration: CalibrationEntry[] }
const g = globalThis as unknown as { __civicosTwinScenarios?: Db };
const db = (): Db => { const d = touch('__civicosTwinScenarios', g.__civicosTwinScenarios ??= { scenarios: [], seq: 1, calibration: [] }); d.calibration ??= []; return d; };
export function resetScenarios(): void { g.__civicosTwinScenarios = undefined; }

const MAX_ASSUMPTIONS = 50;

/**
 * The scenario model registry: every model that may compute a scenario, by id
 * and version. A version records the model it ran, so a result can be
 * recomputed with the same model later.
 */
export const MODELS: Record<string, Record<string, { label: string; description: string }>> = {
  'pct-multiplier': {
    '1': { label: 'Percentage change', description: 'Each value is multiplied by (1 + change/100) for every assumption that applies to it; regions are combined as the metric says (sum or mean).' },
  },
};
export const CURRENT_MODEL: ScenarioModelRef = { id: 'pct-multiplier', version: '1' };

/** The build running now: the source commit from the build environment, else the Update Center's installed release. */
export function currentBuild(): ScenarioBuild {
  const env = (process.env.CIVICOS_BUILD_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? '').trim();
  if (/^[0-9a-f]{7,64}$/i.test(env)) return { commit: env.toLowerCase(), source: 'environment' };
  try {
    const n = resolveNation();
    const r = n ? (n.installedReleaseId ? releaseFor(n.id, n.installedReleaseId) : undefined) : undefined;
    if (n && r) return { commit: sourceCommit(r), release: n.installedVersion, source: 'update-center' };
    if (n) return { release: n.installedVersion, source: 'update-center' };
  } catch { /* the Update Center is not available: the build is unknown */ }
  return { source: 'unknown' };
}

type Hashed = Pick<ScenarioVersion, 'version' | 'metric' | 'asOf' | 'assumptions' | 'inputs'> & Partial<Pick<ScenarioVersion, 'model' | 'build' | 'by' | 'at' | 'horizon'>>;

/**
 * The evidence hash of a version (SHA-256). v2 (versions with a model) covers
 * the scenario id, version, metric, date, model and its version, the build's
 * commit, who made it and when, the assumptions and the inputs. v1 (versions
 * made before the model registry) covers the same without model, build,
 * author and time, and stays verifiable.
 */
export function evidenceHash(id: string, v: Hashed): string {
  const assumptions = [...v.assumptions].sort((a, b) => a.entityId.localeCompare(b.entityId) || a.changePct - b.changePct)
    .map(a => (v.model ? [a.entityId, a.changePct, a.range ? [a.range.low, a.range.high] : null, a.note ?? null] : [a.entityId, a.changePct, a.note ?? null]));
  const inputs = [...v.inputs].sort((a, b) => a.entityId.localeCompare(b.entityId))
    .map(i => [i.entityId, i.value, i.unit, i.validFrom, i.sourceId, i.runId]);
  const body = v.model
    ? ['civicos-scenario-v2', id, v.version, v.metric, v.asOf, v.model.id, v.model.version, v.build?.commit ?? null, v.by ?? null, v.at ?? null, assumptions, inputs, ...(v.horizon ? [v.horizon] : [])]
    : ['civicos-scenario-v1', id, v.version, v.metric, v.asOf, assumptions, inputs];
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

/** Which form of the evidence hash a version carries. */
export const hashVersion = (v: Pick<ScenarioVersion, 'model'>): 'v1' | 'v2' => (v.model ? 'v2' : 'v1');

/** Whether a stored version still matches its evidence hash. */
export function verifyVersion(id: string, v: ScenarioVersion): boolean {
  return evidenceHash(id, v) === v.evidenceHash;
}

interface Draft { by?: string; metric?: string; asOf?: string; horizon?: string; assumptions?: Assumption[]; note?: string }

function build(id: string, version: number, d: Draft): ScenarioVersion | { error: string } {
  const by = d.by?.trim();
  if (!by) return { error: 'Name the official making the scenario' };
  const metric = d.metric?.trim() ?? '';
  if (!metric) return { error: 'Choose a metric' };
  const asOf = isoDate(d.asOf) ?? new Date().toISOString().slice(0, 10);
  const assumptions = (d.assumptions ?? []).slice(0, MAX_ASSUMPTIONS).map(a => ({
    entityId: String(a.entityId ?? '').trim(), changePct: Number(a.changePct),
    ...(a.range && (a.range.low !== undefined || a.range.high !== undefined) ? { range: { low: Number(a.range.low), high: Number(a.range.high) } } : {}),
    ...(a.note?.trim() ? { note: a.note.trim().slice(0, 200) } : {}),
  }));
  if (!assumptions.length) return { error: 'State at least one assumption' };
  for (const a of assumptions) {
    if (!Number.isFinite(a.changePct) || a.changePct < -100 || a.changePct > 1000) return { error: 'A change must be a percentage between -100 and 1000' };
    if (a.entityId !== '*' && !getEntity(a.entityId)) return { error: `Unknown entity ${a.entityId}` };
    if (a.range) {
      const { low, high } = a.range;
      if (![low, high].every(x => Number.isFinite(x) && x >= -100 && x <= 1000)) return { error: 'A range is two percentages between -100 and 1000' };
      if (!(low <= a.changePct && a.changePct <= high)) return { error: `The range ${low}% to ${high}% must contain the change (${a.changePct}%)` };
    }
  }
  const ranged = assumptions.some(a => a.range);
  // What was true on the date, as the twin knows it now; the inputs are kept, so the version stays reproducible.
  const obs = stateAsOf({ asOf: `${asOf}T23:59:59Z`, knownAt: new Date().toISOString(), metric });
  if (!obs.length) return { error: `The twin knows nothing about ${metric} on ${asOf}` };
  const inputs: ScenarioInput[] = obs.map(o => ({ entityId: o.entityId, value: o.value, unit: o.unit, validFrom: o.validFrom, sourceId: o.sourceId, runId: o.runId }));
  const results: ScenarioResult[] = inputs.map(i => {
    const applying = assumptions.filter(a => a.entityId === '*' || a.entityId === i.entityId);
    const factor = applying.reduce((f, a) => f * (1 + a.changePct / 100), 1);
    const r2 = (n: number) => Math.round(n * 100) / 100;
    // Each assumption at its low and at its high end; the band is the least and most of the two (a negative value turns them round).
    const lo = i.value * applying.reduce((f, a) => f * (1 + (a.range?.low ?? a.changePct) / 100), 1);
    const hi = i.value * applying.reduce((f, a) => f * (1 + (a.range?.high ?? a.changePct) / 100), 1);
    return {
      entityId: i.entityId, name: getEntity(i.entityId)?.name ?? i.entityId, baseline: i.value, projected: r2(i.value * factor), unit: i.unit,
      ...(ranged ? { interval: { low: r2(Math.min(lo, hi)), high: r2(Math.max(lo, hi)) } } : {}),
    };
  });
  const regions = regionEntities();
  const inRegions = regions.map(r => results.find(x => x.entityId === r.id)).filter((x): x is ScenarioResult => !!x);
  // Combined as the metric's definition says (lib/twin/metrics.ts): a sum or a mean, every region, one unit; otherwise none, with the reason.
  const aggregation = getMetric(metric)?.aggregation ?? 'none';
  let national: ScenarioVersion['national'] = null;
  let nationalNote: string | undefined;
  if (!regions.length || inRegions.length < regions.length) nationalNote = `Only ${inRegions.length} of ${regions.length} regions have a value`;
  else if (new Set(inRegions.map(x => x.unit)).size > 1) nationalNote = 'The regions are in different units';
  else if (aggregation !== 'sum' && aggregation !== 'mean') nationalNote = aggregation === 'none' ? `${metric} is not registered as combinable across regions` : 'A weighted mean is not projected nationally';
  else {
    const n = aggregation === 'mean' ? inRegions.length : 1;
    const sum = (f: (x: ScenarioResult) => number) => Math.round((inRegions.reduce((s, x) => s + f(x), 0) / n) * 100) / 100;
    national = {
      baseline: inRegions.reduce((s, x) => s + x.baseline, 0) / n, projected: sum(x => x.projected), unit: inRegions[0]!.unit,
      ...(ranged ? { interval: { low: sum(x => x.interval?.low ?? x.projected), high: sum(x => x.interval?.high ?? x.projected) } } : {}),
    };
  }
  let horizon: string | undefined;
  if (d.horizon?.trim()) {
    horizon = isoDate(d.horizon);
    if (!horizon) return { error: 'The projected date is not a date' };
    if (horizon <= asOf) return { error: 'The projected date must be after the date the scenario starts from' };
  }
  const v = { version, at: new Date().toISOString(), by, metric, asOf, ...(horizon ? { horizon } : {}), model: { ...CURRENT_MODEL }, build: currentBuild(), assumptions, ...(d.note?.trim() ? { note: d.note.trim().slice(0, 500) } : {}), inputs, results, national, ...(nationalNote ? { nationalNote } : {}) };
  return { ...v, evidenceHash: evidenceHash(id, v) };
}

export function listScenarios(): Scenario[] {
  return db().scenarios.map(s => ({ ...s, versions: s.versions.map(v => ({ ...v })) }));
}

export function getScenario(id: string): Scenario | undefined {
  return listScenarios().find(s => s.id === id);
}

export function createScenario(input: Draft & { name?: string }): Scenario | { error: string } {
  const name = input.name?.trim();
  if (!name) return { error: 'Give the scenario a name' };
  const d = db();
  const id = `SCN-${String(d.seq).padStart(4, '0')}`;
  const v = build(id, 1, input);
  if ('error' in v) return v;
  d.seq++;
  const s: Scenario = { id, name: name.slice(0, 120), createdBy: v.by, createdAt: v.at, versions: [v] };
  d.scenarios.unshift(s);
  recordAudit(v.by, 'twin.scenario.create', `Scenario:${id}`, 'ok', `${s.name} · v1 · ${v.metric} as of ${v.asOf} · model ${v.model?.id}@${v.model?.version} · evidence ${v.evidenceHash.slice(0, 16)}`);
  return getScenario(id)!;
}

/** A new version; earlier versions stay as they were. */
export function reviseScenario(id: string, input: Draft): Scenario | { error: string } {
  const s = db().scenarios.find(x => x.id === id);
  if (!s) return { error: 'No such scenario' };
  const v = build(id, s.versions.length + 1, input);
  if ('error' in v) return v;
  s.versions.push(v);
  recordAudit(v.by, 'twin.scenario.revise', `Scenario:${id}`, 'ok', `v${v.version} · ${v.metric} as of ${v.asOf} · model ${v.model?.id}@${v.model?.version} · evidence ${v.evidenceHash.slice(0, 16)}`);
  return getScenario(id)!;
}

// ── Calibration ───────────────────────────────────────────────────────────

/** The period an observation must fall in to count for a horizon: the metric's own period, a month for instant figures. */
function sameWindow(period: string | undefined, horizon: string, validFrom: string): boolean {
  if (period === 'day') return validFrom === horizon.slice(0, 10);
  if (period === 'year') return validFrom.slice(0, 4) === horizon.slice(0, 4);
  if (period === 'quarter') return validFrom.slice(0, 4) === horizon.slice(0, 4) && Math.floor((Number(validFrom.slice(5, 7)) - 1) / 3) === Math.floor((Number(horizon.slice(5, 7)) - 1) / 3);
  return validFrom.slice(0, 7) === horizon.slice(0, 7);
}

/** The last day of the horizon's window. */
function windowEnd(period: string | undefined, horizon: string): string {
  if (period === 'day') return horizon.slice(0, 10);
  const y = Number(horizon.slice(0, 4)), m = Number(horizon.slice(5, 7));
  const endMonth = period === 'year' ? 12 : period === 'quarter' ? Math.ceil(m / 3) * 3 : m;
  return new Date(Date.UTC(y, endMonth, 0)).toISOString().slice(0, 10);
}

/**
 * Check every version that projects to a horizon against what is now
 * observed for it, and log each new comparison (audited). Runs when an import
 * adds observations and when scenarios are read; idempotent.
 */
export function calibrate(now = new Date()): CalibrationEntry[] {
  const d = db();
  const added: CalibrationEntry[] = [];
  for (const s of d.scenarios) for (const v of s.versions) {
    if (!v.horizon) continue;
    const period = getMetric(v.metric)?.period;
    const known = stateAsOf({ asOf: `${windowEnd(period, v.horizon)}T23:59:59Z`, knownAt: now.toISOString(), metric: v.metric });
    for (const r of v.results) {
      // The value true in the horizon's window, as known now (withdrawn imports excluded).
      const o = known.find(x => x.entityId === r.entityId && sameWindow(period, v.horizon!, x.validFrom));
      if (!o) continue;
      if (d.calibration.some(c => c.scenarioId === s.id && c.version === v.version && c.entityId === r.entityId && c.observedRunId === o.runId && c.observedValidFrom === o.validFrom)) continue;
      const error = Math.round((o.value - r.projected) * 100) / 100;
      const entry: CalibrationEntry = {
        scenarioId: s.id, version: v.version, entityId: r.entityId, metric: v.metric, horizon: v.horizon,
        projected: r.projected, observed: o.value, error, errorPct: r.projected ? Math.round((error / r.projected) * 10_000) / 100 : null,
        ...(r.interval ? { withinInterval: o.value >= r.interval.low && o.value <= r.interval.high } : {}),
        observedValidFrom: o.validFrom, observedRunId: o.runId, recordedAt: now.toISOString(),
      };
      d.calibration.push(entry);
      added.push(entry);
    }
  }
  const byVersion = new Map<string, CalibrationEntry[]>();
  for (const e of added) (byVersion.get(`${e.scenarioId} v${e.version}`) ?? byVersion.set(`${e.scenarioId} v${e.version}`, []).get(`${e.scenarioId} v${e.version}`)!).push(e);
  for (const [k, list] of byVersion) {
    const mape = list.filter(e => e.errorPct !== null).reduce((sum, e, _i, a) => sum + Math.abs(e.errorPct!) / a.length, 0);
    recordAudit('Twin register', 'twin.scenario.calibrate', `Scenario:${k.split(' ')[0]}`, 'ok', `${k} · ${list.length} projections checked against observations · mean absolute error ${Math.round(mape * 100) / 100}%`);
  }
  return added;
}

/** The calibration log of a scenario (all versions, or one). */
export function calibrationLog(scenarioId: string, version?: number): CalibrationEntry[] {
  return db().calibration.filter(c => c.scenarioId === scenarioId && (version === undefined || c.version === version)).map(c => ({ ...c }));
}

onObservations('scenario-calibration', () => { calibrate(); });
